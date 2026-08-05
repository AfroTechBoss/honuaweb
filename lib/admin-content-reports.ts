// Client half of the content moderation queue.
//
// See app/api/admin/content-reports for why none of this is a Supabase call:
// migration 046's policies are keyed on `reporter_id = auth.uid()`, and the
// console signs in with Privy, so auth.uid() is null for every request it makes.

export type ReportTargetType = 'post' | 'comment' | 'profile' | 'product';
export type ContentReportStatus = 'pending' | 'actioned' | 'dismissed';

export type ReportedPerson = {
  id: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  verified: boolean;
  status: 'active' | 'suspended' | 'banned';
};

/** One card in the queue: everything reported about a single piece of content. */
export type ReportedTarget = {
  key: string;
  targetType: ReportTargetType;
  targetId: string;
  /** False when the target has since been deleted — the card says so. */
  exists: boolean;
  title: string;
  excerpt: string;
  image: string | null;
  postId: string | null;
  removed: boolean;
  removedReason: string | null;
  /** False for profiles: an account is suspended, not removed. */
  removable: boolean;
  author: ReportedPerson | null;
  reports: number;
  reasons: string[];
  notes: string[];
  reporters: ReportedPerson[];
  reportIds: string[];
  pending: number;
  status: ContentReportStatus;
  adminNote: string | null;
  adminLabel: string | null;
  adminActionedAt: string | null;
  firstAt: string;
  lastAt: string;
};

export type ContentReportCounts = { pending: number; actioned: number; dismissed: number; open: number };

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

export async function listContentReports(
  token: string | null,
  status: ContentReportStatus | 'all' = 'pending',
): Promise<{
  queue: ReportedTarget[];
  counts: ContentReportCounts | null;
  available: boolean;
  canAct: boolean;
  canSuspend: boolean;
  error?: string;
}> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const { data, error } = await call(token, `/api/admin/content-reports${query}`);
  if (error) return { queue: [], counts: null, available: false, canAct: false, canSuspend: false, error };
  return {
    queue: (data?.queue ?? []) as ReportedTarget[],
    counts: (data?.counts ?? null) as ContentReportCounts | null,
    // False means migration 046 has not been applied — a different thing from
    // an empty queue, and the screen distinguishes them.
    available: !!data?.available,
    canAct: !!data?.canAct,
    canSuspend: !!data?.canSuspend,
  };
}

/** `note` is required on `remove` — the author can appeal it and will read it. */
export async function decideContentReport(
  token: string | null,
  input: {
    targetType: ReportTargetType;
    targetId: string;
    decision: 'remove' | 'restore' | 'dismiss';
    note?: string;
    actorLabel?: string;
  },
): Promise<{ target?: { status: ContentReportStatus; removed: boolean | null; adminNote: string | null }; closed?: number; error?: string }> {
  const { data, error } = await call(token, '/api/admin/content-reports', 'PATCH', input);
  if (error) return { error };
  return { target: data?.target, closed: data?.closed };
}
