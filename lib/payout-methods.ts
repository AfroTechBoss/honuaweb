// Where a seller's money goes. Shared by the seller's connect form, the route
// that validates it, and the admin queue that renders the result — one table,
// because a country the form offers and the server rejects is a seller who
// cannot be paid.
//
// Four kinds, two dispatch paths:
//
//   paypal, stripe      settle through an API (migration 045, lib/paypal.ts,
//                       lib/stripe-connect.ts)
//   uglycash, bank      sent by a person, who records the reference afterwards
//
// The manual pair is not a fallback. Stripe Connect does not operate in Nigeria,
// Ghana or Kenya, and PayPal is awkward in several more — for a large share of
// this platform's sellers the bank-transfer path is the only path, and it is
// held to the same standard as the automated one.
//
// Automatic dispatch is available only where its credentials are: Stripe needs
// Connect switched on for the platform account, PayPal needs PAYPAL_CLIENT_ID /
// PAYPAL_CLIENT_SECRET and the Payouts feature granted. Where they are absent
// the console disables Send and names what is missing, and the payout goes out by
// hand exactly as before — `dispatch` records which kinds are *meant* to
// automate, and never asserts that anything settled. Only a recorded reference
// does that.

export const PAYOUT_KINDS = ['paypal', 'stripe', 'uglycash', 'bank'] as const;
export type PayoutKind = (typeof PAYOUT_KINDS)[number];

export const PAYOUT_KIND_LABEL: Record<PayoutKind, string> = {
  paypal: 'PayPal',
  stripe: 'Stripe',
  uglycash: 'UglyCash',
  bank: 'Bank transfer',
};

export const AUTOMATIC_KINDS: readonly PayoutKind[] = ['paypal', 'stripe'];

export const dispatchFor = (kind: PayoutKind | string): 'automatic' | 'manual' =>
  (AUTOMATIC_KINDS as readonly string[]).includes(kind) ? 'automatic' : 'manual';

export type PayoutMethod = {
  id: string;
  kind: PayoutKind;
  label: string;
  isPrimary: boolean;
  status: 'unverified' | 'verified' | 'disabled';
  /** Which fields are set, never the values — see the note on masking below. */
  bankCountry: string | null;
  bankCurrency: string | null;
  createdAt: string;
  /**
   * Whether Send can reach this destination without a person. Computed on the
   * server from the row, not from `kind` — a stripe row typed in by hand is not
   * automatic no matter what `dispatchFor` says about the kind.
   */
  automatic: boolean;
};

// ── Bank transfer: country drives currency and the second identifier ─────────
//
// `extra` is one column in the database because which identifier a country wants
// is a function of the country. Four mutually exclusive columns would be four
// ways to store the same fact and four chances to read the wrong one.
//
// Not exhaustive, and does not pretend to be: this is the set the platform can
// actually pay into today. A country missing from it is a seller who should use
// PayPal, which is the honest answer rather than a form that accepts details
// nobody can send money to.

export type BankCountry = {
  code: string;
  name: string;
  currency: string;
  /** What the second identifier is called where the seller lives. */
  extraLabel: string;
  /** Shown under the field. Empty when the label speaks for itself. */
  extraHint?: string;
  /** Regex the route also applies. Loose on purpose — see validateBank below. */
  accountPattern?: RegExp;
};

