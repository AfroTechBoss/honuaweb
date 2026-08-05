import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-role";
import { isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";

// The shop register — every storefront that exists on Honua, and what it has
// actually done.
//
// GET  ?filter=all|trading|dormant|unapproved&search=&limit=
//
// This did not exist. The console could review an *application* and it could
// moderate a *listing*, but there was nowhere to answer "what shops are open,
// who runs them, and are they selling anything" — the entity between the
// paperwork and the catalogue had no page. An approved application vanished
// into the "Approved" tab of a review queue and was never seen as a business
// again.
//
// A shop is not a table. It is an approved seller_applications row, and it is
// also — separately — any profile with listings in `products`. Those two sets
// do not agree, and the disagreement is the interesting part:
//
//   approved, no listings   a shop that was opened and never stocked
//   listings, not approved  a seller trading without an approved application:
//                           seeded catalogue rows, or an application that was
//                           declined or withdrawn after the listings went up
//
// Both are rendered. A register that only counted the paperwork would report a
// tidy platform while unapproved listings sat live on the marketplace.
//
// Read-only on purpose. Everything that acts on a shop already has a home and a
// permission of its own: take listings down under Products (moderation.act),
// suspend the owner under Users (users.suspend), decide the application under
// Sellers (sellers.review). Duplicating those buttons here would mean the same
// act audited under two different names.
//
// Gated on sellers.review — the permission that already means "may look at the
// seller side of the platform". Analysts do not hold it, which is deliberate:
// this page carries payout destinations and legal business names.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/017_seller_applications.sql';

// Above this the per-shop roll-ups stop being a few bulk reads and start being
// a report. The response says when it truncated rather than quietly showing a
// prefix of the platform.
const MAX_SHOPS = 300;
// Bounded separately: one shop with 20k order items should not decide how much
// of everyone else's data fits in the response.
const MAX_ITEMS = 5000;
const MAX_PRODUCTS = 3000;

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';

const day = (v: any) => v ? new Date(v).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

/** Payout destination, named but never detailed — see the reveal RPC in 042. */
const payoutLabel = (m: any) => {
  if (!m) return null;
  const kind = m.kind === 'uglycash' ? 'UglyCash' : m.kind === 'paypal' ? 'PayPal' : m.kind === 'stripe' ? 'Stripe' : 'Bank transfer';
  return { kind, label: m.label || kind, status: m.status ?? 'unverified' };
};

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-shops', limit: 60, permission: 'sellers.review' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const filter = str(req.nextUrl.searchParams.get('filter'), 20) || 'all';
    const search = str(req.nextUrl.searchParams.get('search'), 80).toLowerCase();
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || MAX_SHOPS, 1), MAX_SHOPS);

    // ── 1. The paperwork ────────────────────────────────────────────────────
    const { data: apps, error: appErr } = await ctx.db
      .from('seller_applications')
      .select('id, user_id, shop_name, shop_handle, tagline, logo_url, categories, offering_type, ships_to, country, location, legal_name, biz_type, status, created_at, reviewed_at')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false });

    if (appErr) {
      if (isMissingTable(appErr)) {
        logWarn('admin/shops', 'seller_applications missing', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ shops: [], counts: null, available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw appErr;
    }

    // One shop per owner. A seller who applied twice — declined, revised,
    // approved — has two approved rows only if someone approved both; the most
    // recently reviewed is the one describing the shop as it stands.
    const byOwner = new Map<string, any>();
    for (const a of apps ?? []) {
      if (!a.user_id) continue;
      if (!byOwner.has(a.user_id)) byOwner.set(a.user_id, a);
    }

    // ── 2. The catalogue ────────────────────────────────────────────────────
    const { data: prods, error: prodErr } = await ctx.db
      .from('products')
      .select('id, name, brand, price_cents, image_url, status, seller_id, created_at')
      .not('seller_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(MAX_PRODUCTS);
    // A missing products table is survivable — the register still lists the
    // approved shops, with their stock counts blank rather than zero.
    if (prodErr && !isMissingTable(prodErr)) throw prodErr;

    const products = prods ?? [];
    const catalogueReadable = !prodErr;

    // Every seller with listings is a shop on the marketplace whether or not
    // an application ever cleared.
    for (const p of products) {
      if (p.seller_id && !byOwner.has(p.seller_id)) byOwner.set(p.seller_id, null);
    }

    const ownerIds = [...byOwner.keys()].slice(0, limit);
    const truncated = byOwner.size > ownerIds.length;
    if (!ownerIds.length) {
      return NextResponse.json({ shops: [], counts: { all: 0, trading: 0, dormant: 0, unapproved: 0 }, available: true, truncated: false, catalogueReadable },
        { headers: { 'Cache-Control': 'no-store' } });
    }

    // ── 3. Owners, sales and payout destinations, in bulk ───────────────────
    const [{ data: people }, itemsRes, methodsRes] = await Promise.all([
      ctx.db.from('profiles')
        .select('id, handle, full_name, avatar_url, verified, suspended_until, banned_at, created_at')
        .in('id', ownerIds),
      ctx.db.from('order_items')
        .select('seller_id, price_cents, quantity, status, created_at')
        .in('seller_id', ownerIds)
        .order('created_at', { ascending: false })
        .limit(MAX_ITEMS),
      ctx.db.from('payout_methods')
        .select('seller_id, kind, label, status, is_primary')
        .in('seller_id', ownerIds)
        .eq('is_primary', true),
    ]);

    // Sales and payout destinations are decoration on a register of shops.
    // Losing either should not lose the register — the fields read as unknown.
    const items = itemsRes?.error ? [] : (itemsRes?.data ?? []);
    const salesReadable = !itemsRes?.error;
    const methods = methodsRes?.error ? [] : (methodsRes?.data ?? []);

    const owners = new Map<string, any>();
    for (const p of people ?? []) owners.set(p.id, p);

    const primary = new Map<string, any>();
    for (const m of methods) if (!primary.has(m.seller_id)) primary.set(m.seller_id, m);

    type Roll = { total: number; live: number; flagged: number; removed: number; draft: number; recent: any[] };
    const stock = new Map<string, Roll>();
    for (const p of products) {
      if (!p.seller_id || !byOwner.has(p.seller_id)) continue;
      const r = stock.get(p.seller_id) ?? { total: 0, live: 0, flagged: 0, removed: 0, draft: 0, recent: [] };
      r.total += 1;
      if (p.status === 'live') r.live += 1;
      else if (p.status === 'flagged') r.flagged += 1;
      else if (p.status === 'removed') r.removed += 1;
      else r.draft += 1;
      // Ordered newest-first by the query, so the first few are the latest.
      if (r.recent.length < 6) r.recent.push({ id: p.id, name: p.name || 'Untitled listing', price: (p.price_cents ?? 0) / 100, status: p.status ?? 'live', image: p.image_url ?? null });
      stock.set(p.seller_id, r);
    }

    type Sales = { orders: number; units: number; grossCents: number; cancelled: number; lastAt: string | null };
    const sales = new Map<string, Sales>();
    for (const it of items) {
      const s = sales.get(it.seller_id) ?? { orders: 0, units: 0, grossCents: 0, cancelled: 0, lastAt: null };
      if (it.status === 'cancelled') {
        s.cancelled += 1;
      } else {
        // Cancelled lines are counted apart rather than folded in. Gross that
        // silently includes refunded orders is the number every payout dispute
        // starts from.
        s.orders += 1;
        s.units += it.quantity ?? 1;
        s.grossCents += (it.price_cents ?? 0) * (it.quantity ?? 1);
        if (!s.lastAt || (it.created_at && it.created_at > s.lastAt)) s.lastAt = it.created_at;
      }
      sales.set(it.seller_id, s);
    }

    // ── 4. Shape ────────────────────────────────────────────────────────────
    const shops = ownerIds.map(uid => {
      const a = byOwner.get(uid);
      const who = owners.get(uid);
      const st = stock.get(uid) ?? { total: 0, live: 0, flagged: 0, removed: 0, draft: 0, recent: [] };
      const sl = sales.get(uid) ?? { orders: 0, units: 0, grossCents: 0, cancelled: 0, lastAt: null };
      // Unapproved shops have no application to name them, so the listings do:
      // `brand` is what those rows carry instead of a shop.
      const brand = products.find((p: any) => p.seller_id === uid && p.brand)?.brand ?? null;

      return {
        ownerId: uid,
        applicationId: a?.id ?? null,
        approved: !!a,
        name: a?.shop_name || brand || who?.full_name || who?.handle || 'Untitled shop',
        shopHandle: a?.shop_handle ?? null,
        tagline: a?.tagline ?? null,
        logo: a?.logo_url ?? null,
        categories: Array.isArray(a?.categories) ? a.categories.filter((c: any) => typeof c === 'string') : [],
        type: a?.offering_type ?? null,
        country: a?.country || a?.location || null,
        shipsTo: a?.ships_to ?? null,
        legalName: a?.legal_name ?? null,
        bizType: a?.biz_type ?? null,
        openedAt: a?.reviewed_at ?? a?.created_at ?? null,
        opened: day(a?.reviewed_at ?? a?.created_at),

        owner: who?.full_name ?? who?.handle ?? 'Unknown member',
        handle: who?.handle ?? null,
        avatar: who?.avatar_url ?? null,
        verified: who?.verified === true,
        ownerStatus: who?.banned_at ? 'banned'
          : (who?.suspended_until && new Date(who.suspended_until).getTime() > Date.now()) ? 'suspended'
          : 'active',

        products: catalogueReadable ? st.total : null,
        live: catalogueReadable ? st.live : null,
        flagged: catalogueReadable ? st.flagged : null,
        removed: catalogueReadable ? st.removed : null,
        unlisted: catalogueReadable ? st.draft : null,
        recent: st.recent,

        orders: salesReadable ? sl.orders : null,
        units: salesReadable ? sl.units : null,
        gross: salesReadable ? sl.grossCents / 100 : null,
        cancelled: salesReadable ? sl.cancelled : null,
        lastSale: day(sl.lastAt),
        lastSaleAt: sl.lastAt,

        payout: payoutLabel(primary.get(uid)),
      };
    });

    const counts = {
      all: shops.length,
      trading: shops.filter(s => (s.orders ?? 0) > 0).length,
      // Dormant means open and doing nothing: no listing anyone can buy and no
      // sale on record. It is the shape of a shop that was approved and then
      // abandoned, which is worth being able to see.
      dormant: shops.filter(s => s.approved && !s.live && !s.orders).length,
      unapproved: shops.filter(s => !s.approved).length,
    };

    let visible = shops;
    if (filter === 'trading') visible = visible.filter(s => (s.orders ?? 0) > 0);
    else if (filter === 'dormant') visible = visible.filter(s => s.approved && !s.live && !s.orders);
    else if (filter === 'unapproved') visible = visible.filter(s => !s.approved);
    if (search) {
      visible = visible.filter(s =>
        s.name.toLowerCase().includes(search)
        || (s.handle ?? '').toLowerCase().includes(search)
        || (s.shopHandle ?? '').toLowerCase().includes(search)
        || s.owner.toLowerCase().includes(search));
    }

    // Busiest first — a register sorted by revenue answers "who matters here"
    // before you have read a single row.
    visible.sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0) || (b.live ?? 0) - (a.live ?? 0) || a.name.localeCompare(b.name));

    return NextResponse.json({
      shops: visible,
      counts,
      available: true,
      truncated,
      catalogueReadable,
      salesReadable,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/shops', err, id, 'Could not load the shop register.');
  }
}
