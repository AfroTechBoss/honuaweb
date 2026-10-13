import { supabase } from "@/lib/supabase";
import { dispatchFor } from "@/lib/payout-methods";

// ---------------------------------------------------------------------------
// Marketplace / orders / carbon / map data layer.
// Every getter fails soft (returns [] / null) so screens can fall back to
// their demo data when a migration hasn't been run yet.
// ---------------------------------------------------------------------------

const cents = (c: number) => `$${(c / 100) % 1 === 0 ? (c / 100).toFixed(0) : (c / 100).toFixed(2)}`;

// ---- Products ----
export type Product = {
  id: string; name: string; brand: string; price: string; price_cents: number;
  tag: string; category: string; imgUrl: string | null; description: string | null;
  rating: number; review_count: number; featured: boolean; compare_at_cents: number | null;
  // real seller identity (null for the seeded demo catalogue)
  sellerId: string | null; sellerHandle: string | null; sellerName: string | null;
  sellerLogo: string | null; sellerShopHandle: string | null; sellerShopName: string | null;
};

function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    price: cents(row.price_cents),
    price_cents: row.price_cents,
    tag: row.tag ?? '',
    category: row.category ?? 'Home',
    imgUrl: row.image_url ?? null,
    description: row.description ?? null,
    // No reviews yet → 0 stars (don't show a default rating on unreviewed items)
    rating: (row.review_count ?? 0) > 0 ? Number(row.rating ?? 0) : 0,
    review_count: row.review_count ?? 0,
    featured: !!row.featured,
    compare_at_cents: row.compare_at_cents ?? null,
    sellerId: row.seller_id ?? null,
    sellerHandle: row.seller?.handle ?? null,
    sellerName: row.seller?.full_name ?? null,
    sellerLogo: null,        // filled in by attachShopInfo
    sellerShopHandle: null,
    sellerShopName: null,
  };
}

// Join the seller's real profile so products carry a messageable handle
const PRODUCT_SELECT = '*, seller:profiles!products_seller_id_fkey(handle, full_name)';

// Attach each product's shop identity (logo, shop handle, shop name) from
// seller_applications in one batched query.
async function attachShopInfo(products: Product[]): Promise<Product[]> {
  const ids = [...new Set(products.map(p => p.sellerId).filter(Boolean))] as string[];
  if (!ids.length) return products;
  try {
    const { data } = await supabase
      .from('seller_applications')
      .select('user_id, logo_url, shop_handle, shop_name, created_at')
      .in('user_id', ids)
      .order('created_at', { ascending: false });
    const byOwner: Record<string, any> = {};
    for (const r of data ?? []) if (!byOwner[r.user_id]) byOwner[r.user_id] = r; // latest per owner
    return products.map(p => {
      const s = p.sellerId ? byOwner[p.sellerId] : null;
      return s ? { ...p, sellerLogo: s.logo_url ?? null, sellerShopHandle: s.shop_handle ?? null, sellerShopName: s.shop_name ?? null } : p;
    });
  } catch { return products; }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'live')
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    // Ignore junk rows from any leftover pre-migration table
    const products = data.filter((r: any) => r.name && r.price_cents != null).map(mapProduct);
    return attachShopInfo(products);
  } catch { return []; }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
    if (error || !data) return null;
    const [product] = await attachShopInfo([mapProduct(data)]);
    return product;
  } catch { return null; }
}

// ---- Storefront (public shop page) ----
export type Storefront = {
  ownerId: string; name: string; handle: string; logo: string | null;
  tagline: string | null; location: string | null; products: Product[];
};

export async function getStorefront(shopHandle: string): Promise<Storefront | null> {
  try {
    const { data: shop } = await supabase
      .from('seller_applications')
      .select('user_id, shop_name, shop_handle, logo_url, tagline, location, created_at')
      .eq('shop_handle', shopHandle)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!shop) return null;
    const { data: prodData } = await supabase
      .from('products').select(PRODUCT_SELECT)
      .eq('seller_id', shop.user_id).eq('status', 'live')
      .order('created_at', { ascending: false });
    const products = await attachShopInfo((prodData ?? []).filter((r: any) => r.name && r.price_cents != null).map(mapProduct));
    return {
      ownerId: shop.user_id,
      name: shop.shop_name,
      handle: shop.shop_handle,
      logo: shop.logo_url ?? null,
      tagline: shop.tagline ?? null,
      location: shop.location ?? null,
      products,
    };
  } catch { return null; }
}

