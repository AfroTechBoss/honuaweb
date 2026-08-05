import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, can } from "@/lib/admin-role";
import { isMissingTable } from "@/lib/pg-errors";
import { logError, logWarn, requestId, failure } from "@/lib/observability";

// The seller application queue — the one place an application is decided.
//
// GET    ?status=pending|approved|rejected|all&limit=     the queue
// PATCH  { id, decision, notes? }                          approve / decline
//
// This replaces a browser-side read of seller_applications that could never
// have worked from the console. The table's three policies (migration 017) are
// written for `auth.uid()`: the applicant sees their own rows, and an admin is
// recognised by a profiles row matching auth.uid(). The console signs in with
// Privy, so auth.uid() is null on every query it makes — the select matched
// nothing and the review update matched zero rows, which PostgREST reports as
// success. The queue looked empty because it was unreadable, not because it was
// clear, and "Approve seller" changed a chip and nothing else.
//
// Both halves now run under the service-role key, behind sellers.review.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/017_seller_applications.sql';

const STATUSES = new Set(['pending', 'approved', 'rejected']);

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';

const arr = (v: any): string[] => Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];

const day = (v: any) => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/**
 * One application in the words the panel renders. The applicant half comes from
 * profiles rather than the application, because a form filled in six weeks ago
 * is not who to look up now — and a reviewer deciding whether to trust a shop
 * wants the account's standing, not the name it typed.
 */
const shape = (r: any, who: any) => ({
  id: r.id,
  userId: r.user_id ?? null,
  shop: r.shop_name || 'Untitled shop',
  shopHandle: r.shop_handle ?? null,
  tagline: r.tagline ?? null,
  applicant: who?.full_name ?? who?.handle ?? 'Member',
  handle: who?.handle ?? r.shop_handle ?? '—',
  avatar: who?.avatar_url ?? null,
  verified: who?.verified === true,
  // Standing at review time. Approving a suspended account into a shopfront is
  // a decision, not an accident, so the reviewer gets told.
  accountStatus: who?.banned_at ? 'banned'
    : (who?.suspended_until && new Date(who.suspended_until).getTime() > Date.now()) ? 'suspended'
    : 'active',
  categories: arr(r.categories),
  type: r.offering_type || 'Physical goods',
  country: r.country || r.location || '—',
  shipsTo: r.ships_to ?? null,
  legalName: r.legal_name ?? null,
  bizType: r.biz_type ?? null,
  payoutMethod: r.payout_method ?? null,
  impact: r.impact_story || '—',
  practices: arr(r.practices),
  certs: arr(r.certs),
  status: STATUSES.has(r.status) ? r.status : 'pending',
  notes: r.review_notes ?? null,
  submitted: day(r.created_at),
  submittedAt: r.created_at ?? null,
  reviewedAt: r.reviewed_at ?? null,
});

// The columns the panel needs, named rather than `*` so a database one
// migration behind fails on the missing column instead of quietly shipping a
// row with holes in it.
const COLUMNS = 'id, user_id, shop_name, shop_handle, tagline, location, categories, offering_type, ships_to, practices, certs, impact_story, legal_name, biz_type, country, payout_method, status, review_notes, created_at, reviewed_at';

