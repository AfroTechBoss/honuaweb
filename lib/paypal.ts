// PayPal Payouts — the API half of `dispatch: 'automatic'` for PayPal
// destinations. Server only: every function here needs PAYPAL_CLIENT_SECRET.
//
// Payouts is not the payments API. It is a separate product that has to be
// enabled on the business account, and when it is not, PayPal answers an
// otherwise-correct request with a generic AUTHORIZATION_ERROR rather than
// anything that names the cause — so `friendlyError` below translates that one
// case specifically. Nobody should have to guess at it twice.
//
// The shape of the thing worth being careful about: a payout is asynchronous.
// The submit call returns PENDING and a batch id, and the money may still be
// DENIED, RETURNED, or sit UNCLAIMED for 30 days because the recipient has no
// PayPal account under that address. Nothing here reports a submit as a payment.
// See app/api/paypal/webhook, which is what actually settles it.

const LIVE = 'https://api-m.paypal.com';
const SANDBOX = 'https://api-m.sandbox.paypal.com';

/** Live only when explicitly asked for. A typo in PAYPAL_ENV must not move real money. */
export const paypalBase = (): string => (process.env.PAYPAL_ENV === 'live' ? LIVE : SANDBOX);

export const paypalIsLive = (): boolean => process.env.PAYPAL_ENV === 'live';

export type PayPalConfig = { clientId: string; clientSecret: string; base: string };

/**
 * Credentials or a sentence naming what is missing. Returned rather than thrown
 * because "PayPal isn't set up" is a 503 the console renders, not a crash.
 */
export function paypalConfig(): { config: PayPalConfig } | { error: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  const missing = [
    !clientId && 'PAYPAL_CLIENT_ID',
    !clientSecret && 'PAYPAL_CLIENT_SECRET',
  ].filter(Boolean);

  if (missing.length) {
    return { error: `PayPal payouts are not configured on the server — ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} unset.` };
  }
  return { config: { clientId: clientId!, clientSecret: clientSecret!, base: paypalBase() } };
}

export const paypalConfigured = (): boolean => 'config' in paypalConfig();

// ── Access token ────────────────────────────────────────────────────────────
//
// Cached per isolate until shortly before it expires. PayPal's tokens last nine
// hours and it rate-limits the token endpoint, so fetching one per payout is
// both slower and closer to a 429 than it needs to be. The 60s margin is for the
// request that is already in flight when the token turns over.

let cached: { token: string; expiresAt: number; base: string } | null = null;

