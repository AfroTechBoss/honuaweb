import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-role";
import { isMissingFunction, isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";

// The appeals queue (migration 043).
//
// GET   ?status=&limit=                          the queue
// PATCH { id, status, resolution, actorLabel? }  uphold or overturn one
//
// Both gated on `appeals.resolve`, which owner, admin and moderator hold and
// analyst does not. Until this route existed the Roles page drew that row with
// "NOT ENFORCED" under it, because the screen behind it was a MOCK_APPEALS array
// and Uphold moved a card in React state — there was nothing to gate.
//
// What this route deliberately cannot do: lift a restriction. Overturning an
// appeal records that the original decision was wrong; reinstating the account
// is admin_set_account_status in migration 041, reached through
// /api/admin/users, and gated on users.suspend / users.ban. A moderator holds
// appeals.resolve and users.suspend but not users.ban — so folding reinstatement
// into this route would hand them a way to undo a ban they are not allowed to
// issue. The response returns the appellant's id instead, and the console offers
// reinstatement as a separate action that is checked on its own terms.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/043_appeals.sql';

const STATUSES = new Set(['open', 'upheld', 'overturned']);
const OUTCOMES = new Set(['upheld', 'overturned']);

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';

const shape = (r: any) => ({
  id: r.id,
  ref: r.ref,
  kind: r.kind,
  status: r.status,
  target: r.target ?? null,
  reason: r.reason,
  resolution: r.resolution ?? null,
  resolvedLabel: r.resolved_label ?? null,
  resolvedAt: r.resolved_at ?? null,
  seen: r.seen ?? false,
  createdAt: r.created_at,
  user: {
    id: r.user_id ?? null,
    handle: r.handle ?? null,
    name: r.full_name ?? null,
    email: r.email ?? null,
    avatarUrl: r.avatar_url ?? null,
    suspendedUntil: r.suspended_until ?? null,
    bannedAt: r.banned_at ?? null,
  },
  originalAction: r.action_kind
    ? { kind: r.action_kind, reason: r.action_reason ?? null, at: r.action_at, by: r.action_by ?? null }
    : null,
});

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-appeals', limit: 60, permission: 'appeals.resolve' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const status = str(req.nextUrl.searchParams.get('status'), 40);
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 200, 1), 500);

    const { data, error } = await ctx.db.rpc('admin_appeal_queue', {
      // 'all' and anything unrecognised both mean no filter, so a stale client
      // cannot produce an empty queue that reads as "no appeals".
      p_status: status && status !== 'all' && STATUSES.has(status) ? status : null,
      p_limit: limit,
    });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        logWarn('admin/appeals', 'queue unavailable', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ appeals: [], available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    const appeals = (data ?? []).map(shape);

    return NextResponse.json({
      appeals,
      available: true,
      // Counted here off the unfiltered set only when the caller asked for the
      // unfiltered set — otherwise the badge would report the size of whichever
      // chip happens to be selected.
      open: !status || status === 'all' ? appeals.filter((a: any) => a.status === 'open').length : null,
      // Sent rather than inferred client-side. Every role that can reach this
      // GET can also resolve, but the console should not be deciding that.
      canResolve: true,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/appeals', err, id, 'Could not load the appeals queue.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-appeals-write', limit: 60, permission: 'appeals.resolve' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const appeal = str(body?.id, 40);
    const status = str(body?.status, 40);
    const resolution = str(body?.resolution, 4000);

    if (!appeal) return NextResponse.json({ error: 'Which appeal?' }, { status: 400 });
    if (!OUTCOMES.has(status)) {
      return NextResponse.json({ error: 'An appeal is either upheld or overturned.' }, { status: 400 });
    }
    // Checked here as well as in the database so the message is about the form
    // rather than about a constraint.
    if (!resolution) {
      return NextResponse.json({ error: 'Write the reasoning — the appellant is sent this.' }, { status: 400 });
    }

    const { data, error } = await ctx.db.rpc('admin_resolve_appeal', {
      p_actor: ctx.adminId,
      // Self-asserted, and used only as the name on the decision and the audit
      // line. Authorisation above read the verified DID — there is no
      // PRIVY_APP_SECRET, so the server cannot look this up.
      p_label: str(body?.actorLabel, 80) || null,
      p_appeal: appeal,
      p_status: status,
      p_resolution: resolution,
    });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        return NextResponse.json({ error: `Appeals are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      if (error.code === 'P0002') return NextResponse.json({ error: 'That appeal no longer exists.' }, { status: 404 });
      // Already decided, or a blank resolution that slipped past the check above.
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 409 });
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      // Returned rather than assumed — the bug this screen had was showing an
      // outcome nothing had accepted.
      appeal: {
        id: row?.id ?? appeal,
        ref: row?.ref ?? null,
        kind: row?.kind ?? null,
        status: row?.status ?? status,
        resolution: row?.resolution ?? resolution,
        resolvedLabel: row?.resolved_label ?? null,
        resolvedAt: row?.resolved_at ?? null,
        // The console uses this to offer reinstatement as a separate, separately
        // gated action. See the header.
        userId: row?.user_id ?? null,
      },
    });
  } catch (err) {
    return failure('admin/appeals', err, id, 'Could not record that decision.');
  }
}