// ---- Seller product management (dashboard shape <-> DB shape) ----
const DASH_TO_DB_STATUS: Record<string, string> = { active: 'live', draft: 'draft', inactive: 'inactive' };
const DB_TO_DASH_STATUS: Record<string, string> = { live: 'active', draft: 'draft', inactive: 'inactive', flagged: 'active', removed: 'inactive' };

export async function getMyProducts(sellerId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      title: r.name,
      price: (r.price_cents ?? 0) / 100,
      category: r.category ?? 'Home & Garden',
      type: r.product_type ?? 'physical',
      status: DB_TO_DASH_STATUS[r.status] ?? 'active',
      stock: r.stock,
      threshold: r.low_stock_at,
      views: 0, likes: 0,
      sales: 0, // real per-product sales are merged in from order_items by the dashboard
      img: r.name,
      imgUrl: r.image_url,
      tag: r.tag ?? 'Plastic-free',
    }));
  } catch { return []; }
}

export async function saveSellerProduct(sellerId: string, shopName: string, f: any): Promise<boolean> {
  const row: any = {
    name: f.title,
    brand: shopName,
    price_cents: Math.round((parseFloat(f.price) || 0) * 100),
    category: f.category ?? null,
    product_type: f.type ?? 'physical',
    status: DASH_TO_DB_STATUS[f.status] ?? 'live',
    stock: f.type === 'physical' ? (f.stock ?? null) : null,
    low_stock_at: f.type === 'physical' ? (f.threshold ?? null) : null,
    tag: f.tag ?? null,
    ...(f.imgUrl ? { image_url: f.imgUrl } : {}),
    seller_id: sellerId,
  };
  try {
    if (f.id && /^[0-9a-f-]{36}$/.test(String(f.id))) {
      const { error } = await supabase.from('products').update(row).eq('id', f.id).eq('seller_id', sellerId);
      return !error;
    }
    const { error } = await supabase.from('products').insert(row);
    return !error;
  } catch { return false; }
}

export async function deleteSellerProduct(id: string, sellerId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id).eq('seller_id', sellerId);
    return !error;
  } catch { return false; }
}

// ---- Orders ----
// There is deliberately no client-side "create order" here. Orders are priced
// by /api/checkout and written by the Stripe webhook once the payment clears
// (migration 048); the browser has no insert rights on orders or order_items.

// ---- Seller-side orders (line items sold by this seller) ----
export async function getSellerOrders(sellerId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select('*, buyer:profiles!order_items_buyer_id_fkey(full_name, handle)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error || !data) return [];
    const rel = (ts: string) => {
      const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
      if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
      if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
      return `${Math.floor(s / 86400)}d ago`;
    };
    return data.map((r: any) => ({
      id: r.id,                                       // item id (used to advance)
      orderNo: r.order_id,                            // shown in the table
      productId: r.product_id,
      createdAt: r.created_at,
      product: r.name,
      buyer: r.buyer?.full_name ?? 'A member',
      handle: r.buyer?.handle ?? '—',
      qty: r.quantity ?? 1,
      total: ((r.price_cents ?? 0) * (r.quantity ?? 1)) / 100,
      status: r.status ?? 'processing',
      // Since 048, line items are only ever written by the webhook after a
      // payment clears, so a seller-visible item is a paid one.
      payment: 'paid',
      date: r.created_at ? rel(r.created_at) : '',
      dateFull: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      _db: true,
    }));
  } catch { return []; }
}

export async function advanceOrderItem(itemId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('order_items').update({ status }).eq('id', itemId);
    return !error;
  } catch { return false; }
}

// ---- Payouts ----
export const SALE_FEE = 0.05;        // platform fee on each sale
export const WITHDRAWAL_FEE = 0.02;  // fee withheld from each withdrawal

export type SellerBalance = {
  earned: number;       // delivered sales, after sale fee — lifetime
  pendingClear: number; // sold but not yet delivered (gross)
  reserved: number;     // already requested/approved payouts (gross)
  available: number;    // earned - reserved, floored at 0
};