/** Applicant profiles for a page of applications, keyed by id. */
async function applicants(db: any, ids: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  const { data, error } = await db
    .from('profiles')
    .select('id, handle, full_name, avatar_url, verified, suspended_until, banned_at')
    .in('id', unique);
  // Losing the decoration is not worth losing the queue over — the application
  // itself carries a shop name and a handle, which is enough to review it.
  if (error) return map;
  for (const p of data ?? []) map.set(p.id, p);
  return map;
}

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-sellers', limit: 60, permission: 'sellers.review' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const wanted = str(req.nextUrl.searchParams.get('status'), 20) || 'pending';
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 100, 1), 300);

    let query = ctx.db.from('seller_applications').select(COLUMNS);
    if (STATUSES.has(wanted)) query = query.eq('status', wanted);
    // Pending oldest-first — the queue is a queue, and the application that has
    // been waiting longest is the one owed an answer. Decided lists read
    // newest-first, because there the interesting row is the last one touched.
    const { data, error } = await query
      .order('created_at', { ascending: wanted === 'pending' })
      .limit(limit);

    if (error) {
      if (isMissingTable(error)) {
        logWarn('admin/sellers', 'applications table missing', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ applications: [], counts: null, available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    const rows = data ?? [];
    const who = await applicants(ctx.db, rows.map((r: any) => r.user_id));

    // Counts are read separately so the tab labels stay honest under the limit:
    // a filtered page of 100 says nothing about how many are pending.
    const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    await Promise.all([...STATUSES].map(async s => {
      const { count } = await ctx.db.from('seller_applications').select('id', { count: 'exact', head: true }).eq('status', s);
      counts[s] = count ?? 0;
    }));

    return NextResponse.json({
      applications: rows.map((r: any) => shape(r, who.get(r.user_id))),
      counts,
      available: true,
      // sellers.review is both the read and the write permission here, so this
      // is always true today. Sent anyway, for the same reason the users route
      // sends canSuspend: the screen should ask rather than assume.
      canReview: can(ctx.role, 'sellers.review'),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/sellers', err, id, 'Could not load seller applications.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-sellers-write', limit: 30, permission: 'sellers.review' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const target = str(body?.id, 60);
    const decision = str(body?.decision, 20);
    const notes = str(body?.notes, 1000);

    if (!target) return NextResponse.json({ error: 'Which application?' }, { status: 400 });
    if (decision !== 'approve' && decision !== 'decline') {
      return NextResponse.json({ error: 'Decision must be approve or decline.' }, { status: 400 });
    }
    // A decline the applicant cannot act on is just a closed door. Same rule the
    // verification queue applies to its rejections.
    if (decision === 'decline' && !notes) {
      return NextResponse.json({ error: 'Say why it was declined — the applicant is shown this.' }, { status: 400 });
    }

    const { data: current, error: readErr } = await ctx.db
      .from('seller_applications')
      .select('id, user_id, shop_name, status')
      .eq('id', target)
      .maybeSingle();

    if (readErr) {
      if (isMissingTable(readErr)) {
        return NextResponse.json({ error: `Seller applications are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      throw readErr;
    }
    if (!current) return NextResponse.json({ error: 'No such application.' }, { status: 404 });

    // Two reviewers with the queue open in two tabs is the ordinary case, not
    // an edge one. The second one is told what happened rather than silently
    // overwriting the first's decision.
    if (current.status !== 'pending') {
      return NextResponse.json(
        { error: `That application was already ${current.status}.`, status: current.status },
        { status: 409 },
      );
    }

    const status = decision === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await ctx.db
      .from('seller_applications')
      .update({ status, review_notes: notes || null, reviewed_at: new Date().toISOString() })
      .eq('id', target)
      // Only a still-pending row, so two simultaneous decisions cannot both
      // land — the check above narrows the window, this closes it.
      .eq('status', 'pending')
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'That application was decided by someone else a moment ago.' }, { status: 409 });
    }

    const who = await applicants(ctx.db, [data.user_id]);

    // Written here rather than from the browser: an audit line the client is
    // trusted to send is one a client can decline to send.
    const { error: auditErr } = await ctx.db.from('admin_audit_log').insert({
      actor_id: ctx.adminId,
      actor_label: str(body?.actorLabel, 80) || 'Admin',
      action: decision === 'approve' ? 'Approved seller' : 'Declined seller application',
      target: current.shop_name || target,
      kind: decision === 'approve' ? 'check' : 'close',
      meta: { applicationId: target, userId: current.user_id, notes: notes || null },
    });
    if (auditErr) logError('admin/sellers', 'audit write failed', auditErr, { requestId: id, applicationId: target });

    return NextResponse.json({ application: shape(data, who.get(data.user_id)) });
  } catch (err) {
    return failure('admin/sellers', err, id, 'Could not update that application.');
  }
}
