// Stripe Connect — Express onboarding, and the transfer that pays a seller.
// Server only.
//
// Why this file exists at all, stated once: before it, the seller form asked
// people to *type* an acct_ id and checked only that it started with acct_.
// While nothing sent money that was merely useless. Wired to transfers.create it
// would be a way to be paid someone else's earnings. Every account id this
// platform will send money to is now one it created here, and migration 045
// refuses to dispatch to any other.
//
// Where the money is. Checkout charges the *platform* account (see
// app/api/checkout), so a sale's funds land in Honua's Stripe balance and the
// seller's share is computed in SQL. Paying them is therefore a Transfer —
// platform balance to connected account balance — and Stripe's own payout
// schedule moves it from there to their bank. That is why a transfer succeeding
// is a real settlement and gets written as paid immediately: the money is theirs
// at that moment, even though it reaches their bank a day or two later.
//
// The alternative design is destination charges, where each sale is split at
// checkout and the platform never holds the seller's share. It is the better
// model for a marketplace at scale, and it is a change to checkout rather than
// to payouts, so it is not this file's business.

import type Stripe from 'stripe';
import { connectSupports, connectCountryName } from '@/lib/payout-methods';

const API_VERSION = '2026-06-24.dahlia';

export { connectSupports, connectCountryName };

/** Credentials, or a sentence naming what is missing. Never throws. */
export function stripeConfig(): { secretKey: string } | { error: string } {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return { error: 'Stripe is not configured on the server — STRIPE_SECRET_KEY is unset.' };
  return { secretKey };
}

export const stripeConfigured = (): boolean => 'secretKey' in stripeConfig();

async function client(): Promise<{ stripe: Stripe } | { error: string }> {
  const cfg = stripeConfig();
  if ('error' in cfg) return cfg;
  const Ctor = (await import('stripe')).default;
  return { stripe: new Ctor(cfg.secretKey, { apiVersion: API_VERSION }) };
}

/** The sentence shown to a seller whose country Connect cannot serve. */
export const unsupportedCountryMessage = (countryName: string): string =>
  `Stripe does not support payouts to ${countryName} yet. Connect a bank account instead — payouts there are sent by hand, usually within a working day.`;

// ── Onboarding ──────────────────────────────────────────────────────────────

export type ConnectAccountState = {
  accountId: string;
  country: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  /** The `transfers` capability. This is the one that decides whether we may pay them. */
  transfersEnabled: boolean;
  /** Everything Stripe still wants, stored whole — see migration 045. */
  requirements: Record<string, unknown> | null;
  disabledReason: string | null;
};

const readState = (account: Stripe.Account): ConnectAccountState => ({
  accountId: account.id,
  country: account.country ?? null,
  chargesEnabled: account.charges_enabled === true,
  payoutsEnabled: account.payouts_enabled === true,
  transfersEnabled: account.capabilities?.transfers === 'active',
  requirements: (account.requirements as unknown as Record<string, unknown>) ?? null,
  disabledReason: (account.requirements?.disabled_reason as string | null) ?? null,
});

/**
 * Create an Express account for a seller.
 *
 * `transfers` is the only capability requested. Asking for card_payments would
 * make Stripe collect a great deal more from the seller during onboarding, to
 * enable something they will never use — they are being paid, not taking
 * payments.
 */
export async function createExpressAccount(args: {
  sellerId: string;
  email?: string | null;
  country?: string | null;
}): Promise<{ state: ConnectAccountState } | { error: string }> {
  const c = await client();
  if ('error' in c) return c;

  try {
    const account = await c.stripe.accounts.create({
      type: 'express',
      ...(args.country ? { country: args.country.toUpperCase() } : {}),
      ...(args.email ? { email: args.email } : {}),
      capabilities: { transfers: { requested: true } },
      business_type: 'individual',
      // The seller is paid for goods they sold on Honua, so Honua is what should
      // appear on their statement rather than a name they will not recognise.
      settings: { payouts: { schedule: { interval: 'daily', delay_days: 'minimum' } } },
      metadata: { seller_id: args.sellerId, platform: 'honua' },
    }, {
      // A seller double-clicking Connect must not end up with two Express
      // accounts, only one of which the platform has recorded.
      idempotencyKey: `connect-account-${args.sellerId}`,
    });

    return { state: readState(account) };
  } catch (err: any) {
    return { error: connectError(err) };
  }
}

/**
 * A one-time URL into Stripe's hosted onboarding. These expire in minutes and
 * are single-use, so one is minted per click rather than stored.
 */
