import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { enforce } from "@/lib/rate-limit";
import { isMissingTable, isMissingFunction } from "@/lib/pg-errors";
import { logWarn } from "@/lib/observability";
import { can, isAdminRole, type AdminRole, type Permission } from "@/lib/admin-permissions";

// The admin gate, in one place: rate limit, verify the Privy token, resolve the
// caller to a role, check the permission.
//
// Every admin route grew its own `authed()` helper doing the first two steps.
// They are identical, and none of them did the last two — which is why the
// Roles page's permissions matrix was decoration. This is that helper plus the
// part that was missing.
//
// The one rule that matters more than the gate itself:
//
//   If migration 040 has not been applied, everyone is treated as an owner.
//
// That looks backwards for a security check, and it is deliberate. Before 040
// there is no roles table, so there is no role to read; the honest reading of
// "no roles configured" is the state the console has been in since it shipped,
// where any Privy-allowlisted admin can do everything. Failing closed instead
// would mean applying a migration is the only way to un-brick a console that
// was working five minutes earlier, and it would do it to the person least able
// to fix it — whoever is holding the pager. So the gate degrades to today's
// behaviour and the Roles page says, loudly, that 040 is missing.
//
// Once 040 is applied the caller always has a row (admin_enrol seeds one on
// sight), so this is a real gate from that moment on.

export type AdminContext = {
  db: any;
  adminId: string;
  role: AdminRole;
  /** False when 040 is not applied — role is a stand-in, not a stored value. */
  roleAvailable: boolean;
};

type Gate = { name: string; limit: number; permission?: Permission };

/**
 * Resolves a verified Privy DID to a stored role, creating the member row if
 * this is the first time we have seen them.
 *
 * Uses admin_enrol rather than a plain select so the roster is self-healing:
 * an admin who has never opened the Roles page still appears on it, and
 * last_seen_at stays true. The cost is one upsert per admin request, which at
 * console traffic volumes is not a cost.
 */
export async function resolveRole(
  db: any,
  did: string,
  identity?: { email?: string | null; name?: string | null },
): Promise<{ role: AdminRole; available: boolean }> {
  const { data, error } = await db.rpc('admin_enrol', {
    p_did: did,
    p_email: identity?.email ?? null,
    p_name: identity?.name ?? null,
  });

  if (error) {
    if (isMissingFunction(error) || isMissingTable(error)) {
      // 040 not applied. See the note at the top: this is the pre-040 world,
      // where an allowlisted admin can do everything.
      return { role: 'owner', available: false };
    }
    // A real failure. Same fallback, because a transient database error must
    // not lock the console — but it is an anomaly, so it gets logged.
    logWarn('admin/role', 'could not resolve admin role', { reason: error.message, code: error.code });
    return { role: 'owner', available: false };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const role = row?.role;
  return { role: isAdminRole(role) ? role : 'admin', available: true };
}

/**
 * The permission half of the gate, for routes that already have their own
 * `authed()` doing the rate limit and token check.
 *
 * Returns a 403 to hand straight back, or null to proceed. Kept separate from
 * requireAdmin so existing routes could adopt the check without their call
 * sites being rewritten — the shapes they destructure stay as they were.
 */
export async function gateRole(db: any, adminId: string, permission: Permission): Promise<NextResponse | null> {
  const { role } = await resolveRole(db, adminId);
  if (can(role, permission)) return null;
  // The role is named in the response because the person reading it is staff.
  // "Forbidden" sends them to look for a bug; "your role is analyst" sends
  // them to an owner, which is where the fix actually is.
  return NextResponse.json(
    { error: `Your role (${role}) does not allow this.`, role, permission },
    { status: 403 },
  );
}

/**
 * The whole gate. Returns a context, or a response to return as-is.
 *
 * Pass `permission` to require one. Omit it to authenticate without
 * authorising — for routes where every role legitimately has access.
 */
export async function requireAdmin(req: NextRequest, gate: Gate): Promise<
  { ctx: AdminContext; fail: null } | { ctx: null; fail: NextResponse }
> {
  // Before the token check, which is a network round trip to Privy: an
  // unauthenticated flood costs real money even though every request 401s.
  const limited = enforce(req, { name: gate.name, limit: gate.limit, windowMs: 60_000 });
  if (limited) return { ctx: null, fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return { ctx: null, fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const db = getSupabaseAdmin();
  if (!db) return { ctx: null, fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };

  const { role, available } = await resolveRole(db, admin.userId);

  if (gate.permission && !can(role, gate.permission)) {
    // 403 with the role named. The person reading this is staff, not a
    // stranger — telling them which role they hold is how they know to go ask
    // an owner rather than assume the console is broken.
    return {
      ctx: null,
      fail: NextResponse.json(
        { error: `Your role (${role}) does not allow this.`, role, permission: gate.permission },
        { status: 403 },
      ),
    };
  }

  return { ctx: { db, adminId: admin.userId, role, roleAvailable: available }, fail: null };
}

export { can } from "@/lib/admin-permissions";
export type { AdminRole, Permission } from "@/lib/admin-permissions";
