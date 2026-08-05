// Client half of the appeals queue. Every call goes through /api/admin/appeals,
// which verifies the caller's Privy token and checks `appeals.resolve` before
// touching the table with the service-role key. The console has no Supabase
// session, and migration 043's table is sealed — RLS on with zero policies — so
// there is no direct read even in principle.
//
// Errors come back as text rather than a boolean, for the reason in
// lib/admin-support.ts: a queue that silently fails to load is indistinguishable
// from a queue with nothing in it, and "no appeals" is a dangerous thing for
// this screen to say when it isn't true.

export type AppealStatus = 'open' | 'upheld' | 'overturned';
export const APPEAL_STATUSES: AppealStatus[] = ['open', 'upheld', 'overturned'];

export type Appeal = {
  id: string;
  ref: string;
  kind: string;
  status: AppealStatus;
  target: string | null;
  reason: string;
  resolution: string | null;
  resolvedLabel: string | null;
  resolvedAt: string | null;
  seen: boolean;
  createdAt: string;
  user: {
    id: string | null;
    handle: string | null;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
    /** Live standing, so a reviewer can see whether the restriction still bites. */
    suspendedUntil: string | null;
    bannedAt: string | null;
  };
  /**
   * The original action, read from moderation_actions rather than retyped by the
   * appellant. Null when there is no matching record — an appeal about a removed
   * post has no suspension behind it, and older suspensions predate migration
   * 041's record table.
   */
  originalAction: { kind: string; reason: string | null; at: string; by: string | null } | null;
};

const ENDPOINT = '/api/admin/appeals';

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

export async function listAppeals(
  token: string | null,
  opts: { status?: string; limit?: number } = {},
): Promise<{ appeals?: Appeal[]; open?: number; available?: boolean; canResolve?: boolean; error?: string }> {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  const { data, error } = await call(token, 'GET', undefined, q ? `?${q}` : '');
  if (error) return { error };
  return {
    appeals: (data?.appeals ?? []) as Appeal[],
    open: data?.open ?? undefined,
    available: data?.available !== false,
    canResolve: data?.canResolve === true,
  };
}

/**
 * Upholds or overturns an appeal.
 *
 * `resolution` is required by the database, not just by the form: closing an
 * appeal without saying why leaves the appellant knowing only that they lost.
 *
 * Note what this does *not* do — overturning an appeal does not lift the
 * suspension. Reinstating an account is `users.suspend` / `users.ban` territory
 * and goes through /api/admin/users, so a moderator holding only
 * `appeals.resolve` cannot use this screen as a way around that gate. The
 * response carries the appellant's id so the console can offer reinstatement as
 * an explicit next step, checked on its own terms.
 */
export async function resolveAppeal(
  token: string | null,
  id: string,
  outcome: 'upheld' | 'overturned',
  resolution: string,
  actorLabel?: string | null,
): Promise<{ appeal?: Appeal; error?: string }> {
  const { data, error } = await call(token, 'PATCH', { id, status: outcome, resolution, actorLabel });
  return error ? { error } : { appeal: data?.appeal as Appeal };
}
