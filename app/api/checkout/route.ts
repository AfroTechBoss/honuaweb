import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_API_VERSION } from '@/lib/stripe-version';
import { enforce } from '@/lib/rate-limit';
import { isMissingTable } from '@/lib/pg-errors';
import { logError, requestId } from '@/lib/observability';

export const runtime = 'nodejs';

// Starts a checkout: prices the cart, records the quote, opens a PaymentIntent.
//
// POST { items: [{ id, quantity }] }
//   → { clientSecret, paymentIntentId, orderId, items, subtotal, shipping, total }
//
// The browser sends product ids and quantities and nothing else. Every price
// comes from `products`, read with the service role, so editing the cart in
// devtools changes nothing about what gets charged. The quote goes into
// checkout_intents (migration 048) and the Stripe webhook creates the order
// from it only after Stripe reports the same amount captured. Nothing here
// writes an order — an abandoned checkout leaves an open quote, not an
// unpaid order in someone's history.
//
// Authenticated, because the order has to belong to someone and that someone
// has to be a verified Supabase user, not a `user_id` the browser names.

const MISSING_MIGRATION = 'apply supabase/migrations/048_order_integrity.sql';

// Kept in step with the summary the checkout screen shows before the quote
// arrives. The server's number is the one charged.
const FREE_SHIPPING_FROM_CENTS = 7500;
const SHIPPING_CENTS = 599;
const MAX_LINES = 50;
const MAX_QTY = 99;

const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

// Not guessable, so one buyer cannot probe another's order page by counting.
const newOrderId = () => 'ORD-' + randomBytes(5).toString('hex').toUpperCase();

export async function POST(req: Request) {
  // Every call here creates a real PaymentIntent against the Stripe account.
  const limited = enforce(req, { name: 'checkout', limit: 10, windowMs: 60_000 },
    'Too many checkout attempts — wait a minute and try again.');
  if (limited) return limited;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 });
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  const { data: auth, error: authError } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).auth.getUser(token);
  if (authError || !auth?.user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  const userId = auth.user.id;

  const id = requestId(req);
  try {
    // The service role bypasses migration 041's freeze, so standing is checked
    // here. A suspended account buying is not itself harmful, but a banned one
    // placing orders sellers then have to fulfil is.
    const { data: standing } = await db
      .from('profiles').select('suspended_until, banned_at').eq('id', userId).maybeSingle();
    if (standing?.banned_at || (standing?.suspended_until && new Date(standing.suspended_until) > new Date())) {
      return NextResponse.json({ error: 'account_restricted', message: 'Purchases are paused while your account is suspended or banned. You can appeal at /appeal.' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const raw: any[] = Array.isArray(body?.items) ? body.items : [];
    if (!raw.length) return NextResponse.json({ error: 'empty_cart' }, { status: 400 });
    if (raw.length > MAX_LINES) return NextResponse.json({ error: 'too_many_items' }, { status: 400 });

    // Merge duplicate lines so a quantity cannot dodge the stock check by
    // being split across two entries.
    const qtyById = new Map<string, number>();
    for (const it of raw) {
      if (!isUuid(it?.id)) {
        // Demo catalogue items have slug ids and no seller to pay.
        return NextResponse.json({ error: 'item_unavailable', message: 'One of the items in your cart is a demo listing and cannot be bought. Remove it and try again.' }, { status: 400 });
      }
      const q = Math.floor(Number(it.quantity ?? 1));
      if (!Number.isFinite(q) || q < 1 || q > MAX_QTY) return NextResponse.json({ error: 'bad_quantity' }, { status: 400 });
      qtyById.set(it.id, Math.min(MAX_QTY, (qtyById.get(it.id) ?? 0) + q));
    }

    const ids = [...qtyById.keys()];
    const { data: products, error: prodError } = await db
      .from('products')
      .select('id, name, brand, price_cents, image_url, seller_id, status, stock')
      .in('id', ids);
    if (prodError) throw prodError;

    const byId = new Map((products ?? []).map((p: any) => [p.id, p]));
    const lines: any[] = [];
    const items: any[] = [];
    for (const pid of ids) {
      const p: any = byId.get(pid);
      const quantity = qtyById.get(pid)!;
      if (!p || p.status !== 'live' || !(p.price_cents > 0)) {
        return NextResponse.json({ error: 'item_unavailable', message: `${p?.name ?? 'An item in your cart'} is no longer available. Remove it and try again.` }, { status: 409 });
      }
      if (p.seller_id === userId) {
        return NextResponse.json({ error: 'own_product', message: `You can't buy your own listing (${p.name}).` }, { status: 400 });
      }
      if (p.stock != null && quantity > p.stock) {
        return NextResponse.json({ error: 'out_of_stock', message: p.stock > 0 ? `Only ${p.stock} of ${p.name} left.` : `${p.name} is sold out.` }, { status: 409 });
      }
      lines.push({
        product_id: p.id, seller_id: p.seller_id ?? null, name: p.name,
        price_cents: p.price_cents, quantity, image_url: p.image_url ?? null,
      });
      items.push({
        id: p.id, name: p.name, brand: p.brand ?? '', price: money(p.price_cents),
        quantity, imgUrl: p.image_url ?? null,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.price_cents * l.quantity, 0);
    const shipping = subtotal >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
    const total = subtotal + shipping;
    if (total < 50) return NextResponse.json({ error: 'amount_too_low' }, { status: 400 });

    const orderId = newOrderId();
    const { error: quoteError } = await db.from('checkout_intents').insert({
      id: orderId, user_id: userId, items, lines,
      subtotal_cents: subtotal, shipping_cents: shipping, total_cents: total, currency: 'usd',
    });
    if (quoteError) {
      if (isMissingTable(quoteError)) {
        return NextResponse.json({ error: 'checkout_unavailable', hint: MISSING_MIGRATION }, { status: 503 });
      }
      throw quoteError;
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { order_id: orderId, user_id: userId },
    }, { idempotencyKey: `checkout:${orderId}` });

    const { error: linkError } = await db
      .from('checkout_intents').update({ payment_intent_id: paymentIntent.id }).eq('id', orderId);
    if (linkError) {
      // Without the link the webhook would reject this payment as a mismatch,
      // so don't let the buyer pay into it.
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
      throw linkError;
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId,
      items,
      subtotal: subtotal / 100,
      shipping: shipping / 100,
      total: total / 100,
    });
  } catch (err: any) {
    logError('api/checkout', 'checkout failed', err, {
      requestId: id, userId, stripeType: err?.type, stripeCode: err?.code,
    });
    // The id goes back so a customer who saw this can be matched to the log
    // line without guessing from timestamps.
    return NextResponse.json(
      { error: 'checkout_error', type: err?.type ?? null, code: err?.code ?? null, message: err?.message ?? String(err), requestId: id },
      { status: 502, headers: { 'x-request-id': id } },
    );
  }
}
