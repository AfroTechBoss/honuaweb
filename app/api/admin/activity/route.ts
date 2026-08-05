import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { enforce } from "@/lib/rate-limit";
import { gateRole, type Permission } from "@/lib/admin-role";
import { logWarn, logError, requestId, failure } from "@/lib/observability";

// The admin audit log: what an admin did, kept.
//
// Before this the log was `React.useState(MOCK_ADMIN.audit)` — it opened with
// eight invented lines about people who don't work here, appended real actions
// to the top of that list, and lost all of it on refresh. So the one record of
// who suspended an account or approved a payout survived exactly as long as the
// tab did.
//
// admin_audit_log is sealed (RLS on, no policies), so this route is the only
// way in or out of it. Writes are open to any authenticated admin because
// that's the point — every admin action should land here, including the ones
// taken by whoever is reading the log.

export const runtime = 'nodejs';

async function authed(req: NextRequest, permission: Permission | null): Promise<{ db: any; adminId: string; fail: NextResponse | null }> {
  const limited = enforce(req, { name: 'admin-activity', limit: 120, windowMs: 60_000 });
  if (limited) return { db: null, adminId: '', fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return { db: null, adminId: '', fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabaseAdmin();
  if (!db) return { db: null, adminId: '', fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };

  // `null` means authenticate but don't authorise. Only POST passes it, and the
  // reason is in the header note above: every admin action writes its own audit
  // row through here, so a permission on the write would mean the roles that
  // lack it act without leaving a trace. Reading the log is the gated half.
  if (permission) {
    const denied = await gateRole(db, admin.userId, permission);
    if (denied) return { db: null, adminId: '', fail: denied };
  }

  return { db, adminId: admin.userId, fail: null };
}

const str = (v: any, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : '';

// The icons AuditLine knows how to draw. An unrecognised kind renders as a
// blank square, so anything else is stored as the neutral one.
const KINDS = new Set(['trash', 'lock', 'flame', 'check', 'close', 'logout', 'coin', 'award']);

export async function GET(req: NextRequest) {
  const { db, fail } = await authed(req, 'analytics.view');
  if (fail) return fail;

  const id = requestId(req);
  try {
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 50, 1), 200);
    const { data, error } = await db.from('admin_audit_log')
      .select('id, actor_label, action, target, kind, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Most likely the migration hasn't been applied. An empty log is the
      // truthful answer — better than falling back to the invented list this
      // route exists to replace.
      logWarn('admin/activity', 'audit log unavailable', {
        fix: 'apply supabase/migrations/033_admin_activity_and_analytics.sql',
        requestId: id, reason: error.message,
      });
      return NextResponse.json({ entries: [], error: 'The activity log is not available yet.' });
    }

    return NextResponse.json({
      entries: (data ?? []).map((row: any) => ({
        id: row.id,
        actor: row.actor_label ?? 'System',
        action: row.action,
        target: row.target ?? '',
        kind: row.kind ?? 'check',
        at: row.created_at,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/activity', err, id, 'Could not load the activity log.');
  }
}

export async function POST(req: NextRequest) {
  const { db, adminId, fail } = await authed(req, null);
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const action = str(body?.action, 120);
    if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 });

    const kind = str(body?.kind, 20);
    const { data, error } = await db.from('admin_audit_log').insert({
      actor_id: adminId,
      // Rendered as written, forever. Storing the label rather than joining to
      // a name at read time is what keeps an old line describing what was true
      // when it happened.
      actor_label: str(body?.actorLabel, 80) || 'Admin',
      action,
      target: str(body?.target, 200),
      kind: KINDS.has(kind) ? kind : 'check',
    }).select('id, created_at').single();

    if (error) {
      // The action itself already succeeded — only the record of it failed, and
      // silently losing that is how an audit trail becomes fiction.
      logError('admin/activity', 'audit write failed', error, { requestId: id, action, actorId: adminId });
      return NextResponse.json({ error: 'The action completed but was not written to the log.' }, { status: 200 });
    }

    return NextResponse.json({ id: data?.id, at: data?.created_at });
  } catch (err) {
    return failure('admin/activity', err, id, 'Could not write to the activity log.');
  }
}
