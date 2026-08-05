import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { sendEmail, SUPPORT_EMAIL } from "@/lib/email";
import { verificationApprovedEmail, verificationRejectedEmail } from "@/lib/email-verification";
import { enforce } from "@/lib/rate-limit";
import { gateRole, type Permission } from "@/lib/admin-role";
import { logError, logWarn, requestId } from "@/lib/observability";

// The verification review queue.
//
// This is the only path that can set profiles.verified: migration 030 installs
// a trigger that reverts the column for anon and authenticated writers, so a
// browser cannot verify itself no matter what it PATCHes. The service-role
// client here runs as `service_role`, which the trigger lets through — which is
// exactly why every handler is gated on a verified Privy token first.
//
// It is also the only place that can read applicants' email addresses (they
// live in auth.users, not profiles) and write a notification to someone else's
// row, both of which RLS rightly forbids from the client.

export const runtime = 'nodejs';

async function authed(req: NextRequest, permission: Permission): Promise<{ db: any; adminId: string; fail: NextResponse | null }> {
  // Counted before the token is checked, not after. verifyPrivyToken is a
  // network round trip, so an unauthenticated flood costs real money and real
  // latency even though every request 401s. The budget is generous — a reviewer
  // typing in the search box fires one per keystroke-pause — and still bounded.
  const limited = enforce(req, { name: 'admin-verification', limit: 60, windowMs: 60_000 });
  if (limited) return { db: null, adminId: '', fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return { db: null, adminId: '', fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabaseAdmin();
  if (!db) return { db: null, adminId: '', fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };

  // The queue holds applicants' legal documents and their email addresses, and
  // PATCH is the only thing on the platform that can set profiles.verified. Both
  // halves want a reviewer, not just anyone holding a console token.
  const denied = await gateRole(db, admin.userId, permission);
  if (denied) return { db: null, adminId: '', fail: denied };

  return { db, adminId: admin.userId, fail: null };
}

const str = (v: any) => typeof v === 'string' ? v.trim() : '';

// Links in the approval email have to point somewhere real. Behind a proxy the
// request URL is the internal one, so trust the forwarded host over it.
function appUrl(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : '';
}

const PROFILE_COLUMNS = 'id, handle, full_name, avatar_url, bio, website, location, verified, verified_at, impact_score, created_at';

// verified_at only exists once migration 029 is applied. Rather than let the
// whole console 500 on a database that's one migration behind, drop the column
// and carry on — the "verified since" line is the only thing that goes missing.
async function selectProfiles(db: any, filter: (q: any) => any) {
  const first = await filter(db.from('profiles').select(PROFILE_COLUMNS));
  if (!first.error || first.error.code !== '42703') return first;
  return await filter(db.from('profiles').select(PROFILE_COLUMNS.replace(', verified_at', '')));
}

type Signals = { followers: number; posts: number; verified_actions: number };

// Follower/post/action counts for the whole list in one round trip, counted in
// Postgres by migration 032.
//
// The fallback is what this used to do unconditionally: fetch every matching
// row and count them in JavaScript. That transfers one row per follower to
// produce a number — fine at four accounts, ruinous at four thousand — so it
// exists only to keep the console working on a database that hasn't had 032
// applied yet, and says so in the log.
async function accountSignals(db: any, ids: string[]): Promise<Map<string, Signals>> {
  const { data, error } = await db.rpc('admin_account_signals', { ids });
  if (!error && data) {
    return new Map<string, Signals>(data.map((r: any) => [r.user_id, {
      followers: Number(r.followers ?? 0),
      posts: Number(r.posts ?? 0),
      verified_actions: Number(r.verified_actions ?? 0),
    }]));
  }

  logWarn('verification', 'admin_account_signals unavailable — counting client-side', {
    fix: 'apply supabase/migrations/032_admin_account_signals.sql',
    accounts: ids.length,
    reason: error?.message,
  });

  const [{ data: follows }, { data: posts }, { data: logs }] = await Promise.all([
    db.from('follows').select('following_id').in('following_id', ids),
    db.from('posts').select('user_id').in('user_id', ids),
    db.from('impact_logs').select('user_id').in('user_id', ids).eq('status', 'verified'),
  ]);

  const tally = (rows: any[] | null, key: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
    return m;
  };
  const followers = tally(follows, 'following_id');
  const postCount = tally(posts, 'user_id');
  const verifiedActions = tally(logs, 'user_id');

  return new Map<string, Signals>(ids.map(id => [id, {
    followers: followers.get(id) ?? 0,
    posts: postCount.get(id) ?? 0,
    verified_actions: verifiedActions.get(id) ?? 0,
  }]));
}

// Emails live in auth.users, which PostgREST doesn't expose. Migration 032
// opens one narrow door: ids in, addresses out. The fallback is one admin API
// call per account — N concurrent round trips into GoTrue, which starts
// rate-limiting well before the 500-account ceiling this list allows.
async function accountEmails(db: any, ids: string[]): Promise<Map<string, string | null>> {
  const { data, error } = await db.rpc('admin_account_emails', { ids });
  if (!error && data) {
    return new Map<string, string | null>(data.map((r: any) => [r.id, r.email ?? null]));
  }

  logWarn('verification', 'admin_account_emails unavailable — falling back to per-account lookups', {
    fix: 'apply supabase/migrations/032_admin_account_signals.sql',
    accounts: ids.length,
    reason: error?.message,
  });

  const emails = new Map<string, string | null>();
  await Promise.all(ids.map(async (id) => {
    try {
      const { data: u } = await db.auth.admin.getUserById(id);
      emails.set(id, u?.user?.email ?? null);
    } catch { emails.set(id, null); }
  }));
  return emails;
}

// A reviewer shouldn't have to open four tabs to judge one account, so the
// signals they'd go looking for are counted here and sent with the row.
// Returns the decorated profiles keyed by id.
async function decorate(db: any, ids: string[], preloaded?: any[]) {
  if (!ids.length) return new Map<string, any>();

  const [profilesResult, signals, emails] = await Promise.all([
    preloaded ? { data: preloaded } : selectProfiles(db, (q: any) => q.in('id', ids)),
    accountSignals(db, ids),
    accountEmails(db, ids),
  ]);

  const zero: Signals = { followers: 0, posts: 0, verified_actions: 0 };

  return new Map((profilesResult.data ?? []).map((p: any) => [p.id, {
    ...p,
    impact_score: Number(p.impact_score ?? 0),
    ...(signals.get(p.id) ?? zero),
    email: emails.get(p.id) ?? null,
  }]));
}

async function withApplicants(db: any, requests: any[]) {
  const ids = [...new Set(requests.map(r => r.user_id))];
  if (!ids.length) return [];
  const byId = await decorate(db, ids);
  return requests.map(r => ({ ...r, applicant: byId.get(r.user_id) ?? null }));
}

// Who actually carries the badge right now. Deliberately read from profiles
// rather than counted off approved applications: accounts verified before the
// queue existed have no application at all, so counting rows in
// verification_requests reports zero while the tick is plainly on the profile.
async function verifiedAccounts(db: any) {
  const { data, error } = await selectProfiles(db, (q: any) => q.eq('verified', true).limit(500));
  if (error || !data?.length) return [];
  const byId = await decorate(db, data.map((p: any) => p.id), data);
  return data
    .map((p: any) => byId.get(p.id))
    .sort((a: any, b: any) =>
      new Date(b.verified_at ?? b.created_at).getTime() - new Date(a.verified_at ?? a.created_at).getTime());
}

// GET — the whole queue plus everyone currently carrying a badge. A reviewer
// needs to see what was already decided (and by whom) as much as what's
// waiting, and needs a way to reach accounts that never applied at all.
//
// With ?search= it does something different: finds accounts by handle or name,
// for the "verify someone directly" picker. Same auth, so it stays one route.
export async function GET(req: NextRequest) {
  const { db, fail } = await authed(req, 'sellers.review');
  if (fail) return fail;

  const search = str(req.nextUrl.searchParams.get('search'));
  if (search) {
    // PostgREST's `or` splits on commas, so a comma in the term would be read
    // as a second filter. Strip it along with the LIKE wildcards.
    const term = search.replace(/[,%_]/g, ' ').trim();
    if (!term) return NextResponse.json({ matches: [] });
    const { data, error } = await selectProfiles(db, (q: any) =>
      q.or(`handle.ilike.%${term}%,full_name.ilike.%${term}%`).limit(10));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const byId = await decorate(db, (data ?? []).map((p: any) => p.id), data ?? []);
    return NextResponse.json({ matches: (data ?? []).map((p: any) => byId.get(p.id)) });
  }

  const { data, error } = await db
    .from('verification_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  // A missing table means the queue isn't switched on yet. The verified list
  // is read from profiles and doesn't depend on it, so return that anyway —
  // being one migration behind shouldn't blank the whole section.
  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({
        requests: [],
        verified: await verifiedAccounts(db),
        error: 'Applications are off until migration 030 is applied — verification_requests does not exist yet. Accounts already verified are listed below.',
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Pending first regardless of age, then newest decisions.
  const rows = (data ?? []).sort((a: any, b: any) => {
    const ap = a.status === 'pending' ? 0 : 1;
    const bp = b.status === 'pending' ? 0 : 1;
    return ap !== bp ? ap - bp : (a.status === 'pending'
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()   // oldest waiting first
      : new Date(b.reviewed_at ?? b.created_at).getTime() - new Date(a.reviewed_at ?? a.created_at).getTime());
  });

  const [requests, verified] = await Promise.all([withApplicants(db, rows), verifiedAccounts(db)]);
  return NextResponse.json({ requests, verified });
}

// Best-effort, in this order: the notification is what the user sees in-app and
// must not be lost to an email provider outage, so it goes first and the email
// result is reported back rather than thrown.
//
// A failure here is exactly the kind that used to disappear: the decision still
// saved, the reviewer still saw a success toast, and the account was simply
// never told. Nothing looks broken, so nobody looks.
async function notify(db: any, userId: string, type: string, body: string, id: string) {
  const { error } = await db.from('notifications').insert({ user_id: userId, actor_id: null, type, body });
  if (error) logError('verification', 'notification insert failed', error, { requestId: id, userId, type });
}

// The congratulation or the explanation, sent last and never allowed to undo a
// decision that's already recorded. Returns what happened so the reviewer's
// toast can be honest about it rather than assuming it went out.
async function sendDecisionEmail(db: any, req: NextRequest, profile: any, approved: boolean, reason: string) {
  try {
    const { data: authUser } = await db.auth.admin.getUserById(profile.id);
    const to = authUser?.user?.email ?? '';
    const name = profile.full_name || `@${profile.handle}`;
    const mail = approved
      ? verificationApprovedEmail({ name, handle: profile.handle, appUrl: appUrl(req) })
      : verificationRejectedEmail({ name, handle: profile.handle, reason, appUrl: appUrl(req) });
    // replyTo last so it wins regardless of what the template returns — a reply
    // has to reach a person, and this is the one send where it's likely.
    const result = await sendEmail({ to, ...mail, replyTo: SUPPORT_EMAIL });
    return { emailed: result.sent, emailError: result.error };
  } catch (e: any) {
    return { emailed: false, emailError: e?.message || 'Could not send the email' };
  }
}

// PATCH — approve or reject an application, verify an account directly, or
// revoke an existing badge.
export async function PATCH(req: NextRequest) {
  const { db, adminId, fail } = await authed(req, 'sellers.review');
  if (fail) return fail;

  // `rid`, not `id` — `id` below is the application's primary key.
  const rid = requestId(req);
  const body = await req.json().catch(() => ({}));
  const decision = str(body?.decision);
  const note = str(body?.note);
  if (!['approve', 'reject', 'revoke', 'grant'].includes(decision)) {
    return NextResponse.json({ error: 'decision must be approve, reject, grant or revoke' }, { status: 400 });
  }
  // A rejection or a revocation the account can't act on is just a closed door.
  if (decision === 'reject' || decision === 'revoke') {
    if (!note) return NextResponse.json({ error: 'Give a reason — it gets sent to the account.' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // ── Revoke: no application to close, so record one that says what happened.
  if (decision === 'revoke') {
    const userId = str(body?.userId);
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const { error: profileError } = await db.from('profiles').update({ verified: false }).eq('id', userId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    await db.from('verification_requests').insert({
      user_id: userId, status: 'revoked', reviewer_note: note, reviewed_by: adminId, reviewed_at: now,
    });
    await notify(db, userId, 'verification_declined', `Your verified badge was removed. ${note}`, rid);

    return NextResponse.json({ ok: true });
  }

  // ── Grant: verify an account that never applied.
  //
  // The queue is the normal road in, but an admin sometimes already knows —
  // an organization they onboarded, a partner, an account verified before the
  // queue existed. It still writes an application row so the badge always has
  // a record behind it saying who granted it and on what basis; the difference
  // is that the account didn't write that row, the reviewer did.
  if (decision === 'grant') {
    const userId = str(body?.userId);
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const { data: profile } = await db
      .from('profiles').select('id, handle, full_name, verified').eq('id', userId).single();
    if (!profile) return NextResponse.json({ error: 'No such account' }, { status: 404 });
    if (profile.verified) return NextResponse.json({ error: `@${profile.handle} is already verified.` }, { status: 409 });

    const { error: flagError } = await db.from('profiles').update({ verified: true }).eq('id', userId);
    if (flagError) return NextResponse.json({ error: flagError.message }, { status: 500 });

    // If they had an application open, this closes it rather than leaving one
    // pending against an account that's already been verified.
    const { data: open } = await db
      .from('verification_requests').select('id').eq('user_id', userId).eq('status', 'pending').maybeSingle();

    const record = {
      status: 'approved' as const,
      reviewer_note: note || null,
      reviewed_by: adminId,
      reviewed_at: now,
    };
    if (open) {
      await db.from('verification_requests').update(record).eq('id', open.id);
    } else {
      await db.from('verification_requests').insert({
        ...record,
        user_id: userId,
        note: 'Verified directly by an admin — no application was submitted.',
      });
    }

    await notify(db, userId, 'account_verified', "You're verified — the badge is on your profile now.", rid);
    const mail = await sendDecisionEmail(db, req, profile, true, '');
    return NextResponse.json({ ok: true, closedApplication: !!open, ...mail });
  }

  // ── Approve / reject an application.
  const id = str(body?.id);
  if (!id) return NextResponse.json({ error: 'Missing request id' }, { status: 400 });

  const { data: request, error: readError } = await db
    .from('verification_requests').select('*').eq('id', id).single();
  if (readError || !request) return NextResponse.json({ error: 'No such request' }, { status: 404 });
  if (request.status !== 'pending') {
    return NextResponse.json({ error: `This application was already ${request.status}.` }, { status: 409 });
  }

  const { data: profile } = await db
    .from('profiles').select('id, handle, full_name').eq('id', request.user_id).single();
  if (!profile) return NextResponse.json({ error: 'The applicant no longer has a profile' }, { status: 404 });

  // The badge first: if this fails, nothing else should have happened.
  if (decision === 'approve') {
    const { error: flagError } = await db.from('profiles').update({ verified: true }).eq('id', profile.id);
    if (flagError) return NextResponse.json({ error: flagError.message }, { status: 500 });
  }

  const { data: updated, error: updateError } = await db
    .from('verification_requests')
    .update({
      status: decision === 'approve' ? 'approved' : 'rejected',
      reviewer_note: note || null,
      reviewed_by: adminId,
      reviewed_at: now,
    })
    .eq('id', id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await notify(
    db,
    profile.id,
    decision === 'approve' ? 'account_verified' : 'verification_declined',
    decision === 'approve'
      ? "You're verified — the badge is on your profile now."
      : `Your verification request wasn't approved. ${note}`,
    rid,
  );

  // Email last. It's the part most likely to fail for reasons outside this
  // app, and by now the decision is already recorded and visible in-app.
  const { emailed, emailError } = await sendDecisionEmail(db, req, profile, decision === 'approve', note);

  const [withApplicant] = await withApplicants(db, [updated]);
  return NextResponse.json({ request: withApplicant, emailed, emailError });
}
