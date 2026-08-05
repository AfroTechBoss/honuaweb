// The platform switches, in one shape both sides agree on.
//
// Imported by the middleware, the admin route, the public route and the console
// panel, so it is deliberately dependency-free — no supabase client, no next/*,
// nothing that would stop it being pulled into the Edge middleware bundle.
//
// The rule this file exists to keep: a switch belongs here only if something
// reads it. Each field's comment names the reader. When a setting has no reader
// it does not get a default here and it does not get a toggle on the screen —
// that is the whole difference between this and the four booleans in React
// state that used to be the settings page.
//
// Two of the old screen's toggles are gone for exactly that reason, and it is
// worth naming them so nobody adds them back: "require review for new sellers"
// (verification is already unconditionally manual — there is no auto-approve
// path to switch off) and "lock sign-ins" (sign-in is a call from the browser
// straight to Supabase's auth endpoint and never reaches this application, so
// nothing here could refuse it). Maintenance mode is the enforceable version of
// the second, and a stronger one — it is checked on every navigation and
// applies to sessions already held.

export type PlatformSettings = {
  /** Read by the profiles insert trigger (migration 044) and by /login. */
  registrationOpen: boolean;
  registrationNote: string | null;
  /** Read by middleware.ts on every navigation. */
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  /** Read by POST /api/support when a ticket or report arrives. */
  adminEmailAlerts: boolean;
  alertEmail: string | null;
  updatedAt: string | null;
  updatedLabel: string | null;
};

/** The part a signed-out visitor is allowed to know about. */
export type PublicPlatform = Pick<
  PlatformSettings,
  'registrationOpen' | 'registrationNote' | 'maintenanceMode' | 'maintenanceMessage'
>;

// Every default here is the permissive one. This object is what callers fall
// back to when the settings row cannot be read — a database blip, an
// unapplied migration, a timeout in the middleware — and the alternative is a
// platform that takes itself offline because a query was slow.
export const OPEN_PLATFORM: PublicPlatform = {
  registrationOpen: true,
  registrationNote: null,
  maintenanceMode: false,
  maintenanceMessage: null,
};

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Honua is down for a short while. Nothing you've logged is lost — we'll be back shortly.";

export const DEFAULT_REGISTRATION_NOTE =
  "New sign-ups are paused right now. If you already have an account you can still sign in.";

/** snake_case row → the shape everything else uses. */
export function shapeSettings(row: any): PlatformSettings {
  return {
    registrationOpen: row?.registration_open !== false,
    registrationNote: row?.registration_note ?? null,
    maintenanceMode: row?.maintenance_mode === true,
    maintenanceMessage: row?.maintenance_message ?? null,
    adminEmailAlerts: row?.admin_email_alerts !== false,
    alertEmail: row?.alert_email ?? null,
    updatedAt: row?.updated_at ?? null,
    updatedLabel: row?.updated_label ?? null,
  };
}

export const publicPart = (s: PlatformSettings): PublicPlatform => ({
  registrationOpen: s.registrationOpen,
  registrationNote: s.registrationNote,
  maintenanceMode: s.maintenanceMode,
  maintenanceMessage: s.maintenanceMessage,
});

// The console sends camelCase; the RPC takes the column names. Only keys that
// are actually present are forwarded, so the screen can save one toggle without
// stamping its stale copy of the other five over whatever a second admin just
// changed.
const PATCHABLE: Record<string, string> = {
  registrationOpen: 'registration_open',
  registrationNote: 'registration_note',
  maintenanceMode: 'maintenance_mode',
  maintenanceMessage: 'maintenance_message',
  adminEmailAlerts: 'admin_email_alerts',
  alertEmail: 'alert_email',
};

const BOOLEANS = new Set(['registrationOpen', 'maintenanceMode', 'adminEmailAlerts']);

export function toPatch(body: any): { patch: Record<string, any>; error?: string } {
  if (!body || typeof body !== 'object') return { patch: {}, error: 'Nothing to change.' };
  const patch: Record<string, any> = {};

  for (const [key, column] of Object.entries(PATCHABLE)) {
    if (!(key in body)) continue;
    const value = body[key];

    if (BOOLEANS.has(key)) {
      if (typeof value !== 'boolean') return { patch: {}, error: `${key} must be true or false.` };
      patch[column] = value;
      continue;
    }

    // The three text fields. null and '' both mean "clear it" — the RPC turns
    // an empty string back into null so a note is never stored as whitespace.
    if (value === null) { patch[column] = ''; continue; }
    if (typeof value !== 'string') return { patch: {}, error: `${key} must be text.` };
    const text = value.trim().slice(0, 600);

    // Checked here rather than left to Resend, because the failure would
    // otherwise surface hours later as an alert that silently never arrived.
    if (key === 'alertEmail' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return { patch: {}, error: "That doesn't look like an email address." };
    }

    patch[column] = text;
  }

  if (!Object.keys(patch).length) return { patch: {}, error: 'Nothing to change.' };
  return { patch };
}
