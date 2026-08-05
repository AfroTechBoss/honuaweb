import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, can } from "@/lib/admin-role";
import { isMissingTable } from "@/lib/pg-errors";
import { logError, logWarn, requestId, failure } from "@/lib/observability";

// Listing moderation — the platform-wide product catalogue.
//
// GET    ?status=&search=&limit=      the catalogue
// PATCH  { id, status, reason? }      flag / remove / restore
//
// The panel behind this was pure mock: MOCK_ADMIN.products in React state, and
// "Remove" was a setState. Nothing was ever taken off the marketplace.
//
// Taking a listing down is real here because of migration 014's select policy —
// products are visible to the public only while status = 'live', so writing
// 'removed' is what actually pulls it from the shop. That policy is also why
// this cannot run from the browser: the console's Privy session leaves
// auth.uid() null, so the admin policy on products matches nothing and an
// update would touch zero rows while reporting success.
//
// Gated on moderation.view / moderation.act rather than a permission of its
// own: taking down a listing is the same act as taking down a post, and giving
// it a separate key would mean a moderator who can remove content except this
// content.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/014_marketplace.sql';

// What a listing can be. 'draft' and 'inactive' are the seller's own words for
// it (see DASH_TO_DB_STATUS in lib/market) and are readable here but not
// settable — an admin taking a shop's listing down should say so as a removal,
// not disguise it as the seller's draft.
const READ_STATUSES = new Set(['live', 'flagged', 'removed', 'draft', 'inactive']);
const WRITE_STATUSES = new Set(['live', 'flagged', 'removed']);

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';

const COLUMNS = 'id, name, brand, price_cents, compare_at_cents, category, tag, image_url, status, featured, stock, low_stock_at, product_type, rating, review_count, seller_id, created_at';

const shape = (p: any, seller: any) => ({
  id: p.id,
  title: p.name || 'Untitled listing',
  price: (p.price_cents ?? 0) / 100,
  category: p.category || '—',
  tag: p.tag ?? null,
  image: p.image_url ?? null,
  status: READ_STATUSES.has(p.status) ? p.status : 'live',
  featured: p.featured === true,
  stock: p.stock ?? null,
  type: p.product_type || 'physical',
  rating: Number(p.rating ?? 0),
  reviews: Number(p.review_count ?? 0),
  // The shop name as the seller set it, falling back to `brand` — which is what
  // the catalogue seed rows have instead of a seller.
  seller: seller?.full_name ?? seller?.handle ?? p.brand ?? 'Platform',
  sellerId: p.seller_id ?? null,
  sellerHandle: seller?.handle ?? null,
  sellerAvatar: seller?.avatar_url ?? null,
  listed: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
  createdAt: p.created_at ?? null,
});

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-products', limit: 60, permission: 'moderation.view' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const wanted = str(req.nextUrl.searchParams.get('status'), 20);
    const search = str(req.nextUrl.searchParams.get('search'), 80);
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 200, 1), 500);

    let query = ctx.db.from('products').select(COLUMNS);
    if (READ_STATUSES.has(wanted)) query = query.eq('status', wanted);
    // Searched in SQL rather than filtered in the browser: the panel only ever
    // holds a page of the catalogue, so filtering what arrived would search the
    // first 200 listings and call the rest absent.
    if (search) {
      const safe = search.replace(/[%,()]/g, ' ');
      query = query.or(`name.ilike.%${safe}%,brand.ilike.%${safe}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

    if (error) {
      if (isMissingTable(error)) {
        logWarn('admin/products', 'products table missing', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ products: [], counts: null, available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    const rows = data ?? [];
    const sellers = new Map<string, any>();
    const ids = [...new Set(rows.map((r: any) => r.seller_id).filter(Boolean))];
    if (ids.length) {
      const { data: people } = await ctx.db.from('profiles').select('id, handle, full_name, avatar_url').in('id', ids);
      for (const p of people ?? []) sellers.set(p.id, p);
    }

    // Counts for the tabs, read separately so they describe the catalogue
    // rather than the page — a filter that says "3 flagged" while showing 200
    // live listings is answering a different question than the one asked.
    const counts: Record<string, number> = { all: 0, live: 0, flagged: 0, removed: 0 };
    await Promise.all([
      (async () => {
        const { count } = await ctx.db.from('products').select('id', { count: 'exact', head: true });
        counts.all = count ?? 0;
      })(),
      ...['live', 'flagged', 'removed'].map(async s => {
        const { count } = await ctx.db.from('products').select('id', { count: 'exact', head: true }).eq('status', s);
        counts[s] = count ?? 0;
      }),
    ]);

    return NextResponse.json({
      products: rows.map((r: any) => shape(r, sellers.get(r.seller_id))),
      counts,
      available: true,
      canAct: can(ctx.role, 'moderation.act'),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/products', err, id, 'Could not load the catalogue.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-products-write', limit: 40, permission: 'moderation.act' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const target = str(body?.id, 60);
    const status = str(body?.status, 20);
    const reason = str(body?.reason, 500);

    if (!target) return NextResponse.json({ error: 'Which listing?' }, { status: 400 });
    if (!WRITE_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Status must be live, flagged or removed.' }, { status: 400 });
    }

    const { data: current, error: readErr } = await ctx.db
      .from('products').select('id, name, status, seller_id').eq('id', target).maybeSingle();
    if (readErr) {
      if (isMissingTable(readErr)) return NextResponse.json({ error: `The catalogue is not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      throw readErr;
    }
    if (!current) return NextResponse.json({ error: 'No such listing.' }, { status: 404 });

    // Restoring a listing the seller had put away themselves would republish
    // something they chose to take down. Their own statuses are left alone.
    if (status === 'live' && (current.status === 'draft' || current.status === 'inactive')) {
      return NextResponse.json({ error: `The seller has this listing as ${current.status}. Publishing it is theirs to do.` }, { status: 409 });
    }

    const { data, error } = await ctx.db
      .from('products').update({ status }).eq('id', target).select(COLUMNS).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'That listing could not be updated.' }, { status: 409 });

    let seller: any = null;
    if (data.seller_id) {
      const { data: p } = await ctx.db.from('profiles').select('id, handle, full_name, avatar_url').eq('id', data.seller_id).maybeSingle();
      seller = p;
    }

    const { error: auditErr } = await ctx.db.from('admin_audit_log').insert({
      actor_id: ctx.adminId,
      actor_label: str(body?.actorLabel, 80) || 'Admin',
      action: status === 'removed' ? 'Removed a listing' : status === 'flagged' ? 'Flagged a listing' : 'Restored a listing',
      target: current.name || target,
      kind: status === 'removed' ? 'trash' : status === 'flagged' ? 'flame' : 'check',
      meta: { productId: target, from: current.status, to: status, sellerId: current.seller_id, reason: reason || null },
    });
    if (auditErr) logError('admin/products', 'audit write failed', auditErr, { requestId: id, productId: target });

    return NextResponse.json({ product: shape(data, seller) });
  } catch (err) {
    return failure('admin/products', err, id, 'Could not update that listing.');
  }
}
