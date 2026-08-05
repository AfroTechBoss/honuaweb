import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, can, type Permission } from "@/lib/admin-role";
import { isMissingFunction, isMissingTable } from "@/lib/pg-errors";
import { logWarn, logError, requestId, failure } from "@/lib/observability";

// The member roster, and the one place an account's standing changes.
//
// GET    ?limit=                                        the roster
// PATCH  { id, action, days?, reason?, actorLabel? }     suspend / ban / reinstate
// PATCH  { id, action: 'role', role, actorLabel? }        set the community role
//
// Both halves used to be browser-side and neither worked properly.
//
// The roster read profiles directly, which returns whatever RLS allows an
// unauthenticated reader — fine for the public columns, but it meant the screen
// had no way to know anyone's standing, so it hardcoded `status: 'active'` for
// every real member. Suspend then called setUsers() and stopped: the badge
// changed colour, the audit line was written, and a refresh restored the
// account to active because nothing had been stored. Nobody was ever suspended.
//
// The freeze that gives the word meaning is in migration 041 — restrictive RLS
// policies on 28 tables, keyed on the acting user. This route is the only thing
// that can set it, because admin_set_account_status is granted to service_role
// alone and the service key exists nowhere but the server.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/041_account_freeze.sql';

const ACTIONS = new Set(['suspend', 'ban', 'reinstate', 'role']);

// The three values profiles.role's CHECK constraint accepts (migration 011).
// 'seller' is deliberately absent: it never passed the constraint, and an
// approved row in seller_applications is what actually makes someone a seller.
const DB_ROLES: Record<string, 'user' | 'moderator' | 'admin'> = {
  Member: 'user', member: 'user', user: 'user',
  Moderator: 'moderator', moderator: 'moderator',
  Admin: 'admin', admin: 'admin',
};

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';

/**
 * One derived word for two independent columns, because that is what the screen
 * draws. Ban wins: an account that is both is banned, and calling it suspended
 * would understate it.
 */
function standing(row: any): 'active' | 'suspended' | 'banned' {
  if (row.banned_at) return 'banned';
  if (row.suspended_until && new Date(row.suspended_until).getTime() > Date.now()) return 'suspended';
  // A lapsed suspension is not a status. The columns stay for the record and
  // the account is active again with nothing to do — which is why expiry needs
  // no scheduled job.
  return 'active';
}

const shape = (p: any) => ({
  id: p.id,
  name: p.full_name ?? p.handle ?? 'Member',
  handle: p.handle ?? '—',
  avatar: p.avatar_url ?? null,
  city: p.location ?? '—',
  role: p.role === 'admin' ? 'Admin' : p.role === 'moderator' ? 'Moderator' : 'Member',
  status: standing(p),
  impact: p.impact_score ?? 0,
  posts: Number(p.post_count ?? 0),
  reports: Number(p.report_count ?? 0),
  joined: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
  suspendedUntil: p.suspended_until ?? null,
  suspendedReason: p.suspended_reason ?? null,
  bannedAt: p.banned_at ?? null,
  bannedReason: p.banned_reason ?? null,
  // The blue tick, and the date it was granted. Same pair the profile screen
  // draws, so a member the console calls verified is verified everywhere.
  verified: p.verified === true,
  verifiedAt: p.verified_at ?? null,
  _db: true,
});

