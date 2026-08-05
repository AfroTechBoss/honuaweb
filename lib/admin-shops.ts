// Client half of the shop register. See app/api/admin/shops for why the read
// cannot happen from the browser: seller_applications, products and order_items
// are all policed by auth.uid(), and the console holds a Privy session.

export type AdminShopListing = {
  id: string;
  name: string;
  price: number;
  status: string;
  image: string | null;
};

export type AdminShop = {
  ownerId: string;
  applicationId: string | null;
  /** False means listings exist without an approved application behind them. */
  approved: boolean;
  name: string;
  shopHandle: string | null;
  tagline: string | null;
  logo: string | null;
  categories: string[];
  type: string | null;
  country: string | null;
  shipsTo: string | null;
  legalName: string | null;
  bizType: string | null;
  openedAt: string | null;
  opened: string | null;

  owner: string;
  handle: string | null;
  avatar: string | null;
  verified: boolean;
  ownerStatus: 'active' | 'suspended' | 'banned';

  // null rather than 0 when the underlying table could not be read — "no
  // listings" and "we could not ask" are different claims about a shop.
  products: number | null;
  live: number | null;
  flagged: number | null;
  removed: number | null;
  unlisted: number | null;
  recent: AdminShopListing[];

  orders: number | null;
  units: number | null;
  gross: number | null;
  cancelled: number | null;
  lastSale: string | null;
  lastSaleAt: string | null;

  payout: { kind: string; label: string; status: string } | null;
};

export type ShopFilter = 'all' | 'trading' | 'dormant' | 'unapproved';
export type ShopCounts = Record<ShopFilter, number>;

export type ShopRegister = {
  shops: AdminShop[];
  counts: ShopCounts | null;
  /** False means migration 017 has not been applied — not that there are no shops. */
  available: boolean;
  truncated: boolean;
  catalogueReadable: boolean;
  salesReadable: boolean;
  error?: string;
};

const EMPTY: ShopRegister = {
  shops: [], counts: null, available: false, truncated: false,
  catalogueReadable: false, salesReadable: false,
};

export async function listShops(
  token: string | null,
  filter: ShopFilter = 'all',
  search = '',
): Promise<ShopRegister> {
  if (!token) return { ...EMPTY, error: 'Your admin session has expired — sign in again' };
  try {
    const url = `/api/admin/shops?filter=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { ...EMPTY, error: payload?.error ?? `Request failed (${res.status})` };
    return {
      shops: (payload?.shops ?? []) as AdminShop[],
      counts: (payload?.counts ?? null) as ShopCounts | null,
      available: !!payload?.available,
      truncated: !!payload?.truncated,
      catalogueReadable: payload?.catalogueReadable !== false,
      salesReadable: payload?.salesReadable !== false,
    };
  } catch {
    return { ...EMPTY, error: 'Could not reach the server' };
  }
}
