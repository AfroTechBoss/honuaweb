import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { enforce } from "@/lib/rate-limit";
import { gateRole, type Permission } from "@/lib/admin-role";
import { logWarn, requestId, failure } from "@/lib/observability";

// Reads and moves public.support_tickets (migrations 037, 038) for the admin
// console — both /support messages and /report safety reports.
//
// Everything here is somebody else's private message plus the address to reach
// them at, so it is gated exactly as hard as the rest of the console: a
// verified Privy token, or nothing. The table itself has no RLS policies, which
// means this route is the only door.
//
// GET  ?kind=&status=&limit=      the queue, newest first, plus counts by kind
// PATCH { id, status?, adminNote?, seen? }   move / annotate / mark read

export const runtime = 'nodejs';

const STATUSES = ['open', 'pending', 'resolved', 'closed'];
const KINDS = ['support', 'report'];

async function authed(req: NextRequest, permission: Permission): Promise<{ db: any; adminId: string; fail: NextResponse | null }> {
  // Counted before the token check, which is a network round trip to Privy.
  const limited = enforce(req, { name: 'admin-support', limit: 60, windowMs: 60_000 });
  if (limited) return { db: null, adminId: '', fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return { db: null, adminId: '', fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabaseAdmin();
  if (!db) return { db: null, adminId: '', fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };

  // Every ticket here is a private message and the address to reach the sender
  // at. A verified token says the caller is staff; it does not say the caller
  // was hired to read other people's mail. An analyst is not.
  const denied = await gateRole(db, admin.userId, permission);
  if (denied) return { db: null, adminId: '', fail: denied };

  return { db, adminId: admin.userId, fail: null };
}

const COLUMNS =
  'id, ref, kind, status, category, subject, message, email, order_ref, user_id, severity, admin_note, handled_by, resolved_at, seen, created_at, updated_at';

function shape(row: any) {
  return {
    id: row.id,
    ref: row.ref,
    kind: row.kind,
    status: row.status,
    category: row.category,
    subject: row.subject,
    message: row.message,
    email: row.email,
    orderRef: row.order_ref ?? null,
    userId: row.user_id ?? null,
    severity: row.severity ?? null,
    adminNote: row.admin_note ?? null,
    handledBy: row.handled_by ?? null,
    resolvedAt: row.resolved_at ?? null,
    seen: !!row.seen,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EMPTY_COUNTS = { total: 0, open: 0, pending: 0, resolved: 0, closed: 0, unseen: 0, last24h: 0 };

// 037's version of the function is not an error, it is just the wrong shape: a
// single row with no `kind` column, which parses to all zeros. Detected by the
// presence of the 'all' row, which only 038 emits — otherwise the panel shows a
// reassuring set of zeros beside a list that visibly has rows in it.
const isByKind = (rows: any) => Array.isArray(rows) && rows.some((r: any) => r?.kind);

// 038 returns one row per kind plus an 'all' rollup. Absent kinds are filled in
// as zeros here rather than left undefined, so the panel can render a count
// without every read site guarding for it.
function countsByKind(rows: any): Record<string, typeof EMPTY_COUNTS> {
  const out: Record<string, typeof EMPTY_COUNTS> = {
    all: { ...EMPTY_COUNTS }, support: { ...EMPTY_COUNTS }, report: { ...EMPTY_COUNTS },
  };
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r?.kind) continue;
    out[r.kind] = {
      total: Number(r.total ?? 0),
      open: Number(r.open ?? 0),
      pending: Number(r.pending ?? 0),
      resolved: Number(r.resolved ?? 0),
      closed: Number(r.closed ?? 0),
      unseen: Number(r.unseen ?? 0),
      last24h: Number(r.last_24h ?? 0),
    };
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { db, fail } = await authed(req, 'support.handle');
  if (fail) return fail;

  const id = requestId(req);
  try {
    const status = req.nextUrl.searchParams.get('status') ?? '';
    const kind = req.nextUrl.searchParams.get('kind') ?? '';
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 100, 1), 300);

    let q = db.from('support_tickets').select(COLUMNS).order('created_at', { ascending: false }).limit(limit);
    if (STATUSES.includes(status)) q = q.eq('status', status);
    if (KINDS.includes(kind)) q = q.eq('kind', kind);

    const [rows, counts] = await Promise.all([q, db.rpc('admin_support_counts')]);

    if (rows.error) {
      // Same posture as the errors route: an empty list is honest when the
      // table isn't there, but reporting "no tickets" as a fact would be a
      // claim. `available` carries the difference so the panel can say which
      // it is rather than showing a reassuring zero.
      logWarn('admin/support', 'support tickets unavailable', {
        fix: 'apply supabase/migrations/037_support_tickets.sql',
        requestId: id, reason: rows.error.message,
      });
      return NextResponse.json({ available: false, tickets: [], counts: countsByKind(null) });
    }

    const countsOk = !counts.error && isByKind(counts.data);
    if (!countsOk) {
      // The table read succeeded, so the tickets are real — only the totals are
      // missing, which happens on a database still sitting on 037's one-row
      // version of the function. Say so instead of serving zeros next to a list
      // that visibly has rows in it.
      logWarn('admin/support', 'ticket counts unavailable', {
        fix: 'apply supabase/migrations/038_support_counts_by_kind.sql',
        requestId: id, reason: counts.error?.message ?? 'admin_support_counts() is still 037\'s single-row version',
      });
    }

    return NextResponse.json({
      available: true,
      countsAvailable: countsOk,
      tickets: (rows.data ?? []).map(shape),
      counts: countsByKind(countsOk ? counts.data : null),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/support', err, id, 'Could not load the support queue.');
  }
}

export async function PATCH(req: NextRequest) {
  const { db, adminId, fail } = await authed(req, 'support.handle');
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const ticketId = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!ticketId) return NextResponse.json({ error: 'Which ticket?' }, { status: 400 });

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
      }
      patch.status = body.status;
      // Stamped here rather than accepted from the client: a console that could
      // name its own reviewer is not an audit trail. Clearing resolved_at when
      // a ticket reopens matters — a resolution date on an open ticket makes
      // the queue's own history unreadable.
      patch.handled_by = adminId;
      patch.resolved_at = body.status === 'resolved' ? new Date().toISOString() : null;
    }

    if (body.adminNote !== undefined) {
      patch.admin_note = typeof body.adminNote === 'string' ? body.adminNote.trim().slice(0, 4000) : null;
      patch.handled_by = adminId;
    }

    // Only ever set true from here. Un-reading a ticket you've read is not a
    // thing anyone needs, and allowing it would let the badge be gamed down.
    if (body.seen === true) patch.seen = true;

    const { data, error } = await db
      .from('support_tickets')
      .update(patch)
      .eq('id', ticketId)
      .select(COLUMNS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'That ticket no longer exists' }, { status: 404 });

    return NextResponse.json({ ticket: shape(data) });
  } catch (err) {
    return failure('admin/support', err, id, 'Could not update that ticket.');
  }
}
