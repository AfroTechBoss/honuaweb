import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { enforce } from "@/lib/rate-limit";
import { logWarn, requestId, failure } from "@/lib/observability";
import { SUPPORT_CATEGORIES, REPORT_CATEGORIES, REPORT_SEVERITIES, SUPPORT_LIMITS } from "@/lib/support";
import { readPlatformFull } from "@/lib/platform-server";
import { sendEmail, escapeHtml } from "@/lib/email";

// Files a ticket from /support or /report into public.support_tickets
// (migration 037).
//
// Public on purpose. Both pages sit in middleware's PUBLIC_PATHS because
// someone locked out of their account still needs a way to reach a person, so
// this route accepts an anonymous body and treats the Authorization header as a
// bonus rather than a requirement.
//
// One route for both forms rather than two. They differ by a category list and
// one nullable column; splitting them would have meant two rate limiters, two
// validators, and two places to forget the same fix.
//
// POST { email, category, subject, message, orderRef?, kind?, severity? }
//   -> { ok, ref }

export const runtime = 'nodejs';

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

// Deliberately loose. Strict address grammar rejects valid mail, and the cost
// of a wrong address here is a reply that bounces — not a security boundary.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tells whoever is on duty that something arrived. Never throws: every caller
// has already succeeded at the thing that mattered by the time it runs.
async function alertAdmins(t: {
  isReport: boolean;
  category: string;
  subject: string;
  message: string;
  email: string;
  severity: string | null;
  ref: string | null;
  requestId: string;
}) {
  try {
    const settings = await readPlatformFull();
    // null means the settings could not be read at all, which is not the same
    // as alerts being off — and a safety report nobody is told about is worth a
    // line in the log.
    if (!settings) {
      logWarn('support', 'could not read alert settings — no alert sent', { requestId: t.requestId });
      return;
    }
    if (!settings.adminEmailAlerts) return;
    if (!settings.alertEmail) {
      logWarn('support', 'admin alerts are on but no address is set', {
        fix: 'set an alert address in the console under Settings', requestId: t.requestId,
      });
      return;
    }

    const label = t.isReport ? 'Safety report' : 'Support ticket';
    const head = `${label}${t.severity ? ` (${t.severity})` : ''}: ${t.subject}`;
    const lines = [
      head,
      '',
      `From:     ${t.email}`,
      `Category: ${t.category}`,
      ...(t.ref ? [`Ref:      ${t.ref}`] : []),
      '',
      t.message,
      '',
      '—',
      'Sent because admin email alerts are on for this platform. Turn them off in the console under Settings.',
    ].join('\n');

    const res = await sendEmail({
      to: settings.alertEmail,
      subject: head,
      html: `<pre style="font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;">${escapeHtml(lines)}</pre>`,
      text: lines,
      // So a reply from the console goes to the person who wrote in, not into
      // the alert mailbox.
      replyTo: t.email,
    });
    if (!res.sent) {
      logWarn('support', 'alert email not sent', { reason: res.error, requestId: t.requestId });
    }
  } catch (e: any) {
    logWarn('support', 'alert email failed', { reason: e?.message, requestId: t.requestId });
  }
}

