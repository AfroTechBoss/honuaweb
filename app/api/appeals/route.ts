import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { enforce } from "@/lib/rate-limit";
import { isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";
import { APPEAL_KIND_VALUES, ACCOUNT_LEVEL_KINDS, APPEAL_LIMITS } from "@/lib/appeals";

// Files an appeal into public.appeals (migration 043).
//
// POST { kind, reason, email, target?, handle? } -> { ok, ref }
//
// Public, and more deliberately so than /support. Everyone who uses this route
// is someone the platform has just acted against; a suspended account cannot
// write to twenty-eight tables under migration 041, and a banned one may not be
// able to hold a session at all. So: no auth requirement, the table is sealed
// (RLS on, zero policies), and the insert happens here with the service-role
// key where RLS is never consulted and the freeze cannot reach.
//
// That is the whole reason this is a server route and not a Supabase insert
// from the page. It is not an optimisation.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/043_appeals.sql';

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

// Same loose grammar as /support. Strict address parsing rejects valid mail, and
// the cost of a wrong address here is a decision that never reaches the person
// it is about — which argues for accepting more, not less.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // Three per hour, against five per ten minutes on /support. An appeal is a
  // considered document rather than a message, migration 043 already caps
  // someone at one open appeal per kind, and this stops a locked-out account
  // from turning the moderation queue into a flood.
  const limited = enforce(
    req,
    { name: 'appeal-submit', limit: 3, windowMs: 3_600_000 },
    "You've filed an appeal recently. Give the team time to read it before sending another.",
  );
  if (limited) return limited;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Nothing to send.' }, { status: 400 });
    }

    const kind = clean(body.kind, 40);
    const reason = clean(body.reason, APPEAL_LIMITS.reason);
    const email = clean(body.email, APPEAL_LIMITS.email).toLowerCase();
    const handle = clean(body.handle, APPEAL_LIMITS.handle).replace(/^@/, '');
    // Dropped rather than stored for the two account-level kinds, where it has
    // no referent. Keeping it would put a stray post id on a ban appeal and send
    // a reviewer looking for a connection that was never claimed.
    const target = ACCOUNT_LEVEL_KINDS.includes(kind) ? '' : clean(body.target, APPEAL_LIMITS.target);

    // Rejected, not coerced to 'other'. A typo in a future caller should fail
    // here rather than quietly file ban appeals into a bucket nobody triages.
    if (!APPEAL_KIND_VALUES.includes(kind)) {
      return NextResponse.json({ error: 'Pick what you are appealing from the list.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Enter an email address we can send the decision to.' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'Tell us why you think this should be reversed.' }, { status: 400 });
    }
    // Not a formality. A reviewer reading two sentences has nothing to weigh
    // against the original decision, and the appeal gets upheld by default.
    if (reason.length < 40) {
      return NextResponse.json(
        { error: 'Please give us more to go on — a few sentences about what happened and why the decision was wrong.' },
        { status: 400 },
      );
    }

    const db = getSupabaseAdmin();
    if (!db) {
      logWarn('appeals', 'appeal dropped — service role not configured', {
        fix: 'set SUPABASE_SERVICE_ROLE_KEY', kind, requestId: id,
      });
      return NextResponse.json(
        { error: "We can't take this right now. Please email appeals@honua.green instead." },
        { status: 503 },
      );
    }

    // A session is a bonus, not a requirement — see the header. Verified against
    // Supabase rather than decoded here: an unverified `sub` would let anyone
    // file an appeal under someone else's account, and an overturned appeal
    // lifts a restriction.
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
      .from('appeals')
      .insert({
        kind,
        reason,
        email,
        // Self-asserted when there is no session, which is fine: it is a label
        // on a queue card. The queue's RPC prefers the handle joined from
        // profiles whenever user_id resolved, so this is only ever the fallback.
        handle: handle || null,
        target: target || null,
        user_id: userId,
      })
      .select('ref')
      .single();

    if (error) {
      // The partial unique indexes in 043. Worth its own message: "one open
      // appeal at a time" is a rule the person can act on, and a generic failure
      // would have them resubmitting into the same wall.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You already have an open appeal about this. We will reply to it — sending another will not speed it up.' },
          { status: 409 },
        );
      }
      if (isMissingTable(error)) {
        logWarn('appeals', 'appeals table missing', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json(
          { error: "We couldn't file your appeal. Please email appeals@honua.green so it isn't lost." },
          { status: 503 },
        );
      }
      logWarn('appeals', 'could not file appeal', { kind, requestId: id, reason: error.message });
      return NextResponse.json(
        { error: "We couldn't file your appeal. Please email appeals@honua.green so it isn't lost." },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, ref: data?.ref ?? null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('appeals', err, id, "We couldn't file your appeal.");
  }
}
