// Client half of order management. Every call goes through /api/admin/orders,
// which verifies the caller's Privy token before touching the table with the
// service-role key — the console has no Supabase session, and 014's "admins see
// all orders" policy is keyed on auth.uid(), so a direct read returns nothing
// rather than failing loudly.
//
// Errors come back as text rather than a boolean, same as lib/admin-support.ts:
// an order search that silently fails looks exactly like an order that doesn't
// exist, and on this screen that's the difference between "no such order" and
// "your refund didn't go through".

export type OrderStatus = 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

export const ORDER_STATUSES: OrderStatus[] = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export type OrderRefund = {
  id: string;
  orderId: string;
  amountCents: number;
  method: 'stripe' | 'manual';
  reason: string | null;
  stripeRefundId: string | null;
  status: 'pending' | 'succeeded' | 'failed';
  issuedBy: string | null;
  createdAt: string;
};

export type OrderLineItem = {
  id: string;
  productId: string | null;
  sellerId: string | null;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl: string | null;
  status: string;
};

export type AdminOrder = {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentIntentId: string | null;
  email: string | null;
  address: any;
  /** The cart snapshot written at checkout — what the buyer actually paid for. */
  items: any[];
  /** Live fulfilment rows (migration 020). Empty on older orders. */
  lineItems: OrderLineItem[];
  refunds: OrderRefund[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  refundedCents: number;
  userId: string | null;
  buyer: { id: string; handle: string | null; name: string | null; avatarUrl: string | null } | null;
  adminNote: string | null;
  createdAt: string;
};

export type OrderCounts = {
  total: number; processing: number; confirmed: number; shipped: number;
  delivered: number; cancelled: number; unpaid: number; paid: number;
  paymentFailed: number; refunded: number; last24h: number;
  grossCents: number; refundedCents: number;
};

export const EMPTY_ORDER_COUNTS = (): OrderCounts => ({
  total: 0, processing: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0,
  unpaid: 0, paid: 0, paymentFailed: 0, refunded: 0, last24h: 0,
  grossCents: 0, refundedCents: 0,
});

/** What is still refundable on an order, in cents. Never negative. */
export const remainingCents = (o: AdminOrder) => Math.max(0, o.totalCents - o.refundedCents);

export const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ENDPOINT = '/api/admin/orders';

async function call(token: string | null, method: string, body?: any, query = ''): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Your admin session has expired — sign in again' };
  try {
    const res = await fetch(ENDPOINT + query, {
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

/**
 * Search and filter, server-side.
 *
 * `q` matches order id, buyer email, Stripe payment intent, and buyer name or
 * handle. Done on the server rather than by filtering a fetched page, because
 * the page is capped: an order from March would simply not be in the rows the
 * browser holds, and a search box that quietly only covers the last 100 orders
 * is worse than no search box.
 */
export async function listOrders(
  token: string | null,
  opts: { q?: string; status?: string; payment?: string; limit?: number } = {},
): Promise<{
  orders?: AdminOrder[]; counts?: OrderCounts;
  available?: boolean; countsAvailable?: boolean; refundsAvailable?: boolean; error?: string;
}> {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.payment && opts.payment !== 'all') params.set('payment', opts.payment);
  if (opts.limit) params.set('limit', String(opts.limit));
  const query = params.toString();
  const { data, error } = await call(token, 'GET', undefined, query ? `?${query}` : '');
  if (error) return { error };
  return {
    orders: (data?.orders ?? []) as AdminOrder[],
    counts: (data?.counts ?? EMPTY_ORDER_COUNTS()) as OrderCounts,
    available: data?.available !== false,
    countsAvailable: data?.countsAvailable !== false,
    refundsAvailable: data?.refundsAvailable !== false,
  };
}

/** Moves an order (and its line items with it) or saves the internal note. */
export async function updateOrder(
  token: string | null,
  id: string,
  patch: { status?: OrderStatus; adminNote?: string },
): Promise<{ order?: AdminOrder; error?: string }> {
  const { data, error } = await call(token, 'PATCH', { id, ...patch });
  return error ? { error } : { order: data?.order as AdminOrder };
}

/**
 * Issues a refund.
 *
 * `amountCents` omitted means everything still outstanding. The idempotency key
 * is generated per attempt and passed to Stripe, so a double-click or a retry
 * of the same click collapses into one refund rather than two — the server
 * cannot infer that on its own, because a deliberate second partial refund for
 * the same amount is a legitimate thing to do.
 */
export async function issueRefund(
  token: string | null,
  input: { orderId: string; amountCents?: number; reason: string; method?: 'stripe' | 'manual'; idempotencyKey?: string },
): Promise<{ refund?: OrderRefund; order?: AdminOrder; error?: string }> {
  const { data, error } = await call(token, 'POST', {
    method: 'stripe',
    idempotencyKey: newIdempotencyKey(),
    ...input,
  });
  return error ? { error } : { refund: data?.refund as OrderRefund, order: data?.order as AdminOrder };
}

export function newIdempotencyKey() {
  try { return crypto.randomUUID(); } catch { return `k_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
}

// ---- The admin's own profile, for the sidebar avatar --------------------
//
// Separate endpoint because it answers a different question with a different
// shape. Kept here rather than in its own module: it is two functions' worth of
// code and it is only ever called by the console.

export type AdminProfile = { id: string; handle: string | null; name: string | null; avatarUrl: string | null };

export async function fetchAdminProfile(token: string | null, email: string | null): Promise<AdminProfile | null> {
  if (!token || !email) return null;
  try {
    const res = await fetch('/api/admin/profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return null;
    const payload = await res.json().catch(() => ({}));
    return (payload?.profile ?? null) as AdminProfile | null;
  } catch {
    return null;
  }
}
