import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { enforce } from "@/lib/rate-limit";
import { gateRole, type Permission } from "@/lib/admin-role";
import { logWarn, requestId, failure } from "@/lib/observability";

// Reads public.error_log (migration 034) for the admin console.
//
// Everything this returns is the detail failure() deliberately keeps out of the
// browser — driver messages naming tables and columns, stack traces naming
// file paths. That is the whole value of the page and also the reason it is
// gated exactly as hard as the metrics route: a verified Privy token, or
// nothing.
//
// GET  ?days=&limit=       grouped failures, newest first, plus an unseen count
// GET  ?requestId=         the occurrences behind one id, for chasing a report
// PATCH { fingerprint? }   mark one group seen, or everything

export const runtime = 'nodejs';

async function authed(req: NextRequest, permission: Permission): Promise<{ db: any; fail: NextResponse | null }> {
  const limited = enforce(req, { name: 'admin-errors', limit: 60, windowMs: 60_000 });
  if (limited) return { db: null, fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return { db: null, fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabaseAdmin();
  if (!db) return { db: null, fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };

  // Stack traces and driver messages are the closest thing the console has to a
  // map of the backend. Moderators and analysts have no use for it, and it is
  // the page you would read first if you were looking for a way in.
  const denied = await gateRole(db, admin.userId, permission);
  if (denied) return { db: null, fail: denied };

  return { db, fail: null };
}

// The console renders a few frames, not a whole trace. Trimming here rather
// than in the component keeps the payload small on a page that may be loading
// during an incident.
const STACK_LINES = 12;
const trimStack = (stack: string | null) =>
  stack ? stack.split('\n').slice(0, STACK_LINES).join('\n') : null;

function group(row: any) {
  return {
    fingerprint: row.fingerprint,
    scope: row.scope,
    message: row.message,
    errorMessage: row.error_message ?? null,
    stack: trimStack(row.stack ?? null),
    requestId: row.request_id ?? null,
    path: row.path ?? null,
    occurrences: Number(row.occurrences ?? 0),
    unseen: Number(row.unseen ?? 0),
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
  };
}

export async function GET(req: NextRequest) {
  const { db, fail } = await authed(req, 'errors.view');
  if (fail) return fail;

  const id = requestId(req);
  try {
    // ── Lookup by request id. The path from "it broke, here's the code it
    //    showed me" to the actual failure, which is the reason the id is in
    //    the error response and the x-request-id header to begin with.
    const lookup = req.nextUrl.searchParams.get('requestId')?.trim();
    if (lookup) {
      if (!/^[\w-]{6,64}$/.test(lookup)) {
        return NextResponse.json({ occurrences: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const { data, error } = await db.from('error_log')
        .select('id, scope, message, error_message, stack, request_id, path, meta, created_at')
        .eq('request_id', lookup)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return NextResponse.json({ occurrences: [], error: 'The error log is not available yet.' });
      return NextResponse.json({
        occurrences: (data ?? []).map((r: any) => ({
          id: r.id, scope: r.scope, message: r.message,
          errorMessage: r.error_message ?? null, stack: trimStack(r.stack ?? null),
          requestId: r.request_id ?? null, path: r.path ?? null,
          meta: r.meta ?? {}, at: r.created_at,
        })),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days')) || 7, 1), 30);
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 50, 1), 200);

    const [{ data, error }, unseenCount] = await Promise.all([
      db.rpc('admin_error_groups', { days, lim: limit }),
      db.from('error_log').select('*', { count: 'exact', head: true }).eq('seen', false),
    ]);

    if (error) {
      // Same posture as the activity route: an empty list is the honest answer
      // when the table isn't there. Reporting "no errors" would be a claim, so
      // `available` carries the difference and the panel says which it is.
      logWarn('admin/errors', 'error log unavailable', {
        fix: 'apply supabase/migrations/034_error_log.sql',
        requestId: id, reason: error.message,
      });
      return NextResponse.json({ available: false, groups: [], unseen: 0 });
    }

    return NextResponse.json({
      available: true,
      groups: (data ?? []).map(group),
      // Counts every unseen row ever, not just the ones inside `days` — a badge
      // that clears itself because the error got old would be a badge nobody
      // could trust.
      unseen: unseenCount.count ?? 0,
      days,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/errors', err, id, 'Could not load the error log.');
  }
}

export async function PATCH(req: NextRequest) {
  const { db, fail } = await authed(req, 'errors.view');
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const fingerprint = typeof body?.fingerprint === 'string' ? body.fingerprint.slice(0, 300) : '';

    // Marking seen is per-group by default. "Mark all" has to be asked for
    // explicitly, because clearing a badge is how an error stops being looked
    // at and that shouldn't be the easy accident.
    let q = db.from('error_log').update({ seen: true }).eq('seen', false);
    if (fingerprint) q = q.eq('fingerprint', fingerprint);
    else if (body?.all !== true) {
      return NextResponse.json({ error: 'Pass a fingerprint, or all: true' }, { status: 400 });
    }

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return failure('admin/errors', err, id, 'Could not update the error log.');
  }
}
