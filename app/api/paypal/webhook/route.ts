import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyWebhook, outcomeForEvent } from '@/lib/paypal';
import { logWarn, logError } from '@/lib/observability';

export const runtime = 'nodejs';

// PayPal Payouts webhook — the only thing in this codebase that turns a
// submitted payout into a paid one.
//
// Configure in the PayPal developer dashboard, under the same app whose
// credentials are in PAYPAL_CLIENT_ID:
//   endpoint:  https://<your-domain>/api/paypal/webhook
//   events:    PAYMENT.PAYOUTS-ITEM.SUCCEEDED, .FAILED, .DENIED, .RETURNED,
//              .REFUNDED, .BLOCKED, .UNCLAIMED
//   env:       PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV,
//              PAYPAL_WEBHOOK_ID
//
// Why this endpoint carries the weight it does: PayPal's submit call returns
// PENDING and a batch id, nothing more. The admin console shows that payout as
// 'processing' and it stays there — not paid, because PayPal has not said paid —
// until one of these events arrives. Without this route every PayPal payout on
// the platform would sit in 'processing' forever and someone would eventually
// mark them by hand, which is the situation automation was supposed to end.
//
// Verification is an API call, not a local HMAC. There is no shared secret to
// check the signature against the way Stripe has one; PayPal is asked whether it
// sent this, which costs a round trip per event. lib/paypal refuses rather than
// skips when PAYPAL_WEBHOOK_ID is unset — an unverified endpoint that settles
// payouts is one anyone can POST to in order to mark their own payout paid.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  // Raw bytes, before anything parses them. The verification call sends the body
  // back to PayPal to be checked against the signature, so it has to be the
  // string that arrived rather than a re-serialisation of it.
  const raw = await req.text();

  const verified = await verifyWebhook({ headers: req.headers, rawBody: raw });
  if (!verified.ok) {
    logWarn('paypal/webhook', 'refused an unverified event', { reason: verified.reason });
    return NextResponse.json({ error: 'unverified' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'unparseable' }, { status: 400 });
  }

  const eventType: string = event?.event_type ?? '';
  const outcome = outcomeForEvent(eventType);

  // UNCLAIMED lands here and is meant to. The recipient has no PayPal account
  // under that address and has thirty days to open one, so it is neither paid
  // nor failed. Calling it paid would be false; calling it failed would send
  // someone to pay it a second time while the first is still in flight.
  if (!outcome) {
    return NextResponse.json({ received: true, ignored: eventType || 'unknown' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    // Deliberately not a 200. PayPal retries for three days, and a payout that
    // settled while the service key was missing must not be silently lost.
    logError('paypal/webhook', 'service role key not configured', null, { eventType });
    return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 });
  }

  const resource = event?.resource ?? {};
  const batchId: string | null = resource?.payout_batch_id ?? null;
  const itemId: string | null = resource?.payout_item_id ?? null;
  const itemStatus: string = resource?.transaction_status ?? outcome.label;
  const reason: string | null =
    resource?.errors?.message ?? resource?.errors?.name ?? null;

  const errorText = outcome.outcome === 'failed'
    ? `PayPal ${itemStatus}${reason ? ` — ${reason}` : ''}. The money did not reach the seller and is back with PayPal.`
    : null;

  // Matched on PayPal's own ids, never on anything naming a payout directly.
  const { data, error } = await admin.rpc('payout_provider_settle', {
    p_provider: 'paypal',
    p_ref: batchId,
    p_item_ref: itemId,
    p_outcome: outcome.outcome,
    p_status: itemStatus,
    p_error: errorText,
  });

  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      logWarn('paypal/webhook', 'dispatch functions missing', {
        fix: 'apply supabase/migrations/045_payout_dispatch.sql', eventType,
      });
      return NextResponse.json({ received: true, warning: 'migration_045_not_applied' });
    }
    logError('paypal/webhook', 'could not settle payout', error, { eventType, batchId, itemId });
    // 500 so PayPal retries. A transient database failure must not be the reason
    // a seller's payout never leaves 'processing'.
    return NextResponse.json({ error: 'settle_failed' }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row) return NextResponse.json({ received: true, payout: row.id, status: row.status });

  // ── Nothing matched on the provider ids ─────────────────────────────────
  //
  // Usually genuine: a batch this platform did not create, or an event replayed
  // long after the row was cleaned up. But there is one real case where the ids
  // were never recorded — a submit that PayPal accepted under a sender_batch_id
  // it already held, where lib/paypal reports `duplicate` and there is no batch
  // id to store, and the rarer one where the provider call succeeded and the
  // database write after it failed.
  //
  // For those, sender_item_id is the payout request's own id, written by this
  // platform at submit time. Trusting it is only sound because the signature was
  // verified above — it came back from PayPal, not from whoever posted here.
  const senderItemId: string = String(resource?.payout_item?.sender_item_id ?? '').trim();
  if (!UUID.test(senderItemId)) {
    logWarn('paypal/webhook', 'event matched no payout', { eventType, batchId, itemId });
    return NextResponse.json({ received: true, matched: false });
  }

  const { data: exists } = await admin
    .from('payout_requests')
    .select('id, status')
    .eq('id', senderItemId)
    .maybeSingle();

  if (!exists) {
    logWarn('paypal/webhook', 'sender_item_id names no payout', { eventType, senderItemId });
    return NextResponse.json({ received: true, matched: false });
  }

  const { data: settled, error: settleErr } = await admin.rpc('admin_dispatch_settle', {
    p_actor: 'system',
    p_label: 'PayPal webhook',
    p_payout: senderItemId,
    p_outcome: outcome.outcome,
    p_ref: batchId,
    p_item_ref: itemId,
    p_status: itemStatus,
    p_error: errorText,
  });

  if (settleErr) {
    logError('paypal/webhook', 'could not settle by sender_item_id', settleErr, { eventType, senderItemId });
    return NextResponse.json({ error: 'settle_failed' }, { status: 500 });
  }

  const settledRow = Array.isArray(settled) ? settled[0] : settled;
  return NextResponse.json({
    received: true,
    payout: settledRow?.id ?? senderItemId,
    status: settledRow?.status ?? null,
    matchedBy: 'sender_item_id',
  });
}