// Computed from the seller's own order_items + payout_requests (both readable
// under their RLS policies). Delivered items clear; pending/approved payouts
// reduce what's left to withdraw.
export async function getSellerBalance(sellerId: string): Promise<SellerBalance> {
  const empty = { earned: 0, pendingClear: 0, reserved: 0, available: 0 };
  try {
    const [{ data: items }, { data: payouts }] = await Promise.all([
      supabase.from('order_items').select('price_cents, quantity, status').eq('seller_id', sellerId),
      supabase.from('payout_requests').select('amount_cents, status').eq('seller_id', sellerId),
    ]);
    let deliveredCents = 0, pendingCents = 0;
    for (const it of items ?? []) {
      if (it.status === 'cancelled') continue;
      const line = (it.price_cents ?? 0) * (it.quantity ?? 1);
      if (it.status === 'delivered') deliveredCents += line;
      else pendingCents += line;
    }
    const earned = (deliveredCents * (1 - SALE_FEE)) / 100;
    const reserved = (payouts ?? [])
      .filter((p: any) => p.status === 'pending' || p.status === 'approved')
      .reduce((s: number, p: any) => s + (p.amount_cents ?? 0), 0) / 100;
    return {
      earned,
      pendingClear: pendingCents / 100,
      reserved,
      available: Math.max(0, earned - reserved),
    };
  } catch { return empty; }
}

export async function getMyPayouts(sellerId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('payout_requests').select('*').eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapPayout);
  } catch { return []; }
}

function relTime(ts: string): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function mapPayout(r: any) {
  return {
    id: r.id,
    amount: (r.amount_cents ?? 0) / 100,
    net: (r.net_cents ?? 0) / 100,
    fee: (r.fee_cents ?? 0) / 100,
    // destination_label is the snapshot taken when the request was made;
    // `destination` is the pre-042 free-text column, kept in step for rows
    // written since. Older rows fall through to the honest third option.
    destination: r.destination_label ?? r.destination ?? 'No method connected',
    requestedAt: relTime(r.created_at),
    status: r.status ?? 'pending',
    rejectReason: r.reject_reason ?? undefined,
    paidAt: r.paid_at ?? undefined,
    paymentReference: r.payment_reference ?? undefined,
    sellerId: r.seller_id,
    _db: true,
  };
}

/**
 * Requests a withdrawal to a connected payout method.
 *
 * `method` is required, and is where this differs from the version it replaces.
 * That one took a free-text `destination` string, and both call sites in the
 * seller dashboard passed the literal 'Default payout method' — so every payout
 * row on the platform named a destination that did not exist and could not be
 * paid to, and the admin console rendered that string next to an Approve button.
 *
 * The label is snapshotted alongside the id: migration 042's FK is
 * `on delete set null` so a seller may retire a method, and a payout that was
 * already sent must still say where it went.
 */
