import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, can } from "@/lib/admin-role";
import { isMissingTable } from "@/lib/pg-errors";
import { logError, logWarn, requestId, failure } from "@/lib/observability";

// The content moderation queue: reports members filed about a post, a comment,
// a profile or a listing.
//
// GET    ?status=&limit=                              the queue, grouped by target
// PATCH  { targetType, targetId, decision, note? }    remove / restore / dismiss
//
// Distinct from /api/admin/community-reports, which is migration 009's table
// and covers reports raised *inside a community* — those have a community owner
// who can act first, and a whole escalation path this one does not have. This
// route is the platform feed: no owner in between, moderators only.
//
// The panel behind it reviewed MOCK_ADMIN.reports and its Remove button was a
// setState. Neither the queue nor the action existed. Both do now — see
// migration 046 for the table and for why removal is a column on posts and
// comments rather than a delete.
//
// Service-role, like every other admin route: content_reports' policies are
// keyed on `reporter_id = auth.uid()`, and the console's Privy session leaves
// auth.uid() null. A browser reading this table as an admin would be shown an
// empty queue, correctly, by a policy written for reporters.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/046_content_reports.sql';

const STATUSES = new Set(['pending', 'actioned', 'dismissed']);
const TARGET_TYPES = new Set(['post', 'comment', 'profile', 'product']);
const DECISIONS = new Set(['remove', 'restore', 'dismiss']);

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';

const isUuid = (v: any) => typeof v === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const key = (type: string, id: string) => `${type}:${id}`;

// Enough of the reported thing to judge it by, and no more. A moderator
// deciding on a report needs the words that were written; they do not need the
// whole row, and shipping the whole row to the console would send private
// columns to a screen that has no use for them.
const EXCERPT = 240;
const clip = (s: any) => {
  const text = typeof s === 'string' ? s.trim() : '';
  return text.length > EXCERPT ? text.slice(0, EXCERPT) + '…' : text;
};

async function loadProfiles(db: any, ids: string[]) {
  const out = new Map<string, any>();
  const wanted = [...new Set(ids.filter(isUuid))];
  if (!wanted.length) return out;
  const { data } = await db
    .from('profiles')
    .select('id, handle, full_name, avatar_url, verified, suspended_until, banned_at')
    .in('id', wanted);
  for (const p of data ?? []) out.set(p.id, p);
  return out;
}

const standing = (p: any): 'active' | 'suspended' | 'banned' => {
  if (!p) return 'active';
  if (p.banned_at) return 'banned';
  if (p.suspended_until && new Date(p.suspended_until).getTime() > Date.now()) return 'suspended';
  return 'active';
};

const person = (p: any) => p ? {
  id: p.id,
  name: p.full_name || p.handle || 'Member',
  handle: p.handle ?? null,
  avatar: p.avatar_url ?? null,
  verified: p.verified === true,
  status: standing(p),
} : null;

/**
 * Fetches the reported things themselves, one query per kind that appears in
 * the queue rather than one per report. A target that no longer exists comes
 * back missing and the card says so — see the note on polymorphism in 046.
 */
