// Client half of the Roles page. Everything goes through /api/admin/members,
// which verifies the Privy token and resolves it to a stored role before it
// changes anything — the console has no Supabase session, and admin_members is
// RLS-sealed with no policies, so there is no direct read to fall back to.
//
// Errors come back as text, same as lib/admin-orders.ts. On this screen the
// distinction matters more than most: "you cannot change your own role" and
// "this is the last owner" are both refusals the person needs to read, not
// generic failures to retry.

import type { AdminRole } from "@/lib/admin-permissions";

export type AdminMember = {
  did: string;
  email: string | null;
  name: string | null;
  handle: string | null;
  avatarUrl: string | null;
  role: AdminRole;
  /** 'bootstrap' for the seeded owner, 'auto' for self-enrolment, else a DID. */
  addedBy: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isSelf: boolean;
};

export type RosterResult = {
  members?: AdminMember[];
  /** False when migration 040 has not been applied. */
  available?: boolean;
  /** The caller's own role. 'owner' as a stand-in while `available` is false. */
  role?: AdminRole;
  adminId?: string;
  canAssign?: AdminRole[];
  error?: string;
};

const ENDPOINT = '/api/admin/members';

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

/**
 * The roster, plus who the caller is.
 *
 * `identity` is the caller's own email and name from the Privy session. It is
 * sent so their row on the roster carries a label instead of a bare DID — the
 * server cannot derive it, since the access token has no email claim.
 */
export async function listMembers(
  token: string | null,
  identity?: { email?: string | null; name?: string | null },
): Promise<RosterResult> {
  const params = new URLSearchParams();
  if (identity?.email) params.set('email', identity.email);
  if (identity?.name) params.set('name', identity.name);
  const query = params.toString();

  const { data, error } = await call(token, 'GET', undefined, query ? `?${query}` : '');
  if (error) return { error };
  return {
    members: (data?.members ?? []) as AdminMember[],
    available: data?.available !== false,
    role: (data?.role ?? 'owner') as AdminRole,
    adminId: data?.adminId ?? '',
    canAssign: (data?.canAssign ?? []) as AdminRole[],
  };
}

export async function setMemberRole(
  token: string | null,
  did: string,
  role: AdminRole,
  reason?: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { error } = await call(token, 'PATCH', { did, role, reason: reason ?? '' });
  return error ? { error } : { ok: true };
}

export async function removeMember(token: string | null, did: string): Promise<{ ok?: boolean; error?: string }> {
  const { error } = await call(token, 'DELETE', undefined, `?did=${encodeURIComponent(did)}`);
  return error ? { error } : { ok: true };
}

/** "3 days ago" for the last-seen column. */
export function relativeSeen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** "Jan 2024" for the joined column. */
export function monthYear(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
}
