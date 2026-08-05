// Client half of listing moderation. See app/api/admin/products for why none of
// this can be a Supabase call from the console.

export type ProductStatus = 'live' | 'flagged' | 'removed' | 'draft' | 'inactive';

export type AdminProduct = {
  id: string;
  title: string;
  price: number;
  category: string;
  tag: string | null;
  image: string | null;
  status: ProductStatus;
  featured: boolean;
  stock: number | null;
  type: string;
  rating: number;
  reviews: number;
  seller: string;
  sellerId: string | null;
  sellerHandle: string | null;
  sellerAvatar: string | null;
  listed: string;
  createdAt: string | null;
};

export type ProductCounts = { all: number; live: number; flagged: number; removed: number };

async function call(token: string | null, url: string, method = 'GET', body?: any): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Your admin session has expired — sign in again' };
  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { error: payload?.error ?? `Request failed (${res.status})` };
    return { data: payload };
  } catch {
    return { error: 'Could not reach the server' };
  }
}

export async function listProducts(
  token: string | null,
  opts: { status?: string; search?: string } = {},
): Promise<{ products: AdminProduct[]; counts: ProductCounts | null; available: boolean; canAct: boolean; error?: string }> {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.search) params.set('search', opts.search);
  const qs = params.toString();
  const { data, error } = await call(token, `/api/admin/products${qs ? '?' + qs : ''}`);
  if (error) return { products: [], counts: null, available: false, canAct: false, error };
  return {
    products: (data?.products ?? []) as AdminProduct[],
    counts: (data?.counts ?? null) as ProductCounts | null,
    available: !!data?.available,
    canAct: !!data?.canAct,
  };
}

export async function setProductStatus(
  token: string | null,
  id: string,
  status: 'live' | 'flagged' | 'removed',
  opts: { reason?: string; actorLabel?: string } = {},
): Promise<{ product?: AdminProduct; error?: string }> {
  const { data, error } = await call(token, '/api/admin/products', 'PATCH', { id, status, ...opts });
  if (error) return { error };
  return { product: data?.product as AdminProduct };
}