export async function requestPayout(
  sellerId: string,
  amount: number,
  method: { id: string; label: string; kind: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!method?.id) return { ok: false, error: 'Connect a payout method first.' };
    const amountCents = Math.round(amount * 100);
    const feeCents = Math.round(amountCents * WITHDRAWAL_FEE);
    const { error } = await supabase.from('payout_requests').insert({
      seller_id: sellerId,
      amount_cents: amountCents,
      fee_cents: feeCents,
      net_cents: amountCents - feeCents,
      method_id: method.id,
      destination_label: method.label,
      // Records which kinds are *meant* to settle through an API. Nothing in
      // this codebase settles automatically yet — see lib/payout-methods.ts.
      dispatch: dispatchFor(method.kind),
      // Kept in step with destination_label for the pre-042 column, so an older
      // query reading `destination` sees the same thing the queue does.
      destination: method.label,
      status: 'pending',
    });
    if (error) {
      // 041's freeze reaches payout_requests, so a suspended seller's insert is
      // refused by RLS with no rows and no obvious cause. Naming it beats
      // "Could not submit request".
      if (error.code === '42501') {
        return { ok: false, error: 'Withdrawals are paused while your account is restricted. You can appeal at /appeal.' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch { return { ok: false, error: 'Could not reach the server.' }; }
}


// The admin queue and the admin review used to live here, as browser queries.
// They are gone rather than deprecated, because leaving them importable is how
// the next screen ends up calling them again.
//
// Both were unreachable in practice. Migration 022 gave payout_requests two
// admin RLS policies keyed on `auth.uid()`, and the console signs in with Privy
// — it has no Supabase session at all, so auth.uid() is null and neither policy
// has ever matched a row. getPendingPayouts() returned an empty array on a table
// with payouts in it, and reviewPayout() sent an UPDATE that changed nothing and
// reported success, because PostgREST does not treat "matched no rows" as an
// error.
//
// The replacements are listPayouts / reviewPayout / markPayoutPaid in
// lib/admin-payouts.ts, which go through /api/admin/payouts — service-role,
// gated on `payouts.manage`, and with a balance guard the browser could never
// have enforced.

export async function getDbOrders(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    // Normalize to the shape the orders screen already uses (localStorage orders)
    return data.map((o: any) => ({
      id: o.id,
      items: o.items ?? [],
      subtotal: (o.subtotal_cents ?? 0) / 100,
      shipping: (o.shipping_cents ?? 0) / 100,
      total: (o.total_cents ?? 0) / 100,
      email: o.email,
      address: o.address,
      status: o.status ?? 'processing',
      paymentStatus: o.payment_status ?? null,
      date: o.created_at,
      createdAt: o.created_at,
      _db: true,
    }));
  } catch { return []; }
}

// ---- Carbon credits ----
export type CarbonCredit = {
  id: string; name: string; region: string; type: string; verifier: string;
  vintage: string; price: string; price_cents: number; volume: string; volume_t: number;
  tag: string; color: string;
};

export async function getCarbonCredits(): Promise<CarbonCredit[]> {
  try {
    const { data, error } = await supabase
      .from('carbon_credits')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      region: c.region ?? '',
      type: c.type ?? '',
      verifier: c.verifier ?? '',
      vintage: c.vintage ?? '',
      price: cents(c.price_cents),
      price_cents: c.price_cents,
      volume: `${Number(c.volume_t ?? 0).toLocaleString()} tCO₂`,
      volume_t: Number(c.volume_t ?? 0),
      tag: c.tag ?? 'Verified',
      color: c.tag === 'Removal' ? 'var(--sky)' : c.tag === 'Premium' ? 'var(--green)' : 'var(--green-2)',
    }));
  } catch { return []; }
}

/** One retirement, as the database recorded it — not as the browser proposed it. */
export type Retirement = {
  id: string;
  serial: string;
  creditName: string;
  tonnes: number;
  unitCents: number;
  totalCents: number;
  retiredAt: string;
  paymentState: 'unpaid' | 'paid' | 'refunded';
};

// Retiring tonnes is a paid checkout (migration 049, /api/carbon/checkout).
// The browser names a credit and a tonnage; the server prices it and opens a
// PaymentIntent; the Stripe webhook retires the tonnes once that exact amount
// is captured. Nothing here writes a retirement.

export type CarbonQuote = {
  clientSecret: string;
  checkoutId: string;
  creditName: string;
  tonnes: number;
  unitCents: number;
  totalCents: number;
};

export type CarbonStart =
  | { kind: 'ready'; quote: CarbonQuote }
  | { kind: 'signed-out' }
  | { kind: 'unavailable' }
  | { kind: 'rejected'; message: string };

