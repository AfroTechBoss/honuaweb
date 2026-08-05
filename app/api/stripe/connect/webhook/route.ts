import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logWarn, logError } from '@/lib/observability';

export const runtime = 'nodejs';

// Stripe Connect webhook — what connected accounts do about themselves.
//
// A *separate* endpoint from /api/stripe/webhook, with its own signing secret,
// because Stripe delivers Connect events to Connect endpoints and platform
// events to platform ones. Configure in the dashboard:
//   endpoint:  https://<your-domain>/api/stripe/connect/webhook
//   listen to: events on connected accounts
//   events:    account.updated, account.application.deauthorized
//   env:       STRIPE_SECRET_KEY, STRIPE_CONNECT_WEBHOOK_SECRET
//
// What it is for. A seller finishes Stripe onboarding somewhere Honua cannot
// see — in Stripe's hosted flow, days later, from their phone, or by uploading a
// document Stripe then takes an hour to review. Their `transfers` capability
// turns active at that moment and nothing in this codebase would know. The
// payout screen would keep saying "finish onboarding" and dispatch would keep
// refusing, until the seller happened to reload the page and trigger the
// read-through in /api/payout-methods/connect.
//
// So the flags are mirrored here too. Stripe's view always wins; the row never
// leads. Nothing in this file decides anything — it copies.

const CONNECT_SECRET = () => process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = CONNECT_SECRET();

  if (!secretKey || !webhookSecret) {
    // 503 rather than a quiet 200: Stripe will retry, and the retries are the
    // reminder that the endpoint was configured before its secret was.
    return NextResponse.json({ error: 'stripe_connect_not_configured' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' });

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'no_signature' }, { status: 400 });

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    // Almost always the payments secret pasted into the Connect endpoint, or the
    // reverse. Worth naming, because the symptom otherwise is "onboarding never
    // completes" with nothing in between.
    return NextResponse.json({ error: `invalid_signature: ${err.message}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ received: true, warning: 'service_role_not_configured' });
  }

  // Only rows this platform created through onboarding. A row holding a typed
  // acct_ id is not one whose capabilities we have any business asserting, and
  // migration 045 refuses to dispatch to it regardless.
  const mirror = async (accountId: string, patch: Record<string, unknown>) => {
    const { error } = await admin
      .from('payout_methods')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('stripe_account_id', accountId)
      .not('stripe_onboarded_at', 'is', null);

    if (error) {
      // 42703 is the columns not existing yet — migration 045 unapplied. Logged
      // once per event rather than retried forever.
      if (error.code === '42703') {
        logWarn('stripe/connect-webhook', 'connect columns missing', {
          fix: 'apply supabase/migrations/045_payout_dispatch.sql', account: accountId,
        });
        return;
      }
      logError('stripe/connect-webhook', 'could not mirror account state', error, { account: accountId });
    }
  };

  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object;
      await mirror(account.id, {
        stripe_transfers_enabled: account?.capabilities?.transfers === 'active',
        stripe_payouts_enabled: account?.payouts_enabled === true,
        stripe_charges_enabled: account?.charges_enabled === true,
        stripe_requirements: account?.requirements ?? null,
        stripe_country: account?.country ?? null,
        stripe_synced_at: new Date().toISOString(),
        // 'verified' here means exactly one thing: Stripe will accept a transfer.
        // It is not a judgement about the seller and nothing else sets it.
        status: account?.capabilities?.transfers === 'active' ? 'verified' : 'unverified',
      });
      break;
    }

    case 'account.application.deauthorized': {
      // The seller disconnected Honua from their Stripe account. Transfers will
      // be refused from now on, so the flag comes down immediately rather than
      // waiting for a dispatch to discover it.
      const accountId = event.account ?? event.data?.object?.id;
      if (accountId) {
        await mirror(accountId, {
          stripe_transfers_enabled: false,
          stripe_payouts_enabled: false,
          stripe_charges_enabled: false,
          stripe_synced_at: new Date().toISOString(),
          status: 'unverified',
        });
      }
      break;
    }

    default:
      // Connect endpoints receive a great deal more than this. Acknowledged and
      // ignored so Stripe stops resending them.
      break;
  }

  return NextResponse.json({ received: true });
}