export const BANK_COUNTRIES: readonly BankCountry[] = [
  { code: 'NG', name: 'Nigeria',        currency: 'NGN', extraLabel: 'Bank code',      extraHint: 'The 3-digit CBN code for your bank', accountPattern: /^\d{10}$/ },
  { code: 'GH', name: 'Ghana',          currency: 'GHS', extraLabel: 'Branch / sort code' },
  { code: 'KE', name: 'Kenya',          currency: 'KES', extraLabel: 'Bank & branch code' },
  { code: 'ZA', name: 'South Africa',   currency: 'ZAR', extraLabel: 'Branch code',    extraHint: '6 digits' },
  { code: 'EG', name: 'Egypt',          currency: 'EGP', extraLabel: 'SWIFT / BIC' },
  { code: 'US', name: 'United States',  currency: 'USD', extraLabel: 'Routing number', extraHint: '9 digits (ABA)', accountPattern: /^\d{4,17}$/ },
  { code: 'CA', name: 'Canada',         currency: 'CAD', extraLabel: 'Transit & institution number' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', extraLabel: 'Sort code',      extraHint: '6 digits, e.g. 04-00-04', accountPattern: /^\d{8}$/ },
  { code: 'IE', name: 'Ireland',        currency: 'EUR', extraLabel: 'IBAN' },
  { code: 'DE', name: 'Germany',        currency: 'EUR', extraLabel: 'IBAN' },
  { code: 'FR', name: 'France',         currency: 'EUR', extraLabel: 'IBAN' },
  { code: 'NL', name: 'Netherlands',    currency: 'EUR', extraLabel: 'IBAN' },
  { code: 'ES', name: 'Spain',          currency: 'EUR', extraLabel: 'IBAN' },
  { code: 'IT', name: 'Italy',          currency: 'EUR', extraLabel: 'IBAN' },
  { code: 'PT', name: 'Portugal',       currency: 'EUR', extraLabel: 'IBAN' },
  { code: 'AU', name: 'Australia',      currency: 'AUD', extraLabel: 'BSB',            extraHint: '6 digits' },
  { code: 'NZ', name: 'New Zealand',    currency: 'NZD', extraLabel: 'Bank & branch number' },
  { code: 'IN', name: 'India',          currency: 'INR', extraLabel: 'IFSC code' },
  { code: 'BR', name: 'Brazil',         currency: 'BRL', extraLabel: 'Agência & conta' },
  { code: 'MX', name: 'Mexico',         currency: 'MXN', extraLabel: 'CLABE',          extraHint: '18 digits' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', extraLabel: 'IBAN' },
];

export const countryFor = (code: string): BankCountry | undefined =>
  BANK_COUNTRIES.find(c => c.code === code);

// ── Where Stripe Connect works ──────────────────────────────────────────────
//
// Kept here rather than in lib/stripe-connect.ts so the seller's form can read
// it: that file imports the Stripe SDK and cannot cross into a client bundle.
// The server imports this list back, so the country the form offers and the
// country Stripe will accept are the same list rather than two lists that drift.
//
// A country's absence is the useful part. Nigeria, Ghana and Kenya are not here
// and will not be, so a seller in Lagos is told to connect a bank account
// instead of being sent to a Stripe page that rejects them at the end. Being
// conservative here costs a message; being wrong the other way costs someone
// twenty minutes and a dead end.
export const CONNECT_COUNTRIES: readonly { code: string; name: string }[] = [
  { code: 'AU', name: 'Australia' },      { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },        { code: 'BG', name: 'Bulgaria' },
  { code: 'BR', name: 'Brazil' },         { code: 'CA', name: 'Canada' },
  { code: 'HR', name: 'Croatia' },        { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' },        { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },        { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },         { code: 'DE', name: 'Germany' },
  { code: 'GI', name: 'Gibraltar' },      { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },      { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },        { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },          { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein' },  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },     { code: 'MY', name: 'Malaysia' },
  { code: 'MT', name: 'Malta' },          { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },    { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },         { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },       { code: 'RO', name: 'Romania' },
  { code: 'SG', name: 'Singapore' },      { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },       { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },         { code: 'CH', name: 'Switzerland' },
  { code: 'TH', name: 'Thailand' },       { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
];

export const connectSupports = (code: string): boolean =>
  CONNECT_COUNTRIES.some(c => c.code === (code ?? '').toUpperCase());

export const connectCountryName = (code: string): string =>
  CONNECT_COUNTRIES.find(c => c.code === (code ?? '').toUpperCase())?.name ?? code;

export const currencyFor = (code: string): string => countryFor(code)?.currency ?? '';

// ── Validation, shared with the route ───────────────────────────────────────
//
// The server re-runs all of this. This copy exists so the form can say what is
// wrong before a round trip, not so the server can trust the client.

export type MethodDraft = {
  kind: PayoutKind;
  paypalEmail?: string;
  stripeAccountId?: string;
  uglycashHandle?: string;
  bankCountry?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankExtra?: string;
  makePrimary?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// $afrotechboss — stored without the $, which the form shows as a prefix and the
// label puts back. Letters, digits, underscore; 2–30, which is what a handle
// looks like everywhere else on the platform.
const UGLYCASH_RE = /^[A-Za-z0-9_]{2,30}$/;

/** Returns the first problem in plain language, or null when the draft is fine. */
export function validateMethod(d: MethodDraft): string | null {
  switch (d.kind) {
    case 'paypal':
      if (!EMAIL_RE.test((d.paypalEmail ?? '').trim())) return 'Enter the email address on your PayPal account.';
      return null;

    case 'stripe':
      // Not validated any more — refused. A Stripe destination used to be an
      // acct_ id the seller typed, checked only for its shape. That was harmless
      // while nothing sent money to it and became a way to be paid someone
      // else's earnings the moment transfers.create was wired, because nothing
      // ever proved the account belonged to the person who typed it.
      //
      // Stripe destinations are now created by /api/payout-methods/connect,
      // against an account this platform opens on the seller's behalf. Rows that
      // predate that keep working for manual sends and can never be
      // auto-dispatched — see migration 045.
      return 'Stripe accounts are connected through Stripe, not entered by hand. Use the Connect with Stripe button.';

    case 'uglycash': {
      const h = (d.uglycashHandle ?? '').trim().replace(/^\$/, '');
      if (!h) return 'Enter your UglyCash handle.';
      if (!UGLYCASH_RE.test(h)) return 'A handle is letters, numbers and underscores — for example $afrotechboss.';
      return null;
    }

    case 'bank': {
      const country = countryFor((d.bankCountry ?? '').trim());
      if (!country) return 'Pick the country your account is held in.';
      if (!(d.bankName ?? '').trim()) return 'Which bank is it?';
      if (!(d.bankAccountName ?? '').trim()) return 'Enter the name on the account.';
      const acct = (d.bankAccountNumber ?? '').replace(/\s/g, '');
      if (!acct) return 'Enter the account number.';
      // Loose by design. A pattern strict enough to be useful in one country
      // rejects valid accounts in another, and the cost of a wrong number here
      // is a transfer that bounces back — not a security boundary.
      if (country.accountPattern && !country.accountPattern.test(acct)) {
        return `That account number doesn't look right for ${country.name}.`;
      }
      if (!(d.bankExtra ?? '').trim()) return `Enter your ${country.extraLabel.toLowerCase()}.`;
      return null;
    }

    default:
      return 'Pick how you want to be paid.';
  }
}

// ── Labels ──────────────────────────────────────────────────────────────────
//
// Built on the server and stored, so the queue, the seller's history and the
// audit log all read the same string. Never contains a full account number:
// the admin queue shows this, and revealing the real details is a separate call
// that writes an audit line.

export const maskTail = (v: string, keep = 4): string => {
  const s = (v ?? '').replace(/\s/g, '');
  return s.length <= keep ? s : `••${s.slice(-keep)}`;
};

export function labelFor(d: MethodDraft): string {
  switch (d.kind) {
    case 'paypal': {
      const [user, domain] = (d.paypalEmail ?? '').trim().toLowerCase().split('@');
      // First character plus the domain. Enough for the seller to recognise
      // which of their addresses it is, not enough to be an address.
      return `PayPal ${user?.[0] ?? ''}•••@${domain ?? ''}`;
    }
    case 'stripe':
      return `Stripe ${maskTail((d.stripeAccountId ?? '').trim(), 6)}`;
    case 'uglycash':
      // Shown whole: a $handle is how people pay each other on UglyCash, it is
      // meant to be quoted, and masking it would make the queue unusable for the
      // person sending the money.
      return `UglyCash $${(d.uglycashHandle ?? '').trim().replace(/^\$/, '')}`;
    case 'bank': {
      const c = countryFor((d.bankCountry ?? '').trim());
      const bank = (d.bankName ?? '').trim() || 'Bank';
      return `${bank} ${maskTail(d.bankAccountNumber ?? '')} · ${c?.currency ?? ''}`.trim();
    }
    default:
      return 'Payout method';
  }
}

// ── Client calls ────────────────────────────────────────────────────────────

const ENDPOINT = '/api/payout-methods';

async function call(token: string | null, method: string, body?: any, query = ''): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Sign in again to manage payout methods' };
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

export async function listPayoutMethods(token: string | null): Promise<{ methods?: PayoutMethod[]; available?: boolean; error?: string }> {
  const { data, error } = await call(token, 'GET');
  if (error) return { error };
  return { methods: (data?.methods ?? []) as PayoutMethod[], available: data?.available !== false };
}

export async function addPayoutMethod(token: string | null, draft: MethodDraft): Promise<{ method?: PayoutMethod; error?: string }> {
  const local = validateMethod(draft);
  if (local) return { error: local };
  const { data, error } = await call(token, 'POST', draft);
  return error ? { error } : { method: data?.method as PayoutMethod };
}

export async function setPrimaryPayoutMethod(token: string | null, id: string): Promise<{ error?: string }> {
  const { error } = await call(token, 'PATCH', { id, isPrimary: true });
  return { error };
}

export async function removePayoutMethod(token: string | null, id: string): Promise<{ error?: string }> {
  const { error } = await call(token, 'DELETE', { id });
  return { error };
}

// ── Stripe Connect ──────────────────────────────────────────────────────────
//
// A separate endpoint from the four above, because a Connect account is not a
// detail the seller types — it is an account Stripe opens for them under this
// platform, and the id comes back from Stripe rather than from a form. The two
// paths stay apart all the way down: migration 045 will not auto-dispatch to a
// stripe row whose `stripe_onboarded_at` is null, which is exactly the set of
// rows created by someone pasting an `acct_` id into the other form.

const CONNECT_ENDPOINT = '/api/payout-methods/connect';

async function connectCall(token: string | null, method: string, body?: any): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Sign in again to connect Stripe' };
  try {
    const res = await fetch(CONNECT_ENDPOINT, {
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

/**
 * What the seller's Stripe connection can actually do.
 *
 * `canReceive` and `canPayOut` are two different permissions and are kept apart
 * on purpose. `canReceive` is whether this platform may transfer money into the
 * account — without it, Send is refused. `canPayOut` is whether Stripe may then
 * move it to their bank; false there is not a blocker for the transfer, but it
 * means the money sits in their Stripe balance, which is worth saying out loud.
 */
export type ConnectState = {
  methodId: string | null;
  accountId: string | null;
  country: string | null;
  isPrimary: boolean;
  canReceive: boolean;
  canPayOut: boolean;
  requirementsDue: string[];
  disabledReason: string | null;
  syncedAt: string | null;
};

export type ConnectStatus = {
  connected: boolean;
  /** False when Stripe is unconfigured or migration 045 has not been applied. */
  available: boolean;
  state?: ConnectState;
  /** Stripe was unreachable, so `state` is the last known flags rather than fresh. */
  staleReason?: string;
  reason?: string;
  error?: string;
};

/** Read-through to Stripe on every call — see the route. Cheap enough, and it is what the seller lands on after onboarding. */
export async function getConnectStatus(token: string | null): Promise<ConnectStatus> {
  const { data, error } = await connectCall(token, 'GET');
  if (error) return { connected: false, available: false, error };
  return {
    connected: data?.connected === true,
    available: data?.available !== false,
    state: data?.state as ConnectState | undefined,
    staleReason: data?.staleReason,
    reason: data?.reason,
  };
}

/**
 * Start onboarding, resume it, or open their Express dashboard.
 *
 * All three return a Stripe URL to send the seller to, and all three links are
 * single-use and expire in minutes — so this is called on the click, never
 * ahead of it to have a href ready.
 *
 * `country` is only read when opening a new account, and only from
 * `CONNECT_COUNTRIES`; the route re-checks it and refuses the rest with a
 * message naming the alternative that does work for them.
 */
export async function startConnect(
  token: string | null,
  opts: { country?: string; action?: 'resume' | 'dashboard'; makePrimary?: boolean } = {},
): Promise<{ url?: string; accountId?: string; resumed?: boolean; error?: string }> {
  const { data, error } = await connectCall(token, 'POST', opts);
  if (error) return { error };
  return { url: data?.url, accountId: data?.accountId, resumed: data?.resumed === true };
}
