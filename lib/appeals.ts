// Client half of the appeal form. Ships in the public bundle — the admin
// counterpart lives in lib/admin-appeals.ts and must stay out of here.
//
// Same split, and for the same reason, as lib/support.ts: the server validates
// against these exact constants, so a kind the API rejects would be a dropdown
// option that silently loses someone's appeal. There is one place to edit it.

// The value is what the database stores (migration 043's CHECK), the label is
// what the person filing reads. They differ because 'seller_rejection' is a
// column value and "My seller application was rejected" is a sentence.
export const APPEAL_KINDS = [
  { value: 'suspension',       label: 'My account was suspended' },
  { value: 'ban',              label: 'My account was banned' },
  { value: 'post_removal',     label: 'A post of mine was removed' },
  { value: 'product_removal',  label: 'A listing of mine was removed' },
  { value: 'seller_rejection', label: 'My seller application was rejected' },
  { value: 'other',            label: 'Something else' },
] as const;

export type AppealKind = (typeof APPEAL_KINDS)[number]['value'];

export const APPEAL_KIND_VALUES: readonly string[] = APPEAL_KINDS.map(k => k.value);

export const appealKindLabel = (v: string): string =>
  APPEAL_KINDS.find(k => k.value === v)?.label ?? 'Appeal';

// Short forms for the console's queue cards, where the full sentence above is
// too long to sit on a chip.
export const APPEAL_KIND_SHORT: Record<string, string> = {
  suspension: 'Suspension',
  ban: 'Ban',
  post_removal: 'Post removal',
  product_removal: 'Listing removal',
  seller_rejection: 'Seller rejection',
  other: 'Other',
};

// Only these two kinds are about the account as a whole. The rest are about a
// specific thing, so the form asks which one — see `target` below.
export const ACCOUNT_LEVEL_KINDS: readonly string[] = ['suspension', 'ban'];

export const APPEAL_LIMITS = { reason: 5000, target: 200, email: 254, handle: 60 };

export type AppealFields = {
  kind: AppealKind | string;
  reason: string;
  email: string;
  /** The post, listing or order this is about. Ignored for account-level kinds. */
  target?: string;
  /** Self-asserted, and only ever used as a label — see the route. */
  handle?: string;
};

/**
 * Files an appeal.
 *
 * `token` is the appellant's Supabase access token when they still have a
 * session. Optional on purpose: the people who need this route are by
 * definition the ones we have just restricted, and a banned account that can no
 * longer sign in must still be able to argue about it.
 *
 * Never throws. Returns the reference the database assigned, or the reason it
 * failed — a form that claims success on a network error is exactly the bug
 * this whole path replaces.
 */
export async function submitAppeal(
  fields: AppealFields,
  token?: string | null,
): Promise<{ ref?: string; error?: string }> {
  try {
    const res = await fetch('/api/appeals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(fields),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { error: payload?.error ?? `Couldn't send this (${res.status})` };
    return { ref: payload?.ref };
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }
}