export async function GET(req: NextRequest) {
  // moderation.view, not users.suspend: an analyst can see who is suspended
  // without being able to suspend anyone, which is the read-only role working
  // as described.
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-users', limit: 60, permission: 'moderation.view' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 200, 1), 500);
    const { data, error } = await ctx.db.rpc('admin_member_roster', { p_limit: limit });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        logWarn('admin/users', 'roster unavailable', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ users: [], available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    // `verified` is not in admin_member_roster's return type, and widening a
    // RETURNS TABLE means dropping and recreating the function — a migration
    // the console would then be dark until someone applied. It is two columns
    // on a table this key already reads, so it is fetched alongside and merged
    // by id. Bounded by the same limit, one extra round trip, no DDL.
    const rows = data ?? [];
    const ticks = new Map<string, { verified: boolean; verified_at: string | null }>();
    if (rows.length) {
      const { data: v, error: vErr } = await ctx.db
        .from('profiles')
        .select('id, verified, verified_at')
        .in('id', rows.map((r: any) => r.id));
      // A missing column is not worth failing the roster over — every badge
      // simply reads unverified, which is what the screen showed before.
      if (!vErr) for (const p of v ?? []) ticks.set(p.id, { verified: p.verified === true, verified_at: p.verified_at ?? null });
    }

    return NextResponse.json({
      users: rows.map((r: any) => shape({ ...r, ...ticks.get(r.id) })),
      available: true,
      // Drives which buttons the screen offers. Sending it beats the client
      // guessing from a role string it would have to keep in step with
      // admin-permissions.ts by hand.
      canSuspend: can(ctx.role, 'users.suspend'),
      canBan: can(ctx.role, 'users.ban'),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/users', err, id, 'Could not load the member roster.');
  }
}

export async function PATCH(req: NextRequest) {
  const id = requestId(req);

  // Read before the gate, because which permission this needs depends on which
  // action it is. Parsing JSON is local and cheap; the rate limit and the token
  // round trip still happen before anything is read from or written to the
  // database.
  const body = await req.json().catch(() => ({}));
  const action = str(body?.action, 20);
  if (!ACTIONS.has(action)) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  // Handing someone moderator or admin is a privilege grant, not a moderation
  // action, so it sits with the other role work rather than with suspend. The
  // same split the team-roles matrix already draws: minting another admin is
  // owner-only, staffing a moderator is not.
  const permission: Permission =
    action === 'role'
      ? (DB_ROLES[str(body?.role, 20)] === 'admin' ? 'roles.manage' : 'roles.assign_limited')
      : action === 'ban' ? 'users.ban' : 'users.suspend';
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-users-write', limit: 30, permission });
  if (fail) return fail;

  try {
    const target = str(body?.id, 40);
    if (!target) return NextResponse.json({ error: 'Which member?' }, { status: 400 });
    if (!ctx.roleAvailable) {
      return NextResponse.json({ error: `Roles are not set up yet — apply supabase/migrations/040_admin_roles.sql.` }, { status: 503 });
    }

    // The community role on profiles. This used to be written from the browser
    // with the anon key; under Privy auth.uid() is null there, so the update
    // matched no rows and RLS swallowed it — the badge changed and the database
    // never did. Service role, one place, audited.
    if (action === 'role') {
      const wanted = str(body?.role, 20);
      const dbRole = DB_ROLES[wanted];
      if (!dbRole) return NextResponse.json({ error: 'Role must be Member, Moderator or Admin.' }, { status: 400 });
      if (target === ctx.adminId) {
        return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
      }

      const { data: before } = await ctx.db.from('profiles').select('role, handle').eq('id', target).maybeSingle();
      if (!before) return NextResponse.json({ error: 'No such account.' }, { status: 404 });

      const { data, error } = await ctx.db
        .from('profiles')
        .update({ role: dbRole })
        .eq('id', target)
        .select('id, handle, role, banned_at, suspended_until')
        .maybeSingle();

      if (error) {
        // The CHECK constraint from migration 011 is the backstop behind
        // DB_ROLES; if it ever fires, the message belongs to the reader.
        if (error.code === '23514') return NextResponse.json({ error: 'That is not a role this platform recognises.' }, { status: 400 });
        throw error;
      }
      if (!data) return NextResponse.json({ error: 'That account could not be updated.' }, { status: 409 });

      const { error: auditErr } = await ctx.db.from('admin_audit_log').insert({
        actor_id: ctx.adminId,
        actor_label: str(body?.actorLabel, 80) || 'Admin',
        action: `Changed role to ${wanted}`,
        target: data.handle ? '@' + data.handle : target,
        kind: 'award',
        meta: { userId: target, from: before.role ?? null, to: dbRole },
      });
      if (auditErr) logError('admin/users', 'audit write failed', auditErr, { requestId: id, userId: target });

      return NextResponse.json({
        user: {
          id: data.id,
          handle: data.handle ?? null,
          role: dbRole === 'admin' ? 'Admin' : dbRole === 'moderator' ? 'Moderator' : 'Member',
          status: standing(data),
        },
      });
    }

    // Reinstate clears a ban as well as a suspension, so gating it on
    // users.suspend alone would hand a moderator the undo for an action they
    // cannot take. Checked against the target's actual state rather than
    // refused outright, because reinstating someone they suspended themselves
    // is squarely a moderator's job.
    if (action === 'reinstate' && !can(ctx.role, 'users.ban')) {
      const { data: current } = await ctx.db.from('profiles').select('banned_at').eq('id', target).maybeSingle();
      if (current?.banned_at) {
        return NextResponse.json(
          { error: `That account is banned. Lifting a ban is an owner or admin action; your role is ${ctx.role}.`, role: ctx.role },
          { status: 403 },
        );
      }
    }

    const days = action === 'suspend' ? Math.trunc(Number(body?.days)) || 7 : null;

    const { data, error } = await ctx.db.rpc('admin_set_account_status', {
      p_actor: ctx.adminId,
      // Self-asserted display label for the audit line only — see the members
      // route. Every authorisation decision above read the verified DID.
      p_label: str(body?.actorLabel, 80) || null,
      p_target: target,
      p_action: action,
      p_days: days,
      p_reason: str(body?.reason, 500) || null,
    });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        return NextResponse.json({ error: `Suspensions are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      // Passed through as written: admin_set_account_status raises sentences
      // meant for the person reading them, not codes to translate.
      if (error.code === '42501') return NextResponse.json({ error: error.message }, { status: 403 });
      if (error.code === '23514') return NextResponse.json({ error: error.message }, { status: 400 });
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 400 });
      if (error.code === 'P0002') return NextResponse.json({ error: 'No such account.' }, { status: 404 });
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      user: {
        id: row?.id ?? target,
        handle: row?.handle ?? null,
        status: row ? standing(row) : 'active',
        suspendedUntil: row?.suspended_until ?? null,
        bannedAt: row?.banned_at ?? null,
      },
    });
  } catch (err) {
    return failure('admin/users', err, id, 'Could not change that account.');
  }
}