async function authHeader(): Promise<Record<string, string>> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function startCarbonCheckout(creditId: string, tonnes: number): Promise<CarbonStart> {
  try {
    const res = await fetch('/api/carbon/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ creditId, tonnes }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.clientSecret) return { kind: 'ready', quote: data };
    if (res.status === 401) return { kind: 'signed-out' };
    // Payments not configured, or 049 not applied — say so rather than
    // reporting a failed retirement.
    if (data.error === 'stripe_not_configured' || data.error === 'checkout_unavailable') return { kind: 'unavailable' };
    return { kind: 'rejected', message: data.message || 'That retirement was refused.' };
  } catch {
    return { kind: 'rejected', message: 'Could not reach the server.' };
  }
}

export type CarbonSettled =
  | { kind: 'retired'; retirement: Retirement }
  | { kind: 'rejected'; message: string }
  | { kind: 'pending' };

// Waits for the webhook to retire a paid checkout. It usually lands within a
// couple of seconds; 'pending' means the money went through but the webhook
// has not caught up yet, and the retirement will appear on its own.
export async function waitForRetirement(checkoutId: string, timeoutMs = 20_000): Promise<CarbonSettled> {
  const until = Date.now() + timeoutMs;
  const headers = await authHeader();
  while (Date.now() < until) {
    try {
      const res = await fetch(`/api/carbon/checkout?id=${encodeURIComponent(checkoutId)}`, { headers, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'finalized' && data.retirement) return { kind: 'retired', retirement: data.retirement };
      if (data.status === 'rejected') return { kind: 'rejected', message: data.reason || 'That retirement was refused.' };
    } catch { /* keep waiting */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  return { kind: 'pending' };
}

// Only paid retirements count. Rows from before 049 were never charged for
// and stay in the table as 'unpaid', but they are not offsets.
export async function getMyOffsets(userId: string): Promise<{ tonnes: number; totalCents: number; purchases: any[] }> {
  try {
    const { data, error } = await supabase
      .from('carbon_purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('payment_state', 'paid')
      .order('created_at', { ascending: false });
    if (error || !data) return { tonnes: 0, totalCents: 0, purchases: [] };
    return {
      tonnes: data.reduce((s: number, p: any) => s + Number(p.tonnes ?? 0), 0),
      totalCents: data.reduce((s: number, p: any) => s + (p.total_cents ?? 0), 0),
      purchases: data,
    };
  } catch { return { tonnes: 0, totalCents: 0, purchases: [] }; }
}

// ---- Map projects ----
export async function getMapProjects(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .not('lat', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id,
      t: p.title,
      cat: p.category ?? 'Cleanup',
      when: p.when_label || (p.starts_at ? new Date(p.starts_at).toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Anytime'),
      host: p.host_name ?? 'A Honua member',
      going: p.going_count ?? 0,
      lat: p.lat,
      lng: p.lng,
      locationName: p.location_name,
      description: p.description,
      _db: true,
    }));
  } catch { return []; }
}

export async function createMapProject(userId: string, fields: {
  title: string; category: string; startsAt?: string; locationName?: string;
  description?: string; hostName?: string; lat?: number | null; lng?: number | null;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('projects').insert({
      user_id: userId,
      title: fields.title,
      category: fields.category,
      starts_at: fields.startsAt || null,
      location_name: fields.locationName || null,
      description: fields.description || null,
      host_name: fields.hostName || null,
      lat: fields.lat ?? null,
      lng: fields.lng ?? null,
    });
    return !error;
  } catch { return false; }
}

export async function getMyRsvps(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('project_rsvps').select('project_id').eq('user_id', userId);
    if (error || !data) return [];
    return data.map((r: any) => r.project_id);
  } catch { return []; }
}

export async function toggleRsvp(userId: string, projectId: string, going: boolean): Promise<boolean> {
  try {
    if (going) {
      const { error } = await supabase.from('project_rsvps').delete().match({ user_id: userId, project_id: projectId });
      return !error;
    }
    const { error } = await supabase.from('project_rsvps').insert({ user_id: userId, project_id: projectId });
    return !error;
  } catch { return false; }
}

// ---- Seller applications ----

/**
 * The outcome of trying to file an application, in words the wizard can show.
 *
 * This used to be a bare boolean that every caller threw away, and the cost of
 * that was a real bug: the wizard flipped the local status to `pending`, said
 * "Application submitted", and never checked whether a row had actually been
 * written. When the insert failed there was nothing on file, nothing in the
 * admin queue, and — once the browser's cached state was gone — the seller was
 * asked to apply all over again with no explanation.
 *
 * A string discriminant rather than a boolean one: tsconfig has `strict: false`,
 * so TypeScript does not narrow a union on `ok: true | false`. See lib/paypal.
 */
export type ApplicationSubmit =
  | { state: 'saved' }
  | { state: 'failed'; message: string };

export async function submitSellerApplication(userId: string, f: any): Promise<ApplicationSubmit> {
  try {
    const row: any = {
      user_id: userId,
      shop_name: f.name,
      shop_handle: f.handle || f.name?.toLowerCase().replace(/[^a-z0-9]+/g, ''),
      tagline: f.tagline || null,
      location: f.location || null,
      categories: f.categories ?? [],
      offering_type: (f.types ?? []).join(', ') || 'Physical goods',
      ships_to: f.shipsTo || null,
      practices: f.practices ?? [],
      certs: f.certs ?? [],
      impact_story: f.impact || null,
      legal_name: f.legalName || null,
      biz_type: f.bizType || null,
      country: f.country || null,
      payout_method: f.payout || null,
      payout_schedule: f.schedule || null,
      logo_url: f.logo_url || null,
    };
    let { error } = await supabase.from('seller_applications').insert(row);
    if (error) {
      // logo_url column may not exist yet (migration 025 not run) — retry without
      const { logo_url: _l, ...noLogo } = row;
      ({ error } = await supabase.from('seller_applications').insert(noLogo));
    }
    if (!error) return { state: 'saved' };

    // Read back before believing the error. PostgREST reports a write it cannot
    // then SELECT as an RLS failure even when the INSERT itself landed, so a row
    // that exists must not be reported as a lost application.
    const check = await getMySellerApplication(userId);
    if (check) return { state: 'saved' };

    // 42501 is the only one worth translating: it means RLS refused, which on
    // this table means there is no Supabase session behind the request. The
    // rest are passed through — a message from Postgres beats a shrug.
    const message = (error as any)?.code === '42501'
      ? 'You appear to be signed out. Sign in again and resubmit — nothing was saved.'
      : (error.message || 'The application could not be saved.');
    return { state: 'failed', message };
  } catch (err: any) {
    return { state: 'failed', message: err?.message || 'The application could not be saved.' };
  }
}

// A seller's shop identity (name + logo + handle) for shop-branded
// conversations and storefront links. Cached per owner id for the session.
const _shopCache: Record<string, { name: string; logo: string | null; handle: string | null } | null> = {};
export async function getShopForOwner(ownerId: string): Promise<{ name: string; logo: string | null; handle: string | null } | null> {
  if (ownerId in _shopCache) return _shopCache[ownerId];
  try {
    const { data } = await supabase
      .from('seller_applications')
      .select('shop_name, shop_handle, logo_url, status, created_at')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const shop = data?.shop_name ? { name: data.shop_name, logo: data.logo_url ?? null, handle: data.shop_handle ?? null } : null;
    _shopCache[ownerId] = shop;
    return shop;
  } catch { return null; }
}

// ---- Shop conversations (seller dashboard Messages tab) ----
// Conversations where this seller is the shop owner, i.e. customer inquiries
// about their store — distinct from their personal DMs.
export async function getShopConversations(sellerId: string): Promise<any[]> {
  try {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        buyer1:profiles!user1_id(id, handle, full_name, avatar_url, verified),
        buyer2:profiles!user2_id(id, handle, full_name, avatar_url, verified),
        last_msg:messages(content, created_at, sender_id)
      `)
      .eq('shop_owner_id', sellerId)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    return (data ?? []).map((c: any) => {
      // The customer is whichever participant isn't the seller
      const customer = c.user1_id === sellerId ? c.buyer2 : c.buyer1;
      const lastArr = Array.isArray(c.last_msg) ? c.last_msg : (c.last_msg ? [c.last_msg] : []);
      return {
        id: c.id,
        status: c.status,
        customer,
        lastMsg: lastArr[lastArr.length - 1] ?? null,
      };
    });
  } catch { return []; }
}

/**
 * The three answers the seller screen has to tell apart, and used to collapse
 * into one `null`.
 *
 * `none` means the table has no application for this account — the screen should
 * offer to apply. `error` means we could not find out, which is not the same
 * thing at all: showing "apply to sell" to someone whose application is sitting
 * in the review queue is the bug this type exists to prevent.
 */
export type MySellerApplication =
  | { state: 'found'; app: any }
  | { state: 'none' }
  | { state: 'error' };

export async function loadMySellerApplication(userId: string): Promise<MySellerApplication> {
  try {
    const { data, error } = await supabase
      .from('seller_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { state: 'error' };
    return data ? { state: 'found', app: data } : { state: 'none' };
  } catch { return { state: 'error' }; }
}

/** Kept for callers that only want the row. Prefer loadMySellerApplication. */
export async function getMySellerApplication(userId: string): Promise<any | null> {
  const r = await loadMySellerApplication(userId);
  return r.state === 'found' ? r.app : null;
}

export async function getPendingSellerApplications(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('seller_applications')
      .select('*, profile:profiles!seller_applications_user_id_fkey(id, handle, full_name, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data;
  } catch { return []; }
}

export async function reviewSellerApplication(id: string, decision: 'approved' | 'rejected', notes?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('seller_applications')
      .update({ status: decision, review_notes: notes ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch { return false; }
}
