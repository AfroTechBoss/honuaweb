// Client half of the verification queue. Every call goes through
// /api/admin/verification, which verifies the caller's Privy token before it
// touches the table with the service-role key — the admin console has no
// Supabase session of its own, and `verified` is guarded against anon and
// authenticated writers by migration 030 regardless.

export type VerificationApplicant = {
  id: string;
  handle: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  verified: boolean;
  // Only present once migration 029 is applied; the route drops the column
  // rather than 500 on a database that's a migration behind.
  verified_at?: string | null;
  impact_score: number;
  created_at: string;
  // Signals a reviewer would otherwise have to go digging for.
  followers: number;
  posts: number;
  verified_actions: number;
  email: string | null;
};

export type AdminVerificationRequest = {
  id: string;
  user_id: string;
  // 'revoked' rows are written when a badge is taken away — the reviewer side
  // sees them in the same queue, which the applicant-facing type never does.
  status: "pending" | "approved" | "rejected" | "revoked";
  category: string | null;
  real_name: string | null;
  links: string | null;
  note: string | null;
  reviewer_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  applicant: VerificationApplicant | null;
};

const ENDPOINT = "/api/admin/verification";

async function call(token: string | null, method: string, body?: any, query = ""): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: "Your admin session has expired — sign in again" };
  try {
    const res = await fetch(ENDPOINT + query, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { error: payload?.error ?? `Request failed (${res.status})` };
    return { data: payload };
  } catch {
    return { error: "Could not reach the server" };
  }
}

// `verified` is who carries the badge right now, read off profiles rather than
// counted from approved applications — accounts verified before this queue
// existed have no application at all, and they still have the badge.
//
// The route can return rows *and* an error together (the queue table missing
// doesn't stop the verified list from loading), so this passes both through
// instead of treating an error as "nothing came back".
export async function listVerificationRequests(token: string | null): Promise<{
  requests?: AdminVerificationRequest[];
  verified?: VerificationApplicant[];
  error?: string;
}> {
  const { data, error } = await call(token, "GET");
  if (error) return { error };
  return {
    requests: (data?.requests ?? []) as AdminVerificationRequest[],
    verified: (data?.verified ?? []) as VerificationApplicant[],
    error: data?.error,
  };
}

// For the direct-grant picker: handle or name, decorated with the same signals
// the queue shows, so a reviewer can tell two similar handles apart.
export async function searchAccounts(
  token: string | null,
  term: string,
): Promise<{ matches?: VerificationApplicant[]; error?: string }> {
  const q = term.trim();
  if (!q) return { matches: [] };
  const { data, error } = await call(token, "GET", undefined, `?search=${encodeURIComponent(q)}`);
  if (error) return { error };
  return { matches: (data?.matches ?? []) as VerificationApplicant[] };
}

// Verify an account that never applied. Still writes an application row on the
// server, so the badge has a record naming who granted it either way.
export async function grantVerification(
  token: string | null,
  userId: string,
  note: string,
): Promise<{ closedApplication?: boolean; emailed?: boolean; emailError?: string; error?: string }> {
  const { data, error } = await call(token, "PATCH", { userId, decision: "grant", note });
  if (error) return { error };
  return { closedApplication: data?.closedApplication, emailed: data?.emailed, emailError: data?.emailError };
}

// `note` is optional on approve and required on reject — a rejection the
// applicant can't act on is just a closed door.
export async function decideVerificationRequest(
  token: string | null,
  id: string,
  decision: "approve" | "reject",
  note: string,
): Promise<{ request?: AdminVerificationRequest; emailed?: boolean; emailError?: string; error?: string }> {
  const { data, error } = await call(token, "PATCH", { id, decision, note });
  if (error) return { error };
  return { request: data?.request as AdminVerificationRequest, emailed: data?.emailed, emailError: data?.emailError };
}

// Revoking is the same table, so the record of who removed a badge and why
// sits next to the record of who granted it.
export async function revokeVerification(
  token: string | null,
  userId: string,
  note: string,
): Promise<{ error?: string }> {
  const { error } = await call(token, "PATCH", { userId, decision: "revoke", note });
  return { error };
}
