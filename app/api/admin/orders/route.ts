import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { STRIPE_API_VERSION } from "@/lib/stripe-version";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { enforce } from "@/lib/rate-limit";
import { isMissingTable, isMissingColumn, isMissingFunction } from "@/lib/pg-errors";
import { logError, logWarn, requestId, failure } from "@/lib/observability";
import { gateRole, type Permission } from "@/lib/admin-role";

// Orders, from the admin's side: find one, read it, move it, refund it.
//
// The console had no way to do any of that. 014 wrote an "admins see all
// orders" RLS policy keyed on auth.uid(), and the console authenticates with
// Privy — so auth.uid() is null there and the policy has never fired. Reading
// orders from the browser was never going to work; this route is the door,
// service-role behind a verified Privy token, same as support and verification.
//
// GET    ?q=&status=&payment=&limit=   search / filter, with line items,
//                                      refunds and the buyer attached
// PATCH  { id, status?, adminNote? }   move an order, or annotate it
// POST   { orderId, amountCents, reason, method, idempotencyKey }   refund

export const runtime = 'nodejs';

const ORDER_STATUSES = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'failed', 'refunded'];

async function authed(req: NextRequest, budget: number, permission: Permission): Promise<{ db: any; adminId: string; fail: NextResponse | null }> {
  // Before the token check, which is a network round trip to Privy: an
  // unauthenticated flood costs real money even though every request 401s.
  const limited = enforce(req, { name: 'admin-orders', limit: budget, windowMs: 60_000 });
  if (limited) return { db: null, adminId: '', fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return { db: null, adminId: '', fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabaseAdmin();
  if (!db) return { db: null, adminId: '', fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };

  // A verified Privy token proves the caller is staff. It does not say which
  // kind — a moderator and an owner carry indistinguishable tokens, and until
  // 040 this route treated them identically, refunds included.
  const denied = await gateRole(db, admin.userId, permission);
  if (denied) return { db: null, adminId: '', fail: denied };

  return { db, adminId: admin.userId, fail: null };
}

const str = (v: any) => typeof v === 'string' ? v.trim() : '';
const cents = (v: any) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN;

// PostgREST splits `or` on commas and reads % and _ as LIKE wildcards, so a
// comma in a search term would be read as a second filter. Stripped rather than
// escaped — this is a search box, and the terms people type into it (an order
// id, an email, a name) contain none of these on purpose.
const clean = (s: string) => s.replace(/[,%_()]/g, ' ').trim();

const EMPTY_COUNTS = {
  total: 0, processing: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0,
  unpaid: 0, paid: 0, paymentFailed: 0, refunded: 0, last24h: 0,
  grossCents: 0, refundedCents: 0,
};

function shapeCounts(row: any) {
  if (!row) return { ...EMPTY_COUNTS };
  const n = (v: any) => Number(v ?? 0);
  return {
    total: n(row.total), processing: n(row.processing), confirmed: n(row.confirmed),
    shipped: n(row.shipped), delivered: n(row.delivered), cancelled: n(row.cancelled),
    unpaid: n(row.unpaid), paid: n(row.paid), paymentFailed: n(row.payment_failed),
    refunded: n(row.refunded), last24h: n(row.last_24h),
    grossCents: n(row.gross_cents), refundedCents: n(row.refunded_cents),
  };
}

function shapeRefund(r: any) {
  return {
    id: r.id,
    orderId: r.order_id,
    amountCents: Number(r.amount_cents ?? 0),
    method: r.method ?? 'stripe',
    reason: r.reason ?? null,
    stripeRefundId: r.stripe_refund_id ?? null,
    status: r.status ?? 'succeeded',
    issuedBy: r.issued_by ?? null,
    createdAt: r.created_at,
  };
}

function shapeItem(i: any) {
  return {
    id: i.id,
    productId: i.product_id ?? null,
    sellerId: i.seller_id ?? null,
    name: i.name ?? 'Item',
    priceCents: Number(i.price_cents ?? 0),
    quantity: Number(i.quantity ?? 1),
    imageUrl: i.image_url ?? null,
    status: i.status ?? 'processing',
  };
}

/**
 * One order, with everything an admin needs to decide something about it.
 *
 * `items` (the jsonb snapshot written at checkout) and `lineItems` (the
 * order_items rows) are both carried, and they are not redundant: the snapshot
 * is what the buyer actually saw and paid for, frozen at that moment, while the
 * line items are the live fulfilment state and can be missing entirely on
 * orders written before migration 020. Showing only one of them would either
 * lose the fulfilment view or lose orders.
 */
function shapeOrder(o: any, lineItems: any[], refunds: any[], buyer: any) {
  const succeeded = refunds.filter(r => (r.status ?? 'succeeded') === 'succeeded');
  return {
    id: o.id,
    status: o.status ?? 'processing',
    paymentStatus: o.payment_status ?? 'unpaid',
    paymentIntentId: o.payment_intent_id ?? null,
    email: o.email ?? null,
    address: o.address ?? null,
    items: Array.isArray(o.items) ? o.items : [],
    lineItems: lineItems.map(shapeItem),
    refunds: refunds.map(shapeRefund),
    subtotalCents: Number(o.subtotal_cents ?? 0),
    shippingCents: Number(o.shipping_cents ?? 0),
    totalCents: Number(o.total_cents ?? 0),
    refundedCents: succeeded.reduce((sum, r) => sum + Number(r.amount_cents ?? 0), 0),
    userId: o.user_id ?? null,
    buyer: buyer ? { id: buyer.id, handle: buyer.handle ?? null, name: buyer.full_name ?? null, avatarUrl: buyer.avatar_url ?? null } : null,
    adminNote: o.admin_note ?? null,
    createdAt: o.created_at,
  };
}

// Line items, refunds and buyers for a page of orders, in three round trips
// rather than three per order. Each one degrades on its own: order_items
// predates some orders, order_refunds doesn't exist until 039 is applied, and a
// buyer's profile can be gone. None of those should blank the list.
async function decorate(db: any, orders: any[], id: string) {
  const ids = orders.map(o => o.id);
  const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
  if (!ids.length) return { rows: [], refundsAvailable: true };

  const [items, refunds, profiles] = await Promise.all([
    db.from('order_items').select('*').in('order_id', ids),
    db.from('order_refunds').select('*').in('order_id', ids).order('created_at', { ascending: false }),
    userIds.length
      ? db.from('profiles').select('id, handle, full_name, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  // One migration behind, not an error worth a 500. See lib/pg-errors — the
  // code that actually arrives here is PGRST205, not the 42P01 you'd expect.
  const refundsAvailable = !isMissingTable(refunds.error);
  if (refunds.error && !refundsAvailable) {
    logWarn('admin/orders', 'order_refunds unavailable', {
      fix: 'apply supabase/migrations/039_order_admin.sql', requestId: id, reason: refunds.error.message,
    });
  } else if (refunds.error) {
    logError('admin/orders', 'refund read failed', refunds.error, { requestId: id });
  }

  const byOrder = new Map<string, any[]>();
  for (const i of items.data ?? []) {
    const list = byOrder.get(i.order_id) ?? [];
    list.push(i);
    byOrder.set(i.order_id, list);
  }
  const refundsByOrder = new Map<string, any[]>();
  for (const r of refunds.data ?? []) {
    const list = refundsByOrder.get(r.order_id) ?? [];
    list.push(r);
    refundsByOrder.set(r.order_id, list);
  }
  const byUser = new Map<string, any>((profiles.data ?? []).map((p: any) => [p.id, p]));

  return {
    rows: orders.map(o => shapeOrder(o, byOrder.get(o.id) ?? [], refundsByOrder.get(o.id) ?? [], byUser.get(o.user_id))),
    refundsAvailable,
  };
}

export async function GET(req: NextRequest) {
  const { db, fail } = await authed(req, 90, 'orders.view');
  if (fail) return fail;

  const id = requestId(req);
  try {
    const q = clean(str(req.nextUrl.searchParams.get('q')));
    const status = str(req.nextUrl.searchParams.get('status'));
    const payment = str(req.nextUrl.searchParams.get('payment'));
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 100, 1), 300);

    let query = db.from('orders').select('*').order('created_at', { ascending: false }).limit(limit);
    if (ORDER_STATUSES.includes(status)) query = query.eq('status', status);
    if (PAYMENT_STATUSES.includes(payment)) query = query.eq('payment_status', payment);

    if (q) {
      // A buyer's name and handle live on profiles, not orders, so searching by
      // them means resolving to ids first. Capped at 40 matches: this widens
      // the order query's `in` list, and a one-letter search term would
      // otherwise pull the entire members table into a URL.
      const { data: matches } = await db
        .from('profiles').select('id')
        .or(`handle.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(40);
      const userIds = (matches ?? []).map((p: any) => p.id);

      const clauses = [`id.ilike.%${q}%`, `email.ilike.%${q}%`, `payment_intent_id.ilike.%${q}%`];
      if (userIds.length) clauses.push(`user_id.in.(${userIds.join(',')})`);
      query = query.or(clauses.join(','));
    }

    const [orders, counts] = await Promise.all([query, db.rpc('admin_order_counts')]);

    if (orders.error) {
      if (isMissingTable(orders.error)) {
        logWarn('admin/orders', 'orders table unavailable', {
          fix: 'apply supabase/migrations/014_marketplace.sql', requestId: id, reason: orders.error.message,
        });
        return NextResponse.json({ available: false, orders: [], counts: { ...EMPTY_COUNTS } });
      }
      // A missing payment_status column (023 not applied) only breaks the
      // filter, not the list — say which it was rather than 500ing on both.
      if (isMissingColumn(orders.error)) {
        return NextResponse.json({ error: 'This database is missing the order payment columns — apply supabase/migrations/023_order_payments.sql.' }, { status: 500 });
      }
      return NextResponse.json({ error: orders.error.message }, { status: 500 });
    }

    const countsOk = !counts.error && Array.isArray(counts.data) && counts.data.length > 0;
    if (!countsOk) {
      // Only name the migration when the function is genuinely absent. If it
      // exists and threw, saying "apply 039" sends whoever reads this log to
      // re-run a migration that is already applied and learn nothing.
      const absent = !counts.error || isMissingFunction(counts.error);
      logWarn('admin/orders', 'order counts unavailable', {
        ...(absent ? { fix: 'apply supabase/migrations/039_order_admin.sql' } : {}),
        requestId: id, reason: counts.error?.message ?? 'admin_order_counts() returned nothing',
      });
    }

    const { rows, refundsAvailable } = await decorate(db, orders.data ?? [], id);

    return NextResponse.json({
      available: true,
      countsAvailable: countsOk,
      refundsAvailable,
      orders: rows,
      counts: shapeCounts(countsOk ? counts.data[0] : null),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/orders', err, id, 'Could not load orders.');
  }
}

// Re-reads one order with everything attached, so a mutation's response is the
// same shape the list holds and the panel can swap the row wholesale.
async function reread(db: any, orderId: string, id: string) {
  const { data } = await db.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!data) return null;
  const { rows } = await decorate(db, [data], id);
  return rows[0] ?? null;
}

export async function PATCH(req: NextRequest) {
  const { db, adminId, fail } = await authed(req, 60, 'orders.manage');
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = str(body?.id);
    if (!orderId) return NextResponse.json({ error: 'Which order?' }, { status: 400 });

    const { data: existing } = await db.from('orders').select('id, status').eq('id', orderId).maybeSingle();
    if (!existing) return NextResponse.json({ error: 'That order no longer exists' }, { status: 404 });

    if (body.status !== undefined) {
      const status = str(body.status);
      if (!ORDER_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Unknown order status' }, { status: 400 });
      }

      // The line items move with it. Migration 020 installs a trigger that
      // rolls item status up to the order — so setting only the order would
      // hold until the next time a seller touched a line item, and then
      // silently revert. Cancelled items are left alone unless the whole order
      // is being cancelled: an item pulled from a shipment doesn't come back
      // because the rest of the order shipped.
      let itemQuery = db.from('order_items').update({ status }).eq('order_id', orderId);
      if (status !== 'cancelled') itemQuery = itemQuery.neq('status', 'cancelled');
      const { error: itemError } = await itemQuery;
      if (itemError && !isMissingTable(itemError)) {
        logError('admin/orders', 'line item status update failed', itemError, { requestId: id, orderId });
      }

      // Written after the items, so it wins if the trigger computed something
      // else — an admin moving an order is an override, and an override that
      // gets quietly recomputed is worse than no override at all.
      const { error } = await db.from('orders').update({ status }).eq('id', orderId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.adminNote !== undefined) {
      const note = typeof body.adminNote === 'string' ? body.adminNote.trim().slice(0, 4000) : null;
      const { error } = await db.from('orders').update({ admin_note: note || null }).eq('id', orderId);
      if (error) {
        if (isMissingColumn(error)) {
          return NextResponse.json({ error: 'Notes need supabase/migrations/039_order_admin.sql applied first.' }, { status: 503 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    logWarn('admin/orders', 'order updated', {
      requestId: id, orderId, by: adminId,
      status: body.status ?? null, noted: body.adminNote !== undefined,
    });

    return NextResponse.json({ order: await reread(db, orderId, id) });
  } catch (err) {
    return failure('admin/orders', err, id, 'Could not update that order.');
  }
}

/**
 * Issues a refund.
 *
 * The ceiling is computed here, from the refunds already recorded against the
 * order, and not from anything the client sent. A console that can be talked
 * into refunding more than was collected is a hole with a direct exit to cash,
 * and "the UI wouldn't send that" is not a control.
 *
 * Stripe is called before the row is written, never after: a row saying money
 * moved when it didn't is the worse of the two failures — it makes the order's
 * arithmetic wrong and hides a customer who is still owed. If Stripe succeeds
 * and the insert then fails, the log carries the refund id and the amount, and
 * the next read reconciles by refund id because it's uniquely indexed.
 */
export async function POST(req: NextRequest) {
  // Tighter than the read budget on purpose. Nothing legitimate issues refunds
  // at even this rate, and each one is irreversible.
  const { db, adminId, fail } = await authed(req, 20, 'orders.refund');
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = str(body?.orderId);
    const reason = str(body?.reason).slice(0, 500);
    const method = str(body?.method) === 'manual' ? 'manual' : 'stripe';
    const idempotencyKey = str(body?.idempotencyKey).slice(0, 200);
    if (!orderId) return NextResponse.json({ error: 'Which order?' }, { status: 400 });
    if (!reason) return NextResponse.json({ error: 'Give a reason — it is the only record of why this money went back.' }, { status: 400 });

    const { data: order, error: readError } = await db
      .from('orders').select('*').eq('id', orderId).maybeSingle();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
    if (!order) return NextResponse.json({ error: 'That order no longer exists' }, { status: 404 });

    const { data: prior, error: priorError } = await db
      .from('order_refunds').select('amount_cents, status').eq('order_id', orderId);
    if (priorError) {
      if (isMissingTable(priorError)) {
        return NextResponse.json({ error: 'Refunds need supabase/migrations/039_order_admin.sql applied first.' }, { status: 503 });
      }
      return NextResponse.json({ error: priorError.message }, { status: 500 });
    }

    const total = Number(order.total_cents ?? 0);
    const already = (prior ?? [])
      .filter((r: any) => (r.status ?? 'succeeded') === 'succeeded')
      .reduce((sum: number, r: any) => sum + Number(r.amount_cents ?? 0), 0);
    const remaining = total - already;

    if (remaining <= 0) {
      return NextResponse.json({ error: 'This order has already been refunded in full.' }, { status: 409 });
    }

    // Omitted means "all of what's left", which is what the button says.
    const amount = body.amountCents === undefined || body.amountCents === null || body.amountCents === ''
      ? remaining : cents(body.amountCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Enter an amount above zero.' }, { status: 400 });
    }
    if (amount > remaining) {
      return NextResponse.json({
        error: `That is more than is left to refund on this order (${(remaining / 100).toFixed(2)} of ${(total / 100).toFixed(2)}).`,
      }, { status: 400 });
    }

    let stripeRefundId: string | null = null;
    let refundStatus: 'pending' | 'succeeded' | 'failed' = 'succeeded';

    if (method === 'stripe') {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        return NextResponse.json({ error: 'STRIPE_SECRET_KEY is not configured on this server — record it as a manual refund instead.' }, { status: 503 });
      }
      if (!order.payment_intent_id) {
        return NextResponse.json({ error: 'This order has no Stripe payment to refund against. If the money went back another way, record it as a manual refund.' }, { status: 400 });
      }
      if (order.payment_status !== 'paid') {
        return NextResponse.json({ error: `This order is marked ${order.payment_status ?? 'unpaid'} — there is nothing to send back.` }, { status: 409 });
      }

      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
        const refund = await stripe.refunds.create(
          {
            payment_intent: order.payment_intent_id,
            amount,
            // Stripe's own `reason` is a three-value enum; ours is a sentence.
            // It goes in metadata so the dashboard shows the same explanation
            // the console does rather than a shrug.
            metadata: { order_id: orderId, note: reason, issued_by: adminId },
          },
          // Two clicks on one button must not become two refunds. The key comes
          // from the browser so a retry of the *same* attempt collapses, while
          // a deliberate second partial refund carries a new one.
          idempotencyKey ? { idempotencyKey } : undefined,
        );
        stripeRefundId = refund.id;
        refundStatus = refund.status === 'succeeded' ? 'succeeded'
          : refund.status === 'failed' || refund.status === 'canceled' ? 'failed'
          : 'pending';
      } catch (err: any) {
        logError('admin/orders', 'stripe refund failed', err, {
          requestId: id, orderId, amount, by: adminId, stripeCode: err?.code, stripeType: err?.type,
        });
        return NextResponse.json({
          error: err?.message ?? 'Stripe refused the refund.', requestId: id,
        }, { status: 502, headers: { 'x-request-id': id } });
      }
    }

    const { data: inserted, error: insertError } = await db.from('order_refunds').insert({
      order_id: orderId,
      amount_cents: amount,
      method,
      reason,
      stripe_refund_id: stripeRefundId,
      payment_intent_id: order.payment_intent_id ?? null,
      status: refundStatus,
      issued_by: adminId,
    }).select().single();

    if (insertError) {
      // The money may already be gone. Log loudly enough that it can be
      // reconciled by hand, and tell the truth in the response.
      logError('admin/orders', 'refund recorded in stripe but not in the database', insertError, {
        requestId: id, orderId, amount, stripeRefundId, by: adminId,
      });
      return NextResponse.json({
        error: stripeRefundId
          ? `Stripe processed refund ${stripeRefundId}, but it could not be recorded here. Do not retry — reconcile it manually.`
          : insertError.message,
        requestId: id,
      }, { status: 500, headers: { 'x-request-id': id } });
    }

    // Fully refunded orders say so, so the buyer's own order page stops
    // claiming "Paid" for money it no longer has. Partials deliberately stay
    // 'paid' — they did pay, and some of it came back.
    if (refundStatus === 'succeeded' && already + amount >= total) {
      const { error } = await db.from('orders').update({ payment_status: 'refunded' }).eq('id', orderId);
      if (error) logError('admin/orders', 'could not mark order refunded', error, { requestId: id, orderId });
    }

    return NextResponse.json({ refund: shapeRefund(inserted), order: await reread(db, orderId, id) });
  } catch (err) {
    return failure('admin/orders', err, id, 'Could not issue that refund.');
  }
}
