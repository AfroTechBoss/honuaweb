// Client half of the seller application queue.
//
// The console used to read seller_applications straight from the browser. It
// could not work: migration 017's policies are keyed on auth.uid(), and the
// console holds a Privy session, not a Supabase one. See app/api/admin/sellers.

export type SellerApplicationStatus = 'pending' | 'approved' | 'rejected';

export type AdminSellerApplication = {
  id: string;
  userId: string | null;
  shop: string;
  shopHandle: string | null;
  tagline: string | null;
  applicant: string;
  handle: string;
  avatar: string | null;
  verified: boolean;
  accountStatus: 'active' | 'suspended' | 'banned';
  categories: string[];
  type: string;
  country: string;
  shipsTo: string | null;
  legalName: string | null;
  bizType: string | null;
  payoutMethod: string | null;
  impact: string;
  practices: string[];
  certs: string[];
  status: SellerApplicationStatus;
  notes: string | null;
  submitted: string;
  submittedAt: string | null;
  reviewedAt: string | null;
};

export type SellerCounts = { pending: number; approved: number; rejected: number };

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

export async function listSellerApplications(
  token: string | null,
  status: SellerApplicationStatus | 'all' = 'pending',
): Promise<{ applications: AdminSellerApplication[]; counts: SellerCounts | null; available: boolean; canReview: boolean; error?: string }> {
  const { data, error } = await call(token, `/api/admin/sellers?status=${encodeURIComponent(status)}`);
  if (error) return { applications: [], counts: null, available: false, canReview: false, error };
  return {
    applications: (data?.applications ?? []) as AdminSellerApplication[],
    counts: (data?.counts ?? null) as SellerCounts | null,
    // False means migration 017 is missing — a different thing from an empty
    // queue, and the screen says which.
    available: !!data?.available,
    canReview: !!data?.canReview,
  };
}

/** `notes` is optional on approve and required on decline — the applicant reads it. */
export async function decideSellerApplication(
  token: string | null,
  id: string,
  decision: 'approve' | 'decline',
  notes: string,
  actorLabel?: string,
): Promise<{ application?: AdminSellerApplication; error?: string }> {
  const { data, error } = await call(token, '/api/admin/sellers', 'PATCH', { id, decision, notes, actorLabel });
  if (error) return { error };
  return { application: data?.application as AdminSellerApplication };
}
