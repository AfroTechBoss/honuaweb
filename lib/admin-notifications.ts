import type { BroadcastRecord, Audience, Channel } from "@/lib/broadcast";

// Client half of the notification composer. Goes through
// /api/admin/notifications, which verifies the Privy token, checks
// `notifications.send`, resolves the audience in SQL and records what actually
// happened — see app/api/admin/notifications/route.ts.
//
// Nothing here decides who gets a message. The route sends an audience name and
// the database resolves it; a client that could hand over a list of user ids
// could message anyone it named.

const ENDPOINT = '/api/admin/notifications';

type AudienceCounts = { all_users: number | null; all_sellers: number | null };

export type BroadcastHistory = {
  broadcasts: BroadcastRecord[];
  /** How many people each audience covers right now, or null if unreadable. */
  audiences: AudienceCounts | null;
  /**
   * The subset of each audience that will actually receive email: has an
   * address, has email updates on, is not banned. Usually much smaller than
   * `audiences` — the preference defaults to off — which is why the compose
   * screen shows both numbers instead of letting the gap surface after the send.
   */
  emailable: AudienceCounts | null;
  /** False when RESEND_API_KEY is unset — the compose screen says so up front. */
  emailConfigured: boolean;
  maxEmails: number;
};

export type SendResult = {
  broadcast: BroadcastRecord | null;
  recipients: number;
  inAppCreated: number;
  emailsSent: number;
  emailsFailed: number;
  emailError: string | null;
  /** In the audience but not emailed — no address, or email updates off. */
  optedOut: number;
  warning?: string;
};

async function call(token: string | null, method: string, body?: any, query = ''): Promise<{ data?: any; error?: string; unresolved?: string[] }> {
  if (!token) return { error: 'Your admin session has expired — sign in again' };
  try {
    const res = await fetch(ENDPOINT + query, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { error: payload?.error ?? `Request failed (${res.status})`, unresolved: payload?.unresolved };
    return { data: payload };
  } catch {
    return { error: 'Could not reach the server' };
  }
}

export async function listBroadcasts(
  token: string | null,
  limit = 50,
): Promise<{ history?: BroadcastHistory; available?: boolean; error?: string }> {
  const { data, error } = await call(token, 'GET', undefined, `?limit=${limit}`);
  if (error) return { error };
  return {
    available: data?.available !== false,
    history: {
      broadcasts: data?.broadcasts ?? [],
      audiences: data?.audiences ?? null,
      emailable: data?.emailable ?? null,
      emailConfigured: data?.emailConfigured === true,
      maxEmails: Number(data?.maxEmails ?? 200),
    },
  };
}

export async function sendBroadcast(
  token: string | null,
  payload: {
    subject: string;
    body: string;
    audience: Audience;
    /** Either of these identifies a single recipient; the route resolves the handle. */
    targetUserId?: string | null;
    targetHandle?: string | null;
    channel: Channel;
    templateId?: string | null;
    actorLabel?: string;
  },
): Promise<{ result?: SendResult; error?: string; unresolved?: string[] }> {
  const { data, error, unresolved } = await call(token, 'POST', payload);
  if (error) return { error, unresolved };
  return { result: data as SendResult };
}
