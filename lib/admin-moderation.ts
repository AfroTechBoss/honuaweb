// Client half of moderation: the community-report queue and account standing.
//
// Both used to be `supabase.from(...)` calls made straight from the console.
// Neither worked. The console authenticates with Privy, so `auth.uid()` is null
// inside every RLS policy it meets — the reports table's three policies (009)
// are written for reporters and community owners, and an admin matched none of
// them. Reads came back empty and writes matched zero rows, which PostgREST
// reports as success. The screens then rendered their own optimistic state, so
// the failure was invisible from the outside.
//
// Everything here goes through a server route holding the service-role key,
// which is the only place on the platform that can see the whole queue or
// change someone's standing.

export type ReportStatus = 'pending' | 'owner_actioned' | 'escalated' | 'admin_resolved' | 'dismissed';

export type CommunityReport = {
  id: string;
  type: string;
  reason: string;
  note: string | null;
  status: ReportStatus;
  community: { id: string; name: string } | null;
  comment: { id: string; body: string; author: string | null } | null;
  reporter: { id: string; handle: string | null; name: string | null; avatarUrl: string | null } | null;
  ownerAction: string | null;
  ownerNote: string | null;
  ownerActionedAt: string | null;
  adminNote: string | null;
  adminActionedAt: string | null;
  createdAt: string;
};

export type AccountStanding = 'active' | 'suspended' | 'banned';

export type AdminMember = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  city: string;
  role: string;
  status: AccountStanding;
  impact: number;
  posts: number;
  reports: number;
  joined: string;
  suspendedUntil: string | null;
  suspendedReason: string | null;
  bannedAt: string | null;
  bannedReason: string | null;
  /** profiles.verified — the blue tick, granted only by /api/admin/verification. */
  verified: boolean;
  verifiedAt: string | null;
  _db: true;
};

async function call(token: string | null, url: string, method = 'GET', body?: any): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Your admin session has expired — sign in again' };
  try {
    const res = await fetch(url, {
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

// ── Community reports ───────────────────────────────────────────────────────

export async function listReports(
  token: string | null,
  status?: string,
): Promise<{ reports: CommunityReport[]; available: boolean; pending: number | null; canAct: boolean; error?: string }> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const { data, error } = await call(token, `/api/admin/community-reports${query}`);
  if (error) return { reports: [], available: false, pending: null, canAct: false, error };
  return {
    reports: (data?.reports ?? []) as CommunityReport[],
    // False means migration 041 is missing, which is a different thing from an
    // empty queue. The screen says so rather than showing "All clear".
    available: !!data?.available,
    pending: data?.pending ?? null,
    canAct: !!data?.canAct,
  };
}

export async function resolveReport(
  token: string | null,
  input: { id: string; status: ReportStatus; note?: string; actorLabel?: string },
): Promise<{ report?: { id: string; status: ReportStatus }; error?: string }> {
  const { data, error } = await call(token, '/api/admin/community-reports', 'PATCH', input);
  if (error) return { error };
  return { report: data?.report };
}

// ── Account standing ────────────────────────────────────────────────────────

export async function listMembers(
  token: string | null,
): Promise<{ users: AdminMember[]; available: boolean; canSuspend: boolean; canBan: boolean; error?: string }> {
  const { data, error } = await call(token, '/api/admin/users');
  if (error) return { users: [], available: false, canSuspend: false, canBan: false, error };
  return {
    users: (data?.users ?? []) as AdminMember[],
    available: !!data?.available,
    canSuspend: !!data?.canSuspend,
    canBan: !!data?.canBan,
  };
}

export async function setAccountStatus(
  token: string | null,
  input: { id: string; action: 'suspend' | 'ban' | 'reinstate'; days?: number; reason?: string; actorLabel?: string },
): Promise<{ user?: { id: string; handle: string | null; status: AccountStanding; suspendedUntil: string | null }; error?: string }> {
  const { data, error } = await call(token, '/api/admin/users', 'PATCH', input);
  if (error) return { error };
  return { user: data?.user };
}

/**
 * The community role on profiles. Same PATCH, different gate: this one needs
 * roles.manage, because moderator and admin are grants rather than sanctions.
 */
export async function setMemberRole(
  token: string | null,
  input: { id: string; role: 'Member' | 'Moderator' | 'Admin'; actorLabel?: string },
): Promise<{ user?: { id: string; handle: string | null; role: 'Member' | 'Moderator' | 'Admin' }; error?: string }> {
  const { data, error } = await call(token, '/api/admin/users', 'PATCH', { ...input, action: 'role' });
  if (error) return { error };
  return { user: data?.user };
}

/** "for 7 more days" / "until 12 Aug". Null once it has lapsed. */
export function suspensionRemaining(until: string | null | undefined): string | null {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  if (!(ms > 0)) return null;
  const days = Math.ceil(ms / 86_400_000);
  if (days > 1) return `${days} days left`;
  const hours = Math.ceil(ms / 3_600_000);
  return hours > 1 ? `${hours} hours left` : 'less than an hour left';
}
