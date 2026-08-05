import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, resolveRole } from "@/lib/admin-role";
import { isMissingFunction, isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";
import { assignableBy, isAdminRole } from "@/lib/admin-permissions";

// The console's own roster: who has admin access, and what each of them can do.
//
// GET     ?identity=email,name   the roster + the caller's own role
// PATCH   { did, role, reason? } change someone's role
// DELETE  ?did=                  drop someone from the roster
//
// The caller's email arrives as a query parameter on GET rather than being read
// from the token, because the token has not got one — verifyPrivyToken returns
// the `sub` claim and there is no PRIVY_APP_SECRET to go ask Privy for more.
// The console sends the address from the Privy session it already holds.
//
// That makes the email self-asserted, so it is recorded as a display label and
// nothing else. Every authorisation decision below reads the role stored
// against the verified DID. An admin who lies about their address changes what
// their own row says underneath their own name, and gains nothing.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/040_admin_roles.sql';

const str = (v: any) => typeof v === 'string' ? v.trim() : '';

/** Maps the errcodes admin_set_role / admin_remove_member raise onto statuses. */
function roleErrorStatus(code: string | null | undefined): number {
  if (code === '42501') return 403;   // not allowed to do this
  if (code === '23514') return 409;   // last owner
  if (code === 'P0002') return 404;   // no such member
  if (code === '22023') return 400;   // unknown role
  return 500;
}

export async function GET(req: NextRequest) {
  // No permission gate. Everyone with console access may see who else has it —
  // withholding the roster from a moderator protects nothing and makes "who do
  // I ask about this?" unanswerable.
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-members', limit: 60 });
  if (fail) return fail;

  const id = requestId(req);
  try {
    // Enrol with the identity the console supplied, so the caller's own row
    // carries their email and name. resolveRole() inside requireAdmin already
    // created the row; this fills in the label.
    const email = str(req.nextUrl.searchParams.get('email'));
    const name = str(req.nextUrl.searchParams.get('name'));
    if (email || name) await resolveRole(ctx.db, ctx.adminId, { email, name });

    const { data, error } = await ctx.db.rpc('admin_member_list');

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        logWarn('admin/members', 'roster unavailable', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({
          members: [], available: false, role: ctx.role, adminId: ctx.adminId,
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    const members = (data ?? []).map((m: any) => ({
      did: m.privy_user_id,
      email: m.email ?? null,
      // The Honua profile wins over the self-asserted display name: it is the
      // one of the two that somebody else can see and correct.
      name: m.full_name ?? m.display_name ?? null,
      handle: m.handle ?? null,
      avatarUrl: m.avatar_url ?? null,
      role: m.role,
      addedBy: m.added_by ?? null,
      firstSeenAt: m.first_seen_at,
      lastSeenAt: m.last_seen_at,
      isSelf: m.privy_user_id === ctx.adminId,
    }));

    return NextResponse.json({
      members,
      available: true,
      role: ctx.role,
      adminId: ctx.adminId,
      canAssign: assignableBy(ctx.role),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/members', err, id, 'Could not load the admin roster.');
  }
}

export async function PATCH(req: NextRequest) {
  // `roles.assign_limited` is the weaker of the two grants, so it is what the
  // gate requires; admin_set_role then enforces the difference between an owner
  // (any role) and an admin (moderator/analyst only). Checking the narrow rule
  // in the database rather than here is what makes it hold against two admins
  // acting at once.
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-members-write', limit: 30, permission: 'roles.assign_limited' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    if (!ctx.roleAvailable) {
      return NextResponse.json({ error: `Roles are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const did = str(body?.did);
    const role = str(body?.role);
    const reason = str(body?.reason);

    if (!did) return NextResponse.json({ error: 'Which member?' }, { status: 400 });
    if (!isAdminRole(role)) return NextResponse.json({ error: 'Unknown role.' }, { status: 400 });

    const { data, error } = await ctx.db.rpc('admin_set_role', {
      p_actor: ctx.adminId, p_target: did, p_role: role, p_reason: reason || null,
    });

    if (error) {
      const status = roleErrorStatus(error.code);
      if (status === 500) throw error;
      // These messages are written for the person reading them — "this is the
      // last owner", "you cannot change your own role" — so they are passed
      // through rather than replaced with something generic.
      return NextResponse.json({ error: error.message }, { status });
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ member: { did: row?.privy_user_id ?? did, role: row?.role ?? role } });
  } catch (err) {
    return failure('admin/members', err, id, 'Could not change that role.');
  }
}

export async function DELETE(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-members-write', limit: 30, permission: 'roles.assign_limited' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    if (!ctx.roleAvailable) {
      return NextResponse.json({ error: `Roles are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
    }

    const did = str(req.nextUrl.searchParams.get('did'));
    if (!did) return NextResponse.json({ error: 'Which member?' }, { status: 400 });

    const { data, error } = await ctx.db.rpc('admin_remove_member', { p_actor: ctx.adminId, p_target: did });

    if (error) {
      const status = roleErrorStatus(error.code);
      if (status === 500) throw error;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ removed: data === true });
  } catch (err) {
    return failure('admin/members', err, id, 'Could not remove that member.');
  }
}
