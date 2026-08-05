// Client half of the payout queue. Every call goes through /api/admin/payouts,
// which verifies the Privy token and checks `payouts.manage` before touching the
// table with the service-role key.
//
// Worth stating what this replaces. The console's payouts screen ran on a
// six-entry MOCK_PAYOUTS array with invented trust scores and dispute counts,
// and Approve moved a row in React state. Underneath it, migration 022's real
// table had two admin RLS policies written as
// `exists (select 1 from profiles where id = auth.uid() ...)` — and the console
// authenticates with Privy, so auth.uid() is null on every request it makes.
// Those policies have never once fired. The mock data is the only reason that
// went unnoticed.

/**
 * 'processing' is migration 045's third state: the provider has it and has not
 * settled it. A PayPal batch lives here between submission and its webhook. It
 * is not 'paid', and the difference is the point — submitted money can still be
 * denied, returned, or sit unclaimed for thirty days.
 */
export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'on_hold' | 'processing' | 'paid';
export const PAYOUT_STATUSES: PayoutStatus[] = ['pending', 'approved', 'processing', 'on_hold', 'rejected', 'paid'];

export type PayoutRow = {
  id: string;
  /** Cents throughout — the screen divides once, at the point it renders. */
  amountCents: number;
  feeCents: number;
  netCents: number;
  status: PayoutStatus;
  /** 'automatic' means the kind is *meant* to settle through an API. See below. */
  dispatch: 'manual' | 'automatic';
  rejectReason: string | null;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  paidAt: string | null;
  paidBy: string | null;
  paymentReference: string | null;
  /** Masked. Full details come from `revealDestination`, which is audited. */
  destination: string;
  methodId: string | null;
  methodKind: 'paypal' | 'stripe' | 'uglycash' | 'bank' | null;
  /** Which provider this went out through. Null until it has been dispatched. */
  provider: 'paypal' | 'stripe' | null;
  /** The provider's own id — a Stripe transfer id, a PayPal batch id. */
  providerRef: string | null;
  /** The provider's word for where it is: SUCCESS, PENDING, DENIED, UNCLAIMED. */
  providerStatus: string | null;
  dispatchAttemptedAt: string | null;
  /** Set when the last attempt failed. Its presence is what makes a retry legal. */
  dispatchError: string | null;
  /**
   * Whether Send can do anything. Computed in SQL rather than inferred here, so
   * the button and the route cannot disagree about it — and `dispatchBlocker` is
   * the sentence saying why not, which the screen shows instead of a dead button.
   */
  dispatchable: boolean;
  dispatchBlocker: string | null;
  seller: {
    id: string;
    name: string | null;
    handle: string | null;
    avatarUrl: string | null;
    since: string | null;
    /** Suspended or banned right now. An approval is refused while true. */
    frozen: boolean;
  };
  /**
   * The real numbers behind an approval decision, computed in SQL from
   * delivered order items and prior payouts — not the fabricated trust score the
   * screen used to draw.
   *
   * `availableCents` can be negative: it means payouts were approved above the
   * balance before the guard existed.
   */
  ledger: { earnedCents: number; committedCents: number; availableCents: number };
  signals: { deliveredItems: number; refundedOrders: number; priorPayouts: number };
};

/** Full destination details. Fetching these writes an audit line — see the route. */
export type PayoutDestination = {
  kind: string;
  label: string;
  status: string;
  paypalEmail: string | null;
  stripeAccountId: string | null;
  uglycashHandle: string | null;
  bankCountry: string | null;
  bankCurrency: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankExtra: string | null;
};

const ENDPOINT = '/api/admin/payouts';

async function call(token: string | null, method: string, body?: any, query = ''): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Your admin session has expired — sign in again' };
  try {
    const res = await fetch(ENDPOINT + query, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { error: payload?.error ?? `Request failed (${res.status})` };
    return { data: payload };
  } catch {
    return { error: 'Could not reach the server' };
  }
}

