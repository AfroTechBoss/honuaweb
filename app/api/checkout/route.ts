import { NextResponse } from 'next/server';
import { enforce } from '@/lib/rate-limit';
import { logError, requestId } from '@/lib/observability';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Every call here creates a real PaymentIntent against the Stripe account.
  // Unauthenticated, so the ceiling is per-IP: enough for someone retrying a
  // failed card, nowhere near enough to fill the dashboard with junk intents.
  const limited = enforce(req, { name: 'checkout', limit: 10, windowMs: 60_000 },
    'Too many checkout attempts — wait a minute and try again.');
  if (limited) return limited;

  try {
    const { items, orderId } = await req.json();

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' });

    const amount = (items as any[]).reduce((sum, item) => {
      const cents = Math.round(parseFloat(String(item.price).replace(/[^0-9.]/g, '')) * 100) || 0;
      return sum + cents * (item.quantity || 1);
    }, 0);

    if (amount < 50) {
      return NextResponse.json({ error: 'amount_too_low' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        // Order id lets the webhook mark the exact order paid server-side
        ...(orderId ? { order_id: String(orderId) } : {}),
        items: JSON.stringify(items.map((i: any) => ({ name: i.name, qty: i.quantity || 1 }))),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    const id = requestId(req);
    logError('api/checkout', 'payment intent failed', err, {
      requestId: id, stripeType: err?.type, stripeCode: err?.code,
    });
    // The id goes back so a customer who saw this can be matched to the log
    // line without guessing from timestamps.
    return NextResponse.json(
      { error: 'stripe_error', type: err?.type ?? null, code: err?.code ?? null, message: err?.message ?? String(err), requestId: id },
      { status: 502, headers: { 'x-request-id': id } },
    );
  }
}
