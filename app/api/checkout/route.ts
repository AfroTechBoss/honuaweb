import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
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
    console.error('[api/checkout] error:', err?.type, err?.message, err?.code);
    return NextResponse.json(
      { error: 'stripe_error', type: err?.type ?? null, code: err?.code ?? null, message: err?.message ?? String(err) },
      { status: 502 },
    );
  }
}