export async function POST(req: NextRequest) {
  // Five per ten minutes per IP, shared by both forms. High enough that a
  // person who sends a message, realises they left out the order number, and
  // sends a second one is never blocked; low enough that neither form is a
  // mail-flood primitive.
  const limited = enforce(
    req,
    { name: 'support-submit', limit: 5, windowMs: 600_000 },
    "You've sent several messages already — give us a little time to reply to those first.",
  );
  if (limited) return limited;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Nothing to send.' }, { status: 400 });
    }

    // Unrecognised kinds are rejected rather than coerced to 'support'. A typo
    // in a future caller should fail loudly here, not quietly file safety
    // reports into the billing queue where nobody is looking for them.
    const kind = body.kind === undefined ? 'support' : body.kind;
    if (kind !== 'support' && kind !== 'report') {
      return NextResponse.json({ error: 'Unknown submission type.' }, { status: 400 });
    }
    const isReport = kind === 'report';

    const email = clean(body.email, SUPPORT_LIMITS.email).toLowerCase();
    const category = clean(body.category, 80);
    const subject = clean(body.subject, SUPPORT_LIMITS.subject);
    const message = clean(body.message, SUPPORT_LIMITS.message);
    const orderRef = clean(body.orderRef, SUPPORT_LIMITS.orderRef);

    // Field-specific, because "Invalid input" on a form someone spent five
    // minutes writing is its own small insult.
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter an email address we can reply to.' }, { status: 400 });
    if (!subject) return NextResponse.json({ error: 'Add a subject so we know what this is about.' }, { status: 400 });
    if (!message) {
      return NextResponse.json(
        { error: isReport ? 'Describe what happened so we can investigate.' : 'Add a message describing the issue.' },
        { status: 400 },
      );
    }

    const allowed: readonly string[] = isReport ? REPORT_CATEGORIES : SUPPORT_CATEGORIES;
    if (!allowed.includes(category)) {
      return NextResponse.json({ error: 'Pick a category from the list.' }, { status: 400 });
    }

    // Only meaningful on a report. Sent with a support ticket it is dropped
    // rather than rejected — the column is nullable and the caller gains
    // nothing from being corrected about a field the queue ignores.
    let severity: string | null = null;
    if (isReport) {
      severity = (REPORT_SEVERITIES as readonly string[]).includes(body.severity) ? body.severity : 'medium';
    }

    const db = getSupabaseAdmin();
    if (!db) {
      // Loud, and a 503 rather than a cheerful 200. The form must be able to
      // tell the sender their message did not land — the alternative is the
      // behaviour this route was written to replace.
      logWarn('support', 'ticket dropped — service role not configured', {
        fix: 'set SUPABASE_SERVICE_ROLE_KEY', kind, requestId: id,
      });
      return NextResponse.json(
        { error: `We can't take this right now. Please email ${isReport ? 'trust' : 'support'}@honua.green instead.` },
        { status: 503 },
      );
    }

    // A session is optional, so a bad or expired token is not an error — it
    // just means the ticket is anonymous. Verified against Supabase rather than
    // decoded locally: an unverified `sub` would let anyone file under someone
    // else's account.
    let userId: string | null = null;
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const { data } = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      ).auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    const { data, error } = await db
      .from('support_tickets')
      .insert({
        kind,
        category,
        subject,
        message,
        email,
        order_ref: orderRef || null,
        user_id: userId,
        severity,
      })
      .select('ref')
      .single();

    if (error) {
      // The table not existing yet is the one failure worth naming precisely,
      // because the fix is a migration rather than a retry.
      logWarn('support', 'could not file ticket', {
        fix: 'apply supabase/migrations/037_support_tickets.sql',
        kind, requestId: id, reason: error.message,
      });
      return NextResponse.json(
        {
          error: `We couldn't file your ${isReport ? 'report' : 'message'}. ` +
                 `Please email ${isReport ? 'trust' : 'support'}@honua.green so it isn't lost.`,
        },
        { status: 503 },
      );
    }

    const ref = data?.ref ?? null;

    // The ticket is filed; everything below is a courtesy to whoever is meant
    // to read it. Awaited rather than left floating — a promise still running
    // when the response returns is a promise a serverless runtime is free to
    // kill — but it swallows its own failures, because a mail provider having a
    // bad day must not turn a filed ticket into an error page that invites the
    // sender to file it a second time.
    //
    // This is the reader for platform_settings.admin_email_alerts. A switch
    // reading "on" while pointing nowhere is the exact failure this piece of
    // work exists to remove, so an empty alert_email sends nothing and says so
    // in the log rather than quietly falling back to an address nobody chose.
    await alertAdmins({ isReport, category, subject, message, email, severity, ref, requestId: id });

    return NextResponse.json({ ok: true, ref }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('support', err, id, "We couldn't send your message.");
  }
}