export async function listPayouts(
  token: string | null,
  opts: { status?: string; limit?: number } = {},
): Promise<{ payouts?: PayoutRow[]; pending?: number; available?: boolean; canManage?: boolean; error?: string }> {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  const { data, error } = await call(token, 'GET', undefined, q ? `?${q}` : '');
  if (error) return { error };
  return {
    payouts: (data?.payouts ?? []) as PayoutRow[],
    pending: data?.pending ?? undefined,
    available: data?.available !== false,
    canManage: data?.canManage === true,
  };
}

/**
 * Approve, reject or hold.
 *
 * Approval is refused server-side when the amount exceeds what the seller has
 * actually earned, when their account is frozen, or when no payout method is
 * attached. Those refusals come back as `error` text written for the admin
 * reading them — they name both numbers, so "why can't I approve this" is
 * answered in the message rather than in the logs.
 *
 * Note what approving does *not* do: it does not send money. See `markPaid`.
 */
export async function reviewPayout(
  token: string | null,
  id: string,
  status: 'approved' | 'rejected' | 'on_hold',
  note?: string,
  actorLabel?: string | null,
): Promise<{ payout?: Partial<PayoutRow>; error?: string }> {
  const { data, error } = await call(token, 'PATCH', { id, status, note, actorLabel });
  return error ? { error } : { payout: data?.payout };
}

/**
 * Records that a person sent the money, against a reference.
 *
 * The only path for UglyCash and bank transfers, which have no API to call, and
 * the fallback everywhere else — including confirming a PayPal batch by hand
 * when its webhook never arrived. It will not record a payout as sent without a
 * reference someone can be held to.
 *
 * Deliberately separate from approval, and separate from `dispatchPayout` too.
 * An Approve button that implied "sent" would be the most expensive lie the
 * console could tell, so it doesn't.
 */
export async function markPayoutPaid(
  token: string | null,
  id: string,
  reference: string,
  actorLabel?: string | null,
): Promise<{ payout?: Partial<PayoutRow>; error?: string }> {
  const { data, error } = await call(token, 'POST', { id, action: 'paid', reference, actorLabel });
  return error ? { error } : { payout: data?.payout };
}

/**
 * Sends it, through Stripe or PayPal.
 *
 * The one call in the console that moves money on its own, so it is its own
 * button and never a consequence of approving. What comes back distinguishes
 * three real outcomes rather than two:
 *
 *   `sent`       Stripe transferred it. The money is the seller's now.
 *   `submitted`  PayPal accepted it and will confirm later. Not sent yet.
 *   `error`      it did not go, and `retryable` says whether pressing Send again
 *                is worth anything. The payout returns to `approved` either way,
 *                with the provider's reason kept on the row.
 *
 * `duplicate` is a fourth, narrower case: PayPal already had a batch under this
 * payout's id, so nothing was sent a second time. It is reported as submitted,
 * because the money is with PayPal — treating it as a failure would invite
 * someone to pay it again by hand.
 */
export async function dispatchPayout(
  token: string | null,
  id: string,
  actorLabel?: string | null,
): Promise<{
  payout?: Partial<PayoutRow>;
  sent?: boolean;
  submitted?: boolean;
  duplicate?: boolean;
  message?: string;
  error?: string;
}> {
  const { data, error } = await call(token, 'POST', { id, action: 'dispatch', actorLabel });
  if (error) return { error };
  return {
    payout: data?.payout,
    sent: data?.sent === true,
    submitted: data?.submitted === true,
    duplicate: data?.duplicate === true,
    message: data?.message,
  };
}

/**
 * The full destination, for whoever is sending the transfer by hand.
 *
 * Not part of the queue payload on purpose. Reading it writes a line to
 * admin_audit_log in the same transaction, so there is no way to take someone's
 * bank details without leaving the trace.
 */
export async function revealDestination(
  token: string | null,
  id: string,
  actorLabel?: string | null,
): Promise<{ destination?: PayoutDestination; error?: string }> {
  const { data, error } = await call(token, 'POST', { id, action: 'reveal', actorLabel });
  return error ? { error } : { destination: data?.destination as PayoutDestination };
}
