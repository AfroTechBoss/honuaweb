// Client half of the admin carbon-credit CRUD. Every call goes through
// /api/admin/carbon-credits, which verifies the caller's Privy token before it
// touches the table with the service-role key — the admin console has no
// Supabase session of its own, so it cannot write to carbon_credits directly.
//
// Each function returns the error text the server gave rather than a bare
// boolean: a listing that silently fails to save is worse than one that says why.

export const CREDIT_TAGS = ['Verified', 'Premium', 'Removal'];

export type AdminCredit = {
  id: string;
  name: string;
  region: string | null;
  type: string | null;
  verifier: string | null;
  vintage: string | null;
  price_cents: number;
  volume_t: number;
  tag: string;
  active: boolean;
  created_at: string;
  // Aggregated from carbon_purchases — only the server can see these, since
  // buyers can only read their own retirements under RLS.
  retired_t: number;
  revenue_cents: number;
  orders: number;
};

export type CreditFields = {
  name: string;
  region: string;
  type: string;
  verifier: string;
  vintage: string;
  price_cents: number;
  volume_t: number;
  tag: string;
  active?: boolean;
};

const ENDPOINT = '/api/admin/carbon-credits';

async function call(token: string | null, method: string, body?: any): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Your admin session has expired — sign in again' };
  try {
    const res = await fetch(ENDPOINT, {
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

export async function listAdminCredits(token: string | null): Promise<{ credits?: AdminCredit[]; error?: string }> {
  const { data, error } = await call(token, 'GET');
  if (error) return { error };
  return { credits: (data?.credits ?? []) as AdminCredit[] };
}

export async function createAdminCredit(token: string | null, f: CreditFields): Promise<{ credit?: AdminCredit; error?: string }> {
  const { data, error } = await call(token, 'POST', f);
  return error ? { error } : { credit: data?.credit as AdminCredit };
}

export async function updateAdminCredit(token: string | null, id: string, f: Partial<CreditFields>): Promise<{ credit?: AdminCredit; error?: string }> {
  const { data, error } = await call(token, 'PATCH', { id, ...f });
  return error ? { error } : { credit: data?.credit as AdminCredit };
}

export async function deleteAdminCredit(token: string | null, id: string): Promise<{ error?: string }> {
  const { error } = await call(token, 'DELETE', { id });
  return error ? { error } : {};
}
