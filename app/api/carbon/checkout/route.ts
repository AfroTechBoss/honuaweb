import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_API_VERSION } from '@/lib/stripe-version';
import { enforce } from '@/lib/rate-limit';
import { isMissingTable } from '@/lib/pg-errors';
import { logError, requestId } from '@/lib/observability';

export const runtime = 'nodejs';

// Carbon retirement checkout — the same shape as /api/checkout.
//
// POST { creditId, tonnes }
//   → { clientSecret, checkoutId, creditName, tonnes, unitCents, totalCents }
// GET  ?id=CRB-…
//   → { status: 'open' | 'finalized' | 'rejected', retirement?, reason? }
//
// The browser names a credit and a tonnage and nothing else. The price comes
// from carbon_credits, read with the service role. The quote goes into
// carbon_checkouts (migration 049) and the Stripe webhook retires the tonnes
// only after Stripe reports that exact amount captured. GET lets the buy modal
// wait for the webhook so it can show the serial the retirement was given.

const MISSING_MIGRATION = 'apply supabase/migrations/049_carbon_payments.sql';
const MAX_TONNES = 100000;

const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const newCheckoutId = () => 'CRB-' + randomBytes(5).toString('hex').toUpperCase();

async function verifiedUser(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).auth.getUser(token);
  return error || !data?.user ? null : data.user.id;
}

export async function POST(req: Request) {
  // Every call here creates a real PaymentIntent against the Stripe account.
  const limited = enforce(req, { name: 'carbon-checkout', limit: 10, windowMs: 60_000 },
    'Too many checkout attempts — wait a minute and try again.');
  if (limited) return limited;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 });
  }

  const userId = await verifiedUser(req);
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const id = requestId(req);
  try {
    // The service role bypasses migration 041's freeze, so standing is checked here.
    const { data: standing } = await db
      .from('profiles').select('suspended_until, banned_at').eq('id', userId).maybeSingle();
    if (standing?.banned_at || (standing?.suspended_until && new Date(standing.suspended_until) > new Date())) {
      return NextResponse.json({ error: 'account_restricted', message: 'Purchases are paused while your account is suspended or banned. You can appeal at /appeal.' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!isUuid(body?.creditId)) {
      return NextResponse.json({ error: 'credit_unavailable', message: 'This credit is no longer listed.' }, { status: 400 });
    }
    // Hundredths of a tonne are the finest grain the market sells.
    const tonnes = Math.round(Number(body?.tonnes) * 100) / 100;
    if (!Number.isFinite(tonnes) || tonnes <= 0 || tonnes > MAX_TONNES) {
      return NextResponse.json({ error: 'bad_quantity', message: 'How many tonnes?' }, { status: 400 });
    }

    const { data: credit, error: creditError } = await db
      .from('carbon_credits')
      .select('id, name, price_cents, volume_t, active')
      .eq('id', body.creditId)
      .maybeSingle();
    if (creditError) throw creditError;
    if (!credit || credit.active === false || !(credit.price_cents > 0)) {
      return NextResponse.json({ error: 'credit_unavailable', message: 'This credit is no longer listed.' }, { status: 409 });
    }
    const left = Number(credit.volume_t ?? 0);
    if (tonnes > left) {
      return NextResponse.json({
        error: 'out_of_stock',
        message: left > 0 ? `Only ${left.toLocaleString('en-US', { maximumFractionDigits: 2 })} t left on this credit.` : 'This credit is sold out.',
      }, { status: 409 });
    }

    const total = Math.round(tonnes * credit.price_cents);
    if (total < 50) {
      return NextResponse.json({ error: 'amount_too_low', message: 'The smallest retirement is $0.50.' }, { status: 400 });
    }

    const checkoutId = newCheckoutId();
    const { error: quoteError } = await db.from('carbon_checkouts').insert({
      id: checkoutId, user_id: userId, credit_id: credit.id, credit_name: credit.name,
      tonnes, unit_cents: credit.price_cents, total_cents: total, currency: 'usd',
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
      // The buy modal confirms in place, so nothing that leaves the page.
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `Retire ${tonnes} t CO₂ — ${credit.name}`,
      metadata: { kind: 'carbon', carbon_checkout_id: checkoutId, user_id: userId },
    }, { idempotencyKey: `carbon:${checkoutId}` });

    const { error: linkError } = await db
      .from('carbon_checkouts').update({ payment_intent_id: paymentIntent.id }).eq('id', checkoutId);
    if (linkError) {
      // Without the link the webhook would reject this payment as a mismatch,
      // so don't let the buyer pay into it.
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
      throw linkError;
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      checkoutId,
      creditName: credit.name,
      tonnes,
      unitCents: credit.price_cents,
      totalCents: total,
    });
  } catch (err: any) {
    logError('api/carbon/checkout', 'carbon checkout failed', err, {
      requestId: id, userId, stripeType: err?.type, stripeCode: err?.code,
    });
    return NextResponse.json(
      { error: 'checkout_error', message: 'We could not start the payment. Please try again.', requestId: id },
      { status: 502, headers: { 'x-request-id': id } },
    );
  }
}

export async function GET(req: Request) {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const userId = await verifiedUser(req);
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const checkoutId = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^CRB-[0-9A-F]{10}$/.test(checkoutId)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: q } = await db
    .from('carbon_checkouts')
    .select('status, reject_reason, purchase_id, user_id')
    .eq('id', checkoutId)
    .maybeSingle();
  // Someone else's checkout looks exactly like one that does not exist.
  if (!q || q.user_id !== userId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (q.status === 'rejected') {
    const oversold = String(q.reject_reason ?? '').startsWith('oversold');
    return NextResponse.json({
      status: 'rejected',
      reason: oversold
        ? 'Someone retired the last of this credit while you were paying. Your payment has been refunded.'
        : 'Your payment could not be matched to this retirement, so it has been refunded and nothing was retired.',
    });
  }
  if (q.status !== 'finalized' || !q.purchase_id) return NextResponse.json({ status: 'open' });

  const { data: p } = await db
    .from('carbon_purchases')
    .select('id, serial, credit_name, tonnes, unit_cents, total_cents, retired_at, payment_state')
    .eq('id', q.purchase_id)
    .maybeSingle();
  if (!p) return NextResponse.json({ status: 'open' });

  return NextResponse.json({
    status: 'finalized',
    retirement: {
      id: p.id,
      serial: p.serial,
      creditName: p.credit_name,
      tonnes: Number(p.tonnes ?? 0),
      unitCents: Number(p.unit_cents ?? 0),
      totalCents: Number(p.total_cents ?? 0),
      retiredAt: p.retired_at,
      paymentState: p.payment_state ?? 'paid',
    },
  });
}