async function loadTargets(db: any, rows: any[]) {
  const byType: Record<string, string[]> = { post: [], comment: [], profile: [], product: [] };
  for (const r of rows) if (isUuid(r.target_id) && byType[r.target_type]) byType[r.target_type].push(r.target_id);

  const found = new Map<string, any>();
  const jobs: Promise<void>[] = [];

  if (byType.post.length) jobs.push((async () => {
    const { data } = await db.from('posts')
      .select('id, user_id, content, title, image_url, created_at, removed_at, removed_reason')
      .in('id', [...new Set(byType.post)]);
    for (const p of data ?? []) found.set(key('post', p.id), {
      ownerId: p.user_id ?? null,
      title: p.title || 'Post',
      excerpt: clip(p.content),
      image: p.image_url ?? null,
      createdAt: p.created_at ?? null,
      removed: !!p.removed_at,
      removedReason: p.removed_reason ?? null,
      removable: true,
    });
  })());

  if (byType.comment.length) jobs.push((async () => {
    const { data } = await db.from('comments')
      .select('id, user_id, post_id, content, created_at, removed_at, removed_reason')
      .in('id', [...new Set(byType.comment)]);
    for (const c of data ?? []) found.set(key('comment', c.id), {
      ownerId: c.user_id ?? null,
      title: 'Comment',
      excerpt: clip(c.content),
      image: null,
      createdAt: c.created_at ?? null,
      removed: !!c.removed_at,
      removedReason: c.removed_reason ?? null,
      removable: true,
      postId: c.post_id ?? null,
    });
  })());

  if (byType.profile.length) jobs.push((async () => {
    const { data } = await db.from('profiles')
      .select('id, handle, full_name, bio, avatar_url, created_at')
      .in('id', [...new Set(byType.profile)]);
    for (const p of data ?? []) found.set(key('profile', p.id), {
      ownerId: p.id,
      title: p.full_name || p.handle || 'Member',
      excerpt: clip(p.bio),
      image: p.avatar_url ?? null,
      createdAt: p.created_at ?? null,
      removed: false,
      removedReason: null,
      // A profile is not content and cannot be taken down — the answer to a
      // reported account is a suspension, which lives behind users.suspend.
      // Offering Remove here would be a second door to that decision with a
      // different lock on it.
      removable: false,
    });
  })());

  if (byType.product.length) jobs.push((async () => {
    const { data } = await db.from('products')
      .select('id, seller_id, name, description, image_url, status, created_at')
      .in('id', [...new Set(byType.product)]);
    for (const p of data ?? []) found.set(key('product', p.id), {
      ownerId: p.seller_id ?? null,
      title: p.name || 'Listing',
      excerpt: clip(p.description),
      image: p.image_url ?? null,
      createdAt: p.created_at ?? null,
      removed: p.status === 'removed',
      removedReason: null,
      removable: true,
    });
  })());

  await Promise.all(jobs);
  return found;
}

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-content-reports', limit: 60, permission: 'moderation.view' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const status = str(req.nextUrl.searchParams.get('status'), 20);
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 300, 1), 800);

    let query = ctx.db.from('content_reports')
      .select('id, target_type, target_id, target_owner, reporter_id, reason, note, status, admin_note, admin_label, admin_actioned_at, created_at');
    if (STATUSES.has(status)) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

    if (error) {
      if (isMissingTable(error)) {
        logWarn('admin/content-reports', 'content_reports table missing', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ queue: [], counts: null, available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    const rows = data ?? [];
    const [people, targets] = await Promise.all([
      loadProfiles(ctx.db, [
        ...rows.map((r: any) => r.reporter_id),
        ...rows.map((r: any) => r.target_owner),
      ]),
      loadTargets(ctx.db, rows),
    ]);

    // Grouped by the thing reported, not by the report. Five people objecting
    // to one post is one decision to make, and the count of them is the most
    // useful number on the card — the old screen's "N reports" was invented.
    const groups = new Map<string, any>();
    for (const r of rows) {
      const k = key(r.target_type, r.target_id);
      const target = targets.get(k);
      let g = groups.get(k);
      if (!g) {
        const owner = people.get(target?.ownerId ?? r.target_owner) ?? null;
        g = {
          key: k,
          targetType: r.target_type,
          targetId: r.target_id,
          exists: !!target,
          title: target?.title ?? 'Content no longer exists',
          excerpt: target?.excerpt ?? '',
          image: target?.image ?? null,
          postId: target?.postId ?? null,
          removed: target?.removed ?? false,
          removedReason: target?.removedReason ?? null,
          removable: target?.removable ?? false,
          author: person(owner),
          reports: 0,
          reasons: [] as string[],
          notes: [] as string[],
          reporters: [] as any[],
          reportIds: [] as string[],
          pending: 0,
          status: 'dismissed',
          adminNote: null as string | null,
          adminLabel: null as string | null,
          adminActionedAt: null as string | null,
          firstAt: r.created_at,
          lastAt: r.created_at,
        };
        groups.set(k, g);
      }
      g.reports += 1;
      g.reportIds.push(r.id);
      if (!g.reasons.includes(r.reason)) g.reasons.push(r.reason);
      if (r.note) g.notes.push(r.note);
      const rep = person(people.get(r.reporter_id));
      if (rep && !g.reporters.some((x: any) => x.id === rep.id)) g.reporters.push(rep);
      if (r.status === 'pending') g.pending += 1;
      // A target is open while any report about it is unanswered. Actioned
      // beats dismissed for the rest — if one of these was acted on, the card
      // should not read "dismissed".
      if (r.status === 'actioned' && g.status !== 'pending') g.status = 'actioned';
      if (g.pending) g.status = 'pending';
      if (r.admin_note && !g.adminNote) {
        g.adminNote = r.admin_note;
        g.adminLabel = r.admin_label ?? null;
        g.adminActionedAt = r.admin_actioned_at ?? null;
      }
      if (r.created_at < g.firstAt) g.firstAt = r.created_at;
      if (r.created_at > g.lastAt) g.lastAt = r.created_at;
    }

    const queue = [...groups.values()].sort((a, b) => {
      // Open work first, then the most-reported, then the most recent. A
      // moderator opening this screen should land on the thing that most needs
      // them without sorting anything themselves.
      if ((a.status === 'pending') !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1;
      if (a.reports !== b.reports) return b.reports - a.reports;
      return String(b.lastAt).localeCompare(String(a.lastAt));
    });

    // Counts describe the whole table rather than the page, for the same
    // reason the products route counts separately: a chip reading "3 open"
    // next to a filtered list is answering a different question.
    let counts: any = null;
    const { data: countRows, error: countErr } = await ctx.db.rpc('admin_content_report_counts');
    if (countErr) {
      logWarn('admin/content-reports', 'counts unavailable', { fix: MISSING_MIGRATION, requestId: id, reason: countErr.message });
    } else {
      const c = Array.isArray(countRows) ? countRows[0] : countRows;
      counts = {
        pending: Number(c?.pending_count ?? 0),
        actioned: Number(c?.actioned_count ?? 0),
        dismissed: Number(c?.dismissed_count ?? 0),
        open: Number(c?.open_targets ?? 0),
      };
    }

    return NextResponse.json({
      queue,
      counts,
      available: true,
      canAct: can(ctx.role, 'moderation.act'),
      canSuspend: can(ctx.role, 'users.suspend'),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/content-reports', err, id, 'Could not load the moderation queue.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-content-reports-write', limit: 40, permission: 'moderation.act' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const targetType = str(body?.targetType, 20);
    const targetId = str(body?.targetId, 60);
    const decision = str(body?.decision, 20);
    const note = str(body?.note, 2000);
    const label = str(body?.actorLabel, 80) || 'Admin';

    if (!TARGET_TYPES.has(targetType)) return NextResponse.json({ error: 'Unknown kind of content.' }, { status: 400 });
    if (!isUuid(targetId)) return NextResponse.json({ error: 'Which piece of content?' }, { status: 400 });
    if (!DECISIONS.has(decision)) return NextResponse.json({ error: 'Decide: remove, restore or dismiss.' }, { status: 400 });
    // Taking something down is visible to its author and appealable under
    // migration 043. An appeal reviewer needs to read why it happened, and
    // "no reason given" is not a thing they can weigh.
    if (decision === 'remove' && !note) {
      return NextResponse.json({ error: 'Say why it is being removed — the author can appeal this.' }, { status: 400 });
    }

    // The reports must exist before anything is removed off the back of them.
    const { data: reports, error: readErr } = await ctx.db
      .from('content_reports')
      .select('id, status, target_owner')
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    if (readErr) {
      if (isMissingTable(readErr)) return NextResponse.json({ error: `Reporting is not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      throw readErr;
    }
    if (!reports?.length) return NextResponse.json({ error: 'There are no reports about that.' }, { status: 404 });

    let removedNow: boolean | null = null;
    let title = targetId;
    let ownerId: string | null = reports.find((r: any) => r.target_owner)?.target_owner ?? null;

    if (decision !== 'dismiss') {
      if (targetType === 'profile') {
        return NextResponse.json({
          error: 'An account is not content. Suspend it from the Users screen instead.',
        }, { status: 409 });
      }

      const removing = decision === 'remove';

      if (targetType === 'product') {
        const { data: current, error: prodErr } = await ctx.db
          .from('products').select('id, name, status, seller_id').eq('id', targetId).maybeSingle();
        if (prodErr) throw prodErr;
        if (!current) return NextResponse.json({ error: 'That listing no longer exists.' }, { status: 404 });
        // Same guard as /api/admin/products: restoring is putting it back to
        // live, and a listing the seller had parked is theirs to publish.
        if (!removing && current.status !== 'removed' && current.status !== 'flagged') {
          return NextResponse.json({ error: `The seller has this listing as ${current.status}. Publishing it is theirs to do.` }, { status: 409 });
        }
        const { error: upErr } = await ctx.db.from('products')
          .update({ status: removing ? 'removed' : 'live' }).eq('id', targetId);
        if (upErr) throw upErr;
        title = current.name || targetId;
        ownerId = current.seller_id ?? ownerId;
      } else {
        const table = targetType === 'post' ? 'posts' : 'comments';
        const { data: current, error: cErr } = await ctx.db
          .from(table).select('id, user_id, content, removed_at').eq('id', targetId).maybeSingle();
        if (cErr) {
          if (isMissingTable(cErr)) return NextResponse.json({ error: `Removal is not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
          throw cErr;
        }
        if (!current) return NextResponse.json({ error: 'That content no longer exists.' }, { status: 404 });

        const { error: upErr } = await ctx.db.from(table).update(
          removing
            ? { removed_at: new Date().toISOString(), removed_reason: note, removed_by: ctx.adminId }
            : { removed_at: null, removed_reason: null, removed_by: null },
        ).eq('id', targetId);
        if (upErr) {
          // The columns arrive with 046. Without it the update is silently a
          // no-op through PostgREST, which is the failure mode this whole
          // change exists to stop.
          return NextResponse.json({ error: `Removal is not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
        }
        title = clip(current.content) || targetId;
        ownerId = current.user_id ?? ownerId;
      }

      removedNow = removing;
    }

    // The reports close either way — a restore answers them as surely as a
    // removal does. Only the ones still open are touched, so re-deciding does
    // not rewrite the note on a report someone else already closed.
    const nextStatus = decision === 'dismiss' ? 'dismissed' : 'actioned';
    const { data: closed, error: closeErr } = await ctx.db
      .from('content_reports')
      .update({
        status: nextStatus,
        admin_note: note || null,
        admin_actor: ctx.adminId,
        admin_label: label,
        admin_actioned_at: new Date().toISOString(),
      })
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('status', 'pending')
      .select('id');
    if (closeErr) throw closeErr;

    const { error: auditErr } = await ctx.db.from('admin_audit_log').insert({
      actor_id: ctx.adminId,
      actor_label: label,
      action: decision === 'dismiss'
        ? `Dismissed reports on a ${targetType}`
        : decision === 'remove' ? `Removed a reported ${targetType}` : `Restored a ${targetType}`,
      target: title,
      kind: decision === 'remove' ? 'trash' : decision === 'restore' ? 'check' : 'close',
      meta: {
        targetType, targetId, ownerId,
        decision,
        reports: reports.length,
        closed: closed?.length ?? 0,
        note: note || null,
      },
    });
    if (auditErr) logError('admin/content-reports', 'audit write failed', auditErr, { requestId: id, targetId });

    return NextResponse.json({
      target: { targetType, targetId, status: nextStatus, removed: removedNow, adminNote: note || null, adminLabel: label },
      closed: closed?.length ?? 0,
    });
  } catch (err) {
    return failure('admin/content-reports', err, id, 'Could not action that report.');
  }
}