export async function onboardingLink(args: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<{ url: string } | { error: string }> {
  const c = await client();
  if ('error' in c) return c;

  try {
    const link = await c.stripe.accountLinks.create({
      account: args.accountId,
      refresh_url: args.refreshUrl,
      return_url: args.returnUrl,
      type: 'account_onboarding',
      collection_options: { fields: 'currently_due' },
    });
    return { url: link.url };
  } catch (err: any) {
    return { error: connectError(err) };
  }
}

/**
 * A link into the Express dashboard, for a seller who has already onboarded and
 * wants to change their bank details or see their Stripe payouts.
 */
export async function dashboardLink(accountId: string): Promise<{ url: string } | { error: string }> {
  const c = await client();
  if ('error' in c) return c;

  try {
    const link = await c.stripe.accounts.createLoginLink(accountId);
    return { url: link.url };
  } catch (err: any) {
    return { error: connectError(err) };
  }
}

/** Read an account's current capability state back from Stripe. */
export async function readAccount(accountId: string): Promise<{ state: ConnectAccountState } | { error: string }> {
  const c = await client();
  if ('error' in c) return c;

  try {
    const account = await c.stripe.accounts.retrieve(accountId);
    return { state: readState(account) };
  } catch (err: any) {
    return { error: connectError(err) };
  }
}

// ── Paying ──────────────────────────────────────────────────────────────────

export type TransferResult = { transferId: string; amountCents: number; currency: string };

/**
 * A string discriminant rather than an `ok` boolean, deliberately. This project
 * compiles with `strict: false`, and without strictNullChecks TypeScript does not
 * narrow a union on a boolean-literal member — `if (!res.ok)` leaves both arms in
 * play and every field access on the result is an error. A named outcome narrows
 * correctly either way, and reads better next to the SQL, which uses the same
 * three words.
 */
export type TransferAttempt =
  | { result: 'sent'; transfer: TransferResult }
  | { result: 'failed'; error: string; transient: boolean };

/**
 * Move money from the platform balance to a connected account.
 *
 * The idempotency key is the payout request id, which is what makes a retry
 * after a timeout safe: Stripe returns the original transfer rather than
 * creating a second one, so the seller cannot be paid twice for the same
 * request no matter how many times the button is pressed or the network fails
 * mid-call. This is the single most important line in the file.
 */
export async function sendTransfer(args: {
  payoutId: string;
  accountId: string;
  cents: number;
  currency?: string;
  sellerHandle?: string | null;
}): Promise<TransferAttempt> {
  const c = await client();
  if ('error' in c) return { result: 'failed', error: c.error, transient: false };

  try {
    const transfer = await c.stripe.transfers.create({
      amount: Math.round(args.cents),
      currency: (args.currency ?? 'usd').toLowerCase(),
      destination: args.accountId,
      description: `Honua seller payout${args.sellerHandle ? ` · @${args.sellerHandle}` : ''}`,
      metadata: { payout_request: args.payoutId, platform: 'honua' },
    }, {
      idempotencyKey: `payout-transfer-${args.payoutId}`,
    });

    return {
      result: 'sent',
      transfer: { transferId: transfer.id, amountCents: transfer.amount, currency: transfer.currency },
    };
  } catch (err: any) {
    return { result: 'failed', error: connectError(err), transient: isTransientStripe(err) };
  }
}

// ── Errors ──────────────────────────────────────────────────────────────────

/**
 * Stripe's messages are unusually good, so most are passed through. The three
 * rewritten below are the ones whose Stripe wording describes the API rather
 * than the situation the admin is actually in.
 */
function connectError(err: any): string {
  const code = err?.code ?? err?.raw?.code ?? '';
  const message = err?.message ?? err?.raw?.message ?? String(err);

  if (code === 'balance_insufficient') {
    return 'The platform Stripe balance does not cover this payout. Funds from recent sales may not have cleared yet — Stripe holds them for a few days before they are available to transfer.';
  }
  // What Stripe says when Connect has never been switched on for the account.
  if (/only .*connect|not have access to Connect|sign up for Connect/i.test(message)) {
    return 'Connect is not enabled on this Stripe account. Turn it on in the Stripe Dashboard under Connect, then try again.';
  }
  if (err?.type === 'StripePermissionError') {
    return `Stripe refused the request: ${message}`;
  }
  if (err?.type === 'StripeAuthenticationError') {
    return 'Stripe rejected the API key. Check STRIPE_SECRET_KEY.';
  }

  return message ? `Stripe: ${message}` : 'Stripe rejected the request.';
}

const isTransientStripe = (err: any): boolean =>
  err?.type === 'StripeConnectionError' ||
  err?.type === 'StripeAPIError' ||
  err?.type === 'StripeRateLimitError';

// ── Webhook events worth acting on ──────────────────────────────────────────

/**
 * A transfer that comes back is money returning to the platform balance, which
 * means the seller was not paid after all. Their payout has to leave 'paid', or
 * the console shows a settlement that undid itself.
 *
 * Note there is no 'transfer.failed' — Stripe transfers do not fail
 * asynchronously. A transfer either raises at creation or succeeds; reversal is
 * the only later reversal of fortune.
 */
export function transferOutcome(eventType: string): { outcome: 'failed'; label: string } | null {
  switch (eventType) {
    case 'transfer.reversed':
      return { outcome: 'failed', label: 'REVERSED' };
    default:
      return null;
  }
}