async function accessToken(cfg: PayPalConfig): Promise<{ token: string } | { error: string }> {
  // Keyed on base as well as time: switching PAYPAL_ENV must not hand a sandbox
  // token to the live API, where it would fail in a way that reads like bad
  // credentials rather than like the wrong environment.
  if (cached && cached.base === cfg.base && cached.expiresAt > Date.now()) {
    return { token: cached.token };
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');

  let res: Response;
  try {
    res = await fetch(`${cfg.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });
  } catch (err: any) {
    return { error: `Could not reach PayPal: ${err?.message ?? String(err)}` };
  }

  const body = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    if (res.status === 401) {
      return { error: `PayPal rejected the credentials (${paypalIsLive() ? 'live' : 'sandbox'} mode). Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET belong to that environment.` };
    }
    return { error: `PayPal token request failed (${res.status}): ${body?.error_description ?? 'no detail given'}` };
  }

  const token = body?.access_token;
  if (!token) return { error: 'PayPal returned no access token.' };

  cached = {
    token,
    base: cfg.base,
    expiresAt: Date.now() + Math.max(0, (Number(body?.expires_in) || 0) - 60) * 1000,
  };
  return { token };
}

// ── Errors worth naming ─────────────────────────────────────────────────────

/**
 * PayPal's error bodies are consistent in shape and useless in content for the
 * two cases that actually happen in practice. This turns those into something an
 * admin can act on and passes everything else through with its detail intact.
 */
function friendlyError(status: number, body: any): string {
  const name = body?.name ?? '';
  const detail = body?.details?.[0];
  const issue = detail?.issue ?? '';

  if (name === 'AUTHORIZATION_ERROR' || status === 403) {
    return 'PayPal refused the request. The most common cause is that Payouts is not enabled on the business account — it is a separate permission from accepting payments, requested from PayPal under Account Settings → Payouts.';
  }
  if (issue === 'INSUFFICIENT_FUNDS' || name === 'INSUFFICIENT_FUNDS') {
    return 'The PayPal account does not hold enough balance to cover this payout.';
  }
  if (issue === 'RECEIVER_UNREGISTERED') {
    return 'That email address has no PayPal account. The payout would sit unclaimed for 30 days and then return — ask the seller to confirm the address.';
  }
  if (name === 'RATE_LIMIT_REACHED' || status === 429) {
    return 'PayPal is rate limiting payouts right now. Wait a moment and send it again.';
  }

  const parts = [name, detail?.description ?? body?.message].filter(Boolean);
  return parts.length ? `PayPal: ${parts.join(' — ')}` : `PayPal request failed (${status}).`;
}

/** True when the failure is one where retrying the same request could work. */
const isTransient = (status: number) => status === 429 || status >= 500;

// ── Sending one ─────────────────────────────────────────────────────────────

export type PayoutSubmission = {
  batchId: string;
  /** PayPal's own status at submit — PENDING in practice, never a settlement. */
  batchStatus: string;
};

/**
 * Three outcomes, and `duplicate` is genuinely one of them rather than a flavour
 * of failure — see sendPayout below.
 *
 * A string discriminant rather than an `ok` boolean because this project compiles
 * with `strict: false`, and without strictNullChecks TypeScript will not narrow a
 * union on a boolean-literal member: `if (!res.ok)` leaves every arm in play and
 * each field access on the result becomes an error. Named outcomes narrow either
 * way, and match the words migration 045 uses.
 */
export type PayoutAttempt =
  | { result: 'submitted'; submission: PayoutSubmission }
  | { result: 'duplicate'; error: string }
  | { result: 'failed'; error: string; transient: boolean };

/**
 * Submit a single-item payout batch.
 *
 * `payoutId` is the platform's payout_requests.id and is used as PayPal's
 * sender_batch_id, which is what makes this safe to retry: PayPal rejects a
 * second batch under a sender_batch_id it has already seen, so a retry after an
 * ambiguous timeout cannot pay the seller twice. That rejection is surfaced as
 * `duplicate`, not as a failure — the money is with PayPal either way, and
 * telling the admin it failed would invite them to send it again by hand.
 */
export async function sendPayout(args: {
  payoutId: string;
  email: string;
  cents: number;
  currency?: string;
  note?: string;
}): Promise<PayoutAttempt> {
  const cfg = paypalConfig();
  if ('error' in cfg) return { result: 'failed', error: cfg.error, transient: false };

  const auth = await accessToken(cfg.config);
  if ('error' in auth) return { result: 'failed', error: auth.error, transient: true };

  const currency = (args.currency ?? 'USD').toUpperCase();
  // PayPal wants a decimal string, and rounding it here rather than letting
  // toFixed see a float that is already wrong keeps cents exact.
  const value = (Math.round(args.cents) / 100).toFixed(2);

  let res: Response;
  try {
    res = await fetch(`${cfg.config.base}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
        // Belt to sender_batch_id's braces: this covers a retry that never
        // reached PayPal, where sender_batch_id would not yet be on record.
        'PayPal-Request-Id': args.payoutId,
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: args.payoutId,
          email_subject: 'Your Honua payout',
          email_message: 'Your seller earnings from Honua have been sent.',
        },
        items: [{
          recipient_type: 'EMAIL',
          receiver: args.email,
          amount: { value, currency },
          sender_item_id: args.payoutId,
          note: args.note ?? 'Honua seller payout',
        }],
      }),
      cache: 'no-store',
    });
  } catch (err: any) {
    // Never reached PayPal, or never heard back. Transient, and the batch id
    // makes the retry safe.
    return { result: 'failed', error: `Could not reach PayPal: ${err?.message ?? String(err)}`, transient: true };
  }

  const body = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    const duplicate =
      body?.name === 'USER_BUSINESS_ERROR' &&
      JSON.stringify(body?.details ?? '').includes('sender_batch_id');

    if (duplicate) {
      return {
        result: 'duplicate',
        // Deliberately not phrased as a failure. There is no PayPal endpoint
        // that looks a batch up by sender_batch_id, so the honest instruction is
        // to go and look rather than to guess on the seller's behalf.
        error: 'PayPal already has a payout under this reference, so it was not sent again. Check the PayPal dashboard for its status before doing anything else — the money may well be on its way.',
      };
    }
    return { result: 'failed', error: friendlyError(res.status, body), transient: isTransient(res.status) };
  }

  const batchId = body?.batch_header?.payout_batch_id;
  if (!batchId) {
    return { result: 'failed', error: 'PayPal accepted the payout but returned no batch id, so it cannot be tracked.', transient: false };
  }

  return {
    result: 'submitted',
    submission: { batchId, batchStatus: body?.batch_header?.batch_status ?? 'PENDING' },
  };
}

// ── Reading one back ────────────────────────────────────────────────────────

export type PayoutBatchStatus = {
  batchStatus: string;
  itemStatus: string | null;
  itemId: string | null;
  payerId: string | null;
  /** PayPal's own reason string when an item did not go through. */
  reason: string | null;
};

/**
 * Fetch a batch. Used to reconcile a payout stuck in 'processing' — a webhook
 * that never arrived, or a submit whose response was lost.
 */
