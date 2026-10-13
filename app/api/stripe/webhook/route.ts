import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_API_VERSION } from '@/lib/stripe-version';
import { logError, logWarn } from '@/lib/observability';

export const runtime = 'nodejs';

// Stripe payment webhook — the authoritative, server-side source of truth for
// whether an order or a carbon retirement was paid. Fires even if the buyer closes the tab after
// paying. Configure in the Stripe dashboard:
//   endpoint:  https://<your-domain>/api/stripe/webhook
//   events:    payment_intent.succeeded, payment_intent.payment_failed,
//              transfer.reversed
//   env:       STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
//
// transfer.reversed belongs here rather than on the Connect endpoint: a transfer
// is the *platform's* object, so its events arrive on the platform's account.
// Onboarding events, which are the connected account's business, go to
// /api/stripe/connect/webhook with its own secret.

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });

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

  // A checkout started by /api/checkout has a server-priced quote in
  // checkout_intents (migration 048). The order is created here, and only
  // here, once Stripe's captured amount matches that quote — the browser never
  // writes an order and never names a price.
  //
  // Returns false when there is no quote to finalize against, so intents from
  // before 048 still get the legacy status update below.
  const finalizeCheckout = async (pi: any): Promise<boolean> => {
    const orderId = pi?.metadata?.order_id;
    if (!orderId) return false;
    const ship = pi.shipping;
    const address = ship ? {
      name: ship.name ?? null,
      street: [ship.address?.line1, ship.address?.line2].filter(Boolean).join(', ') || null,
      city: ship.address?.city ?? null,
      zip: ship.address?.postal_code ?? null,
      state: ship.address?.state ?? null,
      country: ship.address?.country ?? null,
    } : null;
    const { data, error } = await admin.rpc('finalize_checkout', {
      p_order_id: String(orderId),
      p_payment_intent: pi.id,
      p_amount_cents: pi.amount_received ?? 0,
      p_currency: pi.currency ?? '',
      p_email: pi.receipt_email ?? null,
      p_address: address,
    });
    if (error) {
      // 048 not applied yet — fall back to the old behaviour rather than drop
      // the payment on the floor.
      if (error.code === 'PGRST202' || error.code === '42883') return false;
      // Anything else is a real failure: throw so Stripe retries the event.
      throw error;
    }
    if (data === 'missing') return false;
    if (data === 'mismatch') {
      // Money arrived that does not match the quote. Acknowledged (a retry
      // would not change the answer) but loud: someone has to refund or
      // reconcile it by hand. The reason is on the checkout_intents row.
      logError('stripe/webhook', 'payment does not match checkout quote — order NOT created', null, {
        orderId, paymentIntent: pi.id, amountReceived: pi.amount_received, currency: pi.currency,
      });
    }
    return true;
  };

  // A carbon retirement started by /api/carbon/checkout (migration 049). The
  // tonnes are retired here, and only here, once Stripe's captured amount
  // matches the quote. Unlike a product order, a payment that cannot be
  // honoured is refunded straight away: there is no seller to reconcile with,
  // and the tonnes it paid for either do not exist or were not what was quoted.
  const finalizeCarbon = async (pi: any) => {
    const checkoutId = String(pi?.metadata?.carbon_checkout_id ?? '');
    const { data, error } = await admin.rpc('finalize_carbon_checkout', {
      p_checkout_id: checkoutId,
      p_payment_intent: pi.id,
      p_amount_cents: pi.amount_received ?? 0,
      p_currency: pi.currency ?? '',
    });
    if (error) {
      // 049 not applied: throw so Stripe keeps retrying until it is, rather
      // than refunding a payment the migration would have honoured.
      throw error;
    }
    if (data === 'created' || data === 'exists') return;

    logError('stripe/webhook', `carbon payment not honoured (${data}) — refunding`, null, {
      checkoutId, paymentIntent: pi.id, amountReceived: pi.amount_received, currency: pi.currency,
    });
    // Keyed on the intent, so a redelivered event cannot refund twice.
    await stripe.refunds.create(
      { payment_intent: pi.id, reason: 'requested_by_customer', metadata: { carbon_checkout_id: checkoutId, outcome: String(data) } },
      { idempotencyKey: `carbon-refund:${pi.id}` },
    );
  };

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      if (pi?.metadata?.kind === 'carbon') {
        try {
          await finalizeCarbon(pi);
        } catch (err) {
          logError('stripe/webhook', 'could not finalize carbon checkout', err, { paymentIntent: pi?.id });
          return NextResponse.json({ error: 'finalize_failed' }, { status: 500 });
        }
        break;
      }
      try {
        if (!(await finalizeCheckout(pi))) {
          logWarn('stripe/webhook', 'succeeded intent has no checkout quote — legacy status update only', {
            paymentIntent: pi?.id, orderId: pi?.metadata?.order_id ?? null,
          });
          await applyStatus(pi, 'paid');
        }
      } catch (err) {
        logError('stripe/webhook', 'could not finalize checkout', err, { paymentIntent: pi?.id });
        return NextResponse.json({ error: 'finalize_failed' }, { status: 500 });
      }
      break;
    }
    case 'payment_intent.payment_failed':
      // No order exists for a failed checkout any more; this only touches
      // orders written before 048. A failed carbon payment has nothing to
      // undo: the quote just stays open and is never finalized.
      if (event.data.object?.metadata?.kind === 'carbon') break;
      await applyStatus(event.data.object, 'failed');
      break;
    case 'transfer.reversed': {
      // A seller payout coming back. The money is in the platform balance again,
      // so the payout has to leave 'paid' — otherwise the console shows a
      // settlement that undid itself and nobody sends it a second time.
      //
      // Note there is no 'transfer.failed': Stripe transfers either raise at
      // creation or succeed, and reversal is the only way one comes undone
      // afterwards. See lib/stripe-connect's transferOutcome.
      const transfer = event.data.object;
      const { error } = await admin.rpc('payout_provider_settle', {
        p_provider: 'stripe',
        // Matched on Stripe's own transfer id, which is what admin_dispatch_settle
        // wrote as provider_ref. An event naming a transfer this platform did not
        // create matches nothing and is ignored.
        p_ref: transfer?.id ?? null,
        p_item_ref: null,
        p_outcome: 'failed',
        p_status: 'REVERSED',
        p_error: 'Stripe reversed this transfer — the money came back to the platform balance. Check the transfer in the Stripe dashboard before sending it again.',
      });
      if (error && error.code !== 'PGRST202' && error.code !== '42883') {
        console.error('[stripe/webhook] could not settle reversed transfer', error);
      }
      break;
    }
    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true });
}
