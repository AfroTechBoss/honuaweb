import type { PlatformSettings } from "@/lib/platform";

// Client half of the platform settings screen. Everything goes through
// /api/admin/settings, which verifies the Privy token and checks
// `settings.manage` before touching the sealed table with the service-role key
// — the console holds no Supabase session, so it cannot read or write
// platform_settings directly under any circumstances.
//
// Errors come back as text rather than a boolean, for the reason every panel
// here does it: a settings screen that silently fails to save looks exactly
// like the one this replaced.

const ENDPOINT = '/api/admin/settings';

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

export async function getSettings(token: string | null): Promise<{
  settings?: PlatformSettings | null;
  available?: boolean;
  error?: string;
}> {
  const { data, error } = await call(token, 'GET');
  if (error) return { error };
  return { settings: data?.settings ?? null, available: data?.available !== false };
}

/**
 * Sends only the keys that changed. The screen holds a copy of the row, and a
 * full-object PATCH would stamp that copy over whatever a second admin saved
 * in the meantime — including switches this admin never touched.
 */
export async function saveSettings(
  token: string | null,
  patch: Partial<Record<keyof PlatformSettings, any>>,
  actorLabel?: string,
): Promise<{ settings?: PlatformSettings; error?: string }> {
  const { data, error } = await call(token, 'PATCH', { ...patch, actorLabel });
  if (error) return { error };
  return { settings: data?.settings };
}

/** Dismisses every pending and escalated community report. Returns how many. */
export async function clearReports(
  token: string | null,
  opts: { note?: string; actorLabel?: string } = {},
): Promise<{ dismissed?: number; error?: string }> {
  const { data, error } = await call(token, 'POST', { action: 'clear_reports', ...opts });
  if (error) return { error };
  return { dismissed: Number(data?.dismissed ?? 0) };
}