export async function readPayout(batchId: string): Promise<{ status: PayoutBatchStatus } | { error: string }> {
  const cfg = paypalConfig();
  if ('error' in cfg) return { error: cfg.error };

  const auth = await accessToken(cfg.config);
  if ('error' in auth) return { error: auth.error };

  let res: Response;
  try {
    res = await fetch(`${cfg.config.base}/v1/payments/payouts/${encodeURIComponent(batchId)}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      cache: 'no-store',
    });
  } catch (err: any) {
    return { error: `Could not reach PayPal: ${err?.message ?? String(err)}` };
  }

  const body = await res.json().catch(() => ({} as any));
  if (!res.ok) return { error: friendlyError(res.status, body) };

  // One item per batch — this platform never sends a multi-recipient batch, so
  // that a failure belongs to exactly one seller and one payout row.
  const item = body?.items?.[0];

  return {
    status: {
      batchStatus: body?.batch_header?.batch_status ?? 'UNKNOWN',
      itemStatus: item?.transaction_status ?? null,
      itemId: item?.payout_item_id ?? null,
      payerId: item?.payout_item?.receiver_wallet === 'PAYPAL' ? (item?.payout_item?.receiver ?? null) : null,
      reason: item?.errors?.message ?? null,
    },
  };
}

// ── Webhook signature ───────────────────────────────────────────────────────

/**
 * Ask PayPal whether it sent this. There is no local HMAC to check the way
 * Stripe has one — verification is itself an API call against the certificate
 * chain, so it costs a round trip per event.
 *
 * Returns false when PAYPAL_WEBHOOK_ID is unset rather than skipping the check.
 * An unverified webhook that settles payouts is an endpoint anyone can POST to
 * in order to mark their own payout paid.
 */
export async function verifyWebhook(args: {
  headers: Headers;
  rawBody: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const cfg = paypalConfig();
  if ('error' in cfg) return { ok: false, reason: cfg.error };

  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) return { ok: false, reason: 'PAYPAL_WEBHOOK_ID is unset, so PayPal webhooks cannot be verified and are being refused.' };

  const h = (k: string) => args.headers.get(k) ?? '';
  const transmissionId = h('paypal-transmission-id');
  const transmissionTime = h('paypal-transmission-time');
  const transmissionSig = h('paypal-transmission-sig');
  const certUrl = h('paypal-cert-url');
  const authAlgo = h('paypal-auth-algo');

  if (!transmissionId || !transmissionSig || !certUrl) {
    return { ok: false, reason: 'Missing PayPal signature headers.' };
  }

  // PayPal fetches this certificate itself during verification. Checked here
  // because the header is attacker-controlled and pointing it at a host PayPal
  // will happily fetch is the obvious way to try to forge an event.
  if (!/^https:\/\/api(-m)?(\.[a-z0-9-]+)*\.paypal\.com\//i.test(certUrl)) {
    return { ok: false, reason: 'PayPal certificate URL is not on a paypal.com host.' };
  }

  const auth = await accessToken(cfg.config);
  if ('error' in auth) return { ok: false, reason: auth.error };

  let res: Response;
  try {
    res = await fetch(`${cfg.config.base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      // webhook_event must be the parsed body, and it must match the bytes that
      // were signed — so it is parsed from the raw string here rather than
      // re-serialised from anything the route has already touched.
      body: `{"transmission_id":${JSON.stringify(transmissionId)},"transmission_time":${JSON.stringify(transmissionTime)},"cert_url":${JSON.stringify(certUrl)},"auth_algo":${JSON.stringify(authAlgo)},"transmission_sig":${JSON.stringify(transmissionSig)},"webhook_id":${JSON.stringify(webhookId)},"webhook_event":${args.rawBody}}`,
      cache: 'no-store',
    });
  } catch (err: any) {
    return { ok: false, reason: `Could not reach PayPal to verify: ${err?.message ?? String(err)}` };
  }

  const body = await res.json().catch(() => ({} as any));
  if (!res.ok) return { ok: false, reason: `Verification call failed (${res.status}).` };
  if (body?.verification_status !== 'SUCCESS') return { ok: false, reason: 'PayPal did not recognise the signature.' };

  return { ok: true };
}

// ── Event → outcome ─────────────────────────────────────────────────────────

/**
 * What a payout webhook means for the row. Returns null for events this platform
 * does not act on, which the route treats as "acknowledge and ignore" rather
 * than as an error — PayPal sends more event types than these.
 *
 * UNCLAIMED is deliberately not a settlement in either direction: the recipient
 * has no PayPal account yet and has 30 days to open one. Calling it paid would
 * be wrong, and calling it failed would send someone to pay it a second time.
 */
export function outcomeForEvent(eventType: string): { outcome: 'paid' | 'failed'; label: string } | null {
  switch (eventType) {
    case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
      return { outcome: 'paid', label: 'SUCCESS' };
    case 'PAYMENT.PAYOUTS-ITEM.FAILED':
      return { outcome: 'failed', label: 'FAILED' };
    case 'PAYMENT.PAYOUTS-ITEM.DENIED':
      return { outcome: 'failed', label: 'DENIED' };
    case 'PAYMENT.PAYOUTS-ITEM.RETURNED':
      return { outcome: 'failed', label: 'RETURNED' };
    case 'PAYMENT.PAYOUTS-ITEM.REFUNDED':
      return { outcome: 'failed', label: 'REFUNDED' };
    case 'PAYMENT.PAYOUTS-ITEM.BLOCKED':
      return { outcome: 'failed', label: 'BLOCKED' };
    default:
      return null;
  }
}
