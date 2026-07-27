import { supabase } from "@/lib/supabase";

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
    rating: Number(row.rating ?? 4.8),
    review_count: row.review_count ?? 0,
    featured: !!row.featured,
    compare_at_cents: row.compare_at_cents ?? null,
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    // Ignore junk rows from any leftover pre-migration table
    return data.filter((r: any) => r.name && r.price_cents != null).map(mapProduct);
  } catch { return []; }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapProduct(data);
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
const parseCentsStr = (price: any) => Math.round(parseFloat(String(price).replace(/[^0-9.]/g, '')) * 100) || 0;
const isUuid = (v: any) => /^[0-9a-f-]{36}$/.test(String(v));

export async function createDbOrder(userId: string, order: {
  id: string; items: any[]; subtotal: number; shipping: number; total: number;
  email?: string; address?: any;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('orders').insert({
      id: order.id,
      user_id: userId,
      items: order.items,
      subtotal_cents: Math.round(order.subtotal * 100),
      shipping_cents: Math.round(order.shipping * 100),
      total_cents: Math.round(order.total * 100),
      email: order.email ?? null,
      address: order.address ?? null,
    });
    if (error) return false;

    // Line items (migration 020) — carry seller_id so sellers can fulfil.
    // Failure here is non-fatal: the order itself is already recorded.
    try {
      const productIds = order.items.map((i: any) => i.id).filter(isUuid);
      let sellerByProduct: Record<string, { seller_id: string | null; image_url: string | null }> = {};
      if (productIds.length) {
        const { data: prods } = await supabase.from('products').select('id, seller_id, image_url').in('id', productIds);
        for (const p of prods ?? []) sellerByProduct[p.id] = { seller_id: p.seller_id, image_url: p.image_url };
      }
      const rows = order.items.map((i: any) => ({
        order_id: order.id,
        buyer_id: userId,
        product_id: isUuid(i.id) ? i.id : null,
        seller_id: isUuid(i.id) ? sellerByProduct[i.id]?.seller_id ?? null : null,
        name: i.name,
        price_cents: parseCentsStr(i.price),
        quantity: i.quantity || 1,
        image_url: i.imgUrl ?? (isUuid(i.id) ? sellerByProduct[i.id]?.image_url ?? null : null),
      }));
      if (rows.length) await supabase.from('order_items').insert(rows);
    } catch {}
    return true;
  } catch { return false; }
}

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
      date: o.created_at,
      createdAt: o.created_at,
      _db: true,
    }));
  } catch { return []; }
}

// ---- Carbon credits ----
export type CarbonCredit = {
  id: string; name: string; region: string; type: string; verifier: string;
  vintage: string; price: string; price_cents: number; volume: string; tag: string; color: string;
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
      volume: `${Number(c.volume_t).toLocaleString()} tCO₂`,
      tag: c.tag ?? 'Verified',
      color: c.tag === 'Removal' ? 'var(--sky)' : c.tag === 'Premium' ? 'var(--green)' : 'var(--green-2)',
    }));
  } catch { return []; }
}

export async function purchaseCredit(userId: string, credit: { id?: string; name: string }, tonnes: number, totalCents: number): Promise<boolean> {
  try {
    const { error } = await supabase.from('carbon_purchases').insert({
      user_id: userId,
      credit_id: credit.id ?? null,
      credit_name: credit.name,
      tonnes,
      total_cents: totalCents,
    });
    return !error;
  } catch { return false; }
}

export async function getMyOffsets(userId: string): Promise<{ tonnes: number; totalCents: number; purchases: any[] }> {
  try {
    const { data, error } = await supabase
      .from('carbon_purchases')
      .select('*')
      .eq('user_id', userId)
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
export async function submitSellerApplication(userId: string, f: any): Promise<boolean> {
  try {
    const { error } = await supabase.from('seller_applications').insert({
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
    });
    return !error;
  } catch { return false; }
}

export async function getMySellerApplication(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('seller_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch { return null; }
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
