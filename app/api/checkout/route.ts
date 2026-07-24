import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { items } = await req.json();

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  // Dynamic import so the server bundle only includes Stripe when the key is set
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secretKey, { apiVersion: '2025-06-30.basil' });

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
      items: JSON.stringify(items.map((i: any) => ({ name: i.name, qty: i.quantity || 1 }))),
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
