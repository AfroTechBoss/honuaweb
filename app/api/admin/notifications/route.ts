import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-role";
import { isMissingFunction, isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";
import { sendEmail, SUPPORT_EMAIL } from "@/lib/email";
import { broadcastEmail } from "@/lib/email-broadcast";
import {
  AUDIENCES, CHANNELS, MAX_EMAILS, MAX_IN_APP,
  audienceLabel, canonicalizeTokens, renderTemplate, shapeBroadcast, unresolvedTokens,
  type Audience, type Channel,
} from "@/lib/broadcast";

// Admin broadcasts (migration 044).
//
// GET   history, plus how many people each audience currently covers
// POST  { subject, body, audience, targetUserId? | targetHandle?, channel,
//         templateId?, actorLabel? }
//
// Both gated on `notifications.send`. Owners and admins hold it; moderators do
// not — a moderator can remove a post, and telling every member of Honua
// something in their inbox is a different kind of act.
//
// The compose screen used to end at a toast. It now ends at rows in
// `notifications` and requests to Resend, which is why most of this file is
// about being careful before the send rather than after it:
//
//  · Unfilled {{slots}} are refused. A template holds {{post_title}} and only
//    the person composing knows what goes there; delivering it literally is
//    worse than not delivering it, and unlike a bad UI state it cannot be
//    taken back.
//  · The audience is counted before anything is written, and a send to nobody
//    is a 409 rather than a success with a zero in it.
//  · Email is capped. Past the cap this refuses instead of half-sending a batch
//    and timing out somewhere in the middle of it.
//  · What actually happened is recorded — including the provider's own error
//    text — rather than what was asked for.

export const runtime = 'nodejs';
export const maxDuration = 60;

const MISSING_MIGRATION = 'apply supabase/migrations/044_platform_settings.sql';

const str = (v: any, max = 200) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Links in the email have to point somewhere real. Behind a proxy the request
// URL is the internal one, so trust the forwarded host over it.
function appUrl(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : '';
}

type Member = {
  user_id: string;
  email: string | null;
  handle: string | null;
  full_name: string | null;
  marketing_emails: boolean;
  suspended_until: string | null;
  banned_at: string | null;
};

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-notifications', limit: 60, permission: 'notifications.send' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get('limit')) || 50, 1), 200);
    const { data, error } = await ctx.db.rpc('admin_broadcast_history', { p_limit: limit });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        logWarn('admin/notifications', 'broadcasts unavailable', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ available: false, broadcasts: [], audiences: null, emailable: null }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    // Head-only counts: the screen needs to say "this reaches 412 people"
    // before anyone presses send, and it does not need the 412 rows to say it.
    //
    // Two numbers per audience, not one. `marketing_emails` defaults to false,
    // so "everyone" and "everyone we are allowed to email" are usually very
    // different figures — and finding that out from the outcome line after
    // sending reads like a bug rather than like consent working.
    const size = async (audience: Audience, emailableOnly: boolean) => {
      // p_target is omitted rather than passed as null on purpose: head:true
      // sends the arguments as query string values, where a null becomes the
      // four characters "null" and fails the cast to uuid. The function's own
      // `default null` is the reliable way to say "no target".
      const q = ctx.db.rpc(
        'admin_broadcast_audience',
        { p_audience: audience },
        { count: 'exact', head: true },
      );
      const { count, error: e } = await (emailableOnly
        ? q.eq('marketing_emails', true).not('email', 'is', null).is('banned_at', null)
        : q);
      return e ? null : count ?? 0;
    };

    const [allUsers, allSellers, mailUsers, mailSellers] = await Promise.all([
      size('all_users', false), size('all_sellers', false),
      size('all_users', true), size('all_sellers', true),
    ]);

    return NextResponse.json({
      available: true,
      broadcasts: (data ?? []).map(shapeBroadcast),
      audiences: { all_users: allUsers, all_sellers: allSellers },
      emailable: { all_users: mailUsers, all_sellers: mailSellers },
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      maxEmails: MAX_EMAILS,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/notifications', err, id, 'Could not load the notification history.');
  }
}

export async function POST(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-notifications-send', limit: 20, permission: 'notifications.send' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));

    const subject = canonicalizeTokens(str(body?.subject, 200));
    const message = canonicalizeTokens(str(body?.body, 8000));
    const audience = str(body?.audience, 20) as Audience;
    const channel = (str(body?.channel, 20) || 'both') as Channel;
    const templateId = str(body?.templateId, 80) || null;
    const actorLabel = str(body?.actorLabel, 80) || null;
    let targetUserId = str(body?.targetUserId, 64) || null;
    const targetHandle = str(body?.targetHandle, 40).replace(/^@/, '');

    if (!subject) return NextResponse.json({ error: 'Give the message a subject.' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'The message is empty.' }, { status: 400 });
    if (!AUDIENCES.includes(audience)) return NextResponse.json({ error: 'Choose who this is going to.' }, { status: 400 });
    if (!CHANNELS.includes(channel)) return NextResponse.json({ error: 'Choose how to send it.' }, { status: 400 });

    // A handle is what an admin has in front of them; the id is what the
    // audience function takes. Resolved here rather than by a user-search
    // endpoint the console would otherwise need, and resolved strictly — an
    // unmatched handle is an error, never a fallback to a wider audience.
    if (audience === 'user' && !targetUserId && targetHandle) {
      const { data: match, error: lookupErr } = await ctx.db
        .from('profiles')
        .select('id')
        .ilike('handle', targetHandle)
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      if (!match) return NextResponse.json({ error: `No account with the handle @${targetHandle}.` }, { status: 404 });
      targetUserId = match.id;
    }

    if (audience === 'user' && (!targetUserId || !UUID.test(targetUserId))) {
      return NextResponse.json({ error: 'Pick the person this is going to.' }, { status: 400 });
    }

    // The slots only the composer can fill. Checked before anything is written,
    // because "{{suspension_reason}}" in someone's inbox is not recoverable.
    const missing = unresolvedTokens(`${subject}\n${message}`);
    if (missing.length) {
      return NextResponse.json({
        error: `Fill in ${missing.map((t) => `{{${t}}}`).join(', ')} before sending — ${missing.length === 1 ? 'it would go out' : 'they would go out'} exactly like that.`,
        unresolved: missing,
      }, { status: 400 });
    }

    // ---- Who this reaches ----
    const { data: audienceRows, error: audienceErr } = await ctx.db.rpc('admin_broadcast_audience', {
      p_audience: audience,
      p_target: audience === 'user' ? targetUserId : null,
    });

    if (audienceErr) {
      if (isMissingFunction(audienceErr) || isMissingTable(audienceErr)) {
        return NextResponse.json({ error: `Broadcasts are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      if (audienceErr.code === '22023') return NextResponse.json({ error: audienceErr.message }, { status: 409 });
      throw audienceErr;
    }

    const members = (audienceRows ?? []) as Member[];
    if (!members.length) {
      return NextResponse.json({ error: 'Nobody is in that audience right now, so nothing was sent.' }, { status: 409 });
    }
    if (members.length > MAX_IN_APP) {
      return NextResponse.json({ error: `That audience is ${members.length} people, past the ${MAX_IN_APP} this screen will send to in one go.` }, { status: 409 });
    }

    const direct = audience === 'user';
    const label = audienceLabel(audience, direct ? members[0]?.handle : null);

    // A message to one person about their own account is transactional and goes
    // regardless of their marketing preference — it is the answer to something
    // they did. A message to an audience is not, so it only reaches the people
    // who asked for email, and skips accounts that are already gone.
    const recipients = direct
      ? members.filter((m) => m.email)
      : members.filter((m) => m.email && m.marketing_emails && !m.banned_at);

    const optedOut = members.length - recipients.length;

    if (channel !== 'in_app' && recipients.length > MAX_EMAILS) {
      return NextResponse.json({
        error: `${recipients.length} people have email updates on, past the ${MAX_EMAILS} this screen sends in one go. Send it in-app instead, or narrow the audience.`,
      }, { status: 409 });
    }

    // ---- The in-app half ----
    let inAppCreated = 0;
    if (channel !== 'email') {
      const { data: n, error: notifyErr } = await ctx.db.rpc('admin_broadcast_notify', {
        p_audience: audience,
        p_target: direct ? targetUserId : null,
        p_title: subject,
        p_body: message,
      });
      if (notifyErr) {
        if (notifyErr.code === '22023') return NextResponse.json({ error: notifyErr.message }, { status: 409 });
        throw notifyErr;
      }
      inAppCreated = Number(Array.isArray(n) ? n[0] : n) || 0;
    }

    // ---- The email half ----
    let emailsSent = 0;
    let emailsFailed = 0;
    let emailError: string | null = null;
    const base = appUrl(req);

    if (channel !== 'in_app' && recipients.length) {
      // Five at a time. Sequential would be a minute of round trips for a
      // couple of hundred people; all at once would trip the provider's rate
      // limit and turn a slow send into a failed one.
      const queue = [...recipients];
      const worker = async () => {
        for (let m = queue.shift(); m; m = queue.shift()) {
          const vars = { name: m.full_name, handle: m.handle };
          const mail = broadcastEmail({
            subject: renderTemplate(subject, vars),
            body: renderTemplate(message, vars),
            direct,
            appUrl: base,
          });
          const res = await sendEmail({ to: m.email!, ...mail, replyTo: SUPPORT_EMAIL });
          if (res.sent) emailsSent++;
          else {
            emailsFailed++;
            // First reason wins and is kept verbatim. They are nearly always
            // all the same reason, and "RESEND_API_KEY is not set" points at
            // the fix in a way that "email failed" does not.
            emailError = emailError ?? res.error ?? 'Unknown error';
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(5, recipients.length) }, worker));
    }

    // ---- The record ----
    const { data: recorded, error: recordErr } = await ctx.db.rpc('admin_record_broadcast', {
      p_actor: ctx.adminId,
      p_label: actorLabel,
      p_template: templateId,
      p_subject: subject,
      p_body: message,
      p_audience: audience,
      p_audience_label: label,
      p_target: direct ? targetUserId : null,
      p_channel: channel,
      p_recipients: members.length,
      p_in_app: inAppCreated,
      p_sent: emailsSent,
      p_failed: emailsFailed,
      p_error: emailError,
    });

    if (recordErr) {
      // The send already happened; failing the request now would tell the admin
      // nothing went out and invite them to send it a second time. Report the
      // real outcome and note that the history line is missing.
      logWarn('admin/notifications', 'broadcast sent but not recorded', { requestId: id, error: recordErr.message });
      return NextResponse.json({
        broadcast: null,
        inAppCreated,
        emailsSent,
        emailsFailed,
        emailError,
        recipients: members.length,
        optedOut,
        warning: 'The message went out, but it could not be written to the history.',
      });
    }

    const row = Array.isArray(recorded) ? recorded[0] : recorded;
    return NextResponse.json({
      broadcast: shapeBroadcast(row),
      inAppCreated,
      emailsSent,
      emailsFailed,
      emailError,
      recipients: members.length,
      // Surfaced so "412 people, 12 emails" reads as a preference rather than
      // a bug the admin then goes looking for.
      optedOut,
    });
  } catch (err) {
    return failure('admin/notifications', err, id, 'Could not send that notification.');
  }
}
