import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

// Stripe payment webhook — the authoritative, server-side source of truth for
// whether an order was paid. Fires even if the buyer closes the tab after
// paying. Configure in the Stripe dashboard:
//   endpoint:  https://<your-domain>/api/stripe/webhook
//   events:    payment_intent.succeeded, payment_intent.payment_failed
//   env:       STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' });

  // Raw body is required for signature verification
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'no_signature' }, { status: 400 });

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `invalid_signature: ${err.message}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    // Acknowledge so Stripe doesn't retry forever, but flag the misconfig
    return NextResponse.json({ received: true, warning: 'service_role_not_configured' });
  }

  const applyStatus = async (pi: any, paymentStatus: 'paid' | 'failed') => {
    const orderId = pi?.metadata?.order_id;
    const update: any = { payment_status: paymentStatus };
    if (orderId) {
      await admin.from('orders').update(update).eq('id', orderId);
    } else if (pi?.id) {
      // Fall back to matching by the stored payment intent id
      await admin.from('orders').update(update).eq('payment_intent_id', pi.id);
    }
  };

  switch (event.type) {
    case 'payment_intent.succeeded':
      await applyStatus(event.data.object, 'paid');
      break;
    case 'payment_intent.payment_failed':
      await applyStatus(event.data.object, 'failed');
      break;
    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true });
}
