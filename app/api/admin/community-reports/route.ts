import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-role";
import { isMissingFunction, isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";

// The moderation queue: reports members filed about a community or a comment.
//
// GET    ?status=&limit=   the queue
// PATCH  { id, status, note?, actorLabel? }   resolve, escalate or dismiss one
//
// The console read and wrote this table from the browser until now, which did
// not work and did not say so. Migration 009 gave community_reports exactly
// three policies — a member may insert their own report, and a *community
// owner* may read and update reports about their own community. There is no
// admin policy. So an admin's browser, which has no Supabase session at all
// under Privy, matched none of them: the queue rendered empty on a platform
// with reports in it, and pressing Resolve sent an UPDATE that changed zero
// rows and returned no error, because PostgREST does not consider "matched
// nothing" a failure. The screen then moved the card to Resolved anyway, off
// the back of its own optimistic state.
//
// Both halves are fixed here rather than by adding an admin policy to 009,
// because an RLS policy has nothing to key on: `auth.uid()` is null for a Privy
// admin, so "is this an admin" is not a question the database can answer from
// the request. It is a question this route can answer, from a verified token.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/041_account_freeze.sql';

// Straight from the CHECK constraint in 009. Kept here as well so an unknown
// status is a 400 with a readable message rather than a 500 out of Postgres.
const STATUSES = new Set(['pending', 'owner_actioned', 'escalated', 'admin_resolved', 'dismissed']);

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';

const shape = (r: any) => ({
  id: r.id,
  type: r.type,
  reason: r.reason,
  note: r.note ?? null,
  status: r.status,
  community: r.community_id ? { id: r.community_id, name: r.community_name ?? 'Unknown community' } : null,
  comment: r.comment_id ? { id: r.comment_id, body: r.comment_body ?? '', author: r.comment_author ?? null } : null,
  reporter: r.reporter_id
    ? { id: r.reporter_id, handle: r.reporter_handle, name: r.reporter_name, avatarUrl: r.reporter_avatar }
    : null,
  ownerAction: r.owner_action ?? null,
  ownerNote: r.owner_note ?? null,
  ownerActionedAt: r.owner_actioned_at ?? null,
  adminNote: r.admin_note ?? null,
  adminActionedAt: r.admin_actioned_at ?? null,
  createdAt: r.created_at,
});

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-reports', limit: 60, permission: 'moderation.view' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const status = str(req.nextUrl.searchParams.get('status'), 40);
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 200, 1), 500);

    const { data, error } = await ctx.db.rpc('admin_community_reports', {
      // 'all' and an unrecognised value both mean no filter. The screen's chips
      // send 'all' explicitly; treating anything else the same way means a stale
      // client can't produce an empty queue that looks like "no reports".
      p_status: status && status !== 'all' && STATUSES.has(status) ? status : null,
      p_limit: limit,
    });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        logWarn('admin/community-reports', 'queue unavailable', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ reports: [], available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    const reports = (data ?? []).map(shape);

    return NextResponse.json({
      reports,
      available: true,
      // The rail badge counts what still needs a person. Computed here off the
      // unfiltered set only when the caller asked for the unfiltered set —
      // otherwise it would report the size of whatever chip is selected.
      pending: !status || status === 'all'
        ? reports.filter((r: any) => r.status === 'pending' || r.status === 'escalated').length
        : null,
      canAct: ctx.role !== 'analyst',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/community-reports', err, id, 'Could not load the moderation queue.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-reports-write', limit: 60, permission: 'moderation.act' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const report = str(body?.id, 40);
    const status = str(body?.status, 40);
    const note = str(body?.note, 2000);

    if (!report) return NextResponse.json({ error: 'Which report?' }, { status: 400 });
    if (!STATUSES.has(status)) return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });

    const { data, error } = await ctx.db.rpc('admin_resolve_report', {
      p_actor: ctx.adminId,
      // Self-asserted, and used only as the name on the audit line — the
      // authorisation above read the verified DID. Same rule as the members
      // route: there is no PRIVY_APP_SECRET, so the server cannot look this up.
      p_label: str(body?.actorLabel, 80) || null,
      p_report: report,
      p_status: status,
      p_note: note || null,
    });

    if (error) {
      if (isMissingFunction(error)) {
        return NextResponse.json({ error: `Moderation is not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      if (error.code === 'P0002') return NextResponse.json({ error: 'That report no longer exists.' }, { status: 404 });
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 400 });
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    // Returned rather than assumed. The bug this route replaces was a screen
    // showing a status the database had not accepted.
    return NextResponse.json({
      report: {
        id: row?.id ?? report,
        status: row?.status ?? status,
        adminNote: row?.admin_note ?? null,
        adminActionedAt: row?.admin_actioned_at ?? null,
      },
    });
  } catch (err) {
    return failure('admin/community-reports', err, id, 'Could not update that report.');
  }
}
