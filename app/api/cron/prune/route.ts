import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logInfo, logWarn, requestId, failure } from "@/lib/observability";

// Daily retention pass over the tables that grow forever.
//
// Both of these are append-only by design and nothing in their write path ever
// deletes:
//
//   error_log         one row per distinct failure per minute (lib/error-sink.ts).
//                     The sink's dedup window bounds the rate, not the total —
//                     a bug in a hot route still adds thousands in an afternoon.
//   analytics_events  one row per pageview (/api/track), forever.
//
// Left alone, the first sign of trouble is the admin console timing out on the
// one page you open when things are already wrong.
//
// Guarded by CRON_SECRET: Vercel Cron sends it as `Authorization: Bearer …`.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Each window is the shortest one that doesn't destroy something worth having;
// the reasoning for each lives in the migration that defines the function.
const JOBS = [
  // Matches the widest filter the Errors panel offers. Less would make that
  // 30d button quietly lie.
  { table: 'error_log', fn: 'prune_error_log', keepDays: 30, migration: '034_error_log.sql' },
  // The console reads 60 days. Keeping only that would leave the table holding
  // exactly what is on screen, so any question it doesn't already answer could
  // never be asked. See 035.
  { table: 'analytics_events', fn: 'prune_analytics_events', keepDays: 365, migration: '035_prune_analytics_events.sql' },
  // Identity kept after account deletion for accounting, VAT and DAC7 records.
  // Counted from the end of the year of the account's last transaction. Ten
  // years is the longest rule that applies (Italy's Civil Code art. 2220 and
  // the EU VAT marketplace rule); Estonia alone would need seven. Shorten only
  // on an accountant's advice — once a snapshot is purged it cannot come back.
  { table: 'retained_identities', fn: 'prune_retained_identities', keepDays: 3653, migration: '057_account_deletion_keeps_ledger.sql' },
] as const;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Refuse to run unguarded. This endpoint deletes rows.
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  return header.replace(/^Bearer\s+/i, '').trim() === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: process.env.CRON_SECRET ? 'Unauthorized' : 'CRON_SECRET is not configured on the server' },
      { status: process.env.CRON_SECRET ? 401 : 503 },
    );
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 });

  const id = requestId(req);
  try {
    const removed: Record<string, number> = {};
    const skipped: Record<string, string> = {};
    const failed: Record<string, string> = {};

    // Sequential and independent. One table's function being absent or its
    // delete failing must not stop the other from being swept — a shared
    // Promise.all here would let one bad job hide a second one's result.
    for (const job of JOBS) {
      const { data, error } = await db.rpc(job.fn, { keep_days: job.keepDays });

      if (!error) {
        removed[job.table] = Number(data ?? 0);
        continue;
      }

      // The function isn't there — that migration hasn't been applied. A setup
      // gap, not an incident, and reporting it as a failure would mean a red
      // cron run every morning until someone notices.
      if (error.code === 'PGRST202' || error.code === '42883') {
        skipped[job.table] = `apply supabase/migrations/${job.migration}`;
        logWarn('cron/prune', `${job.fn} is not installed`, { fix: `apply supabase/migrations/${job.migration}`, requestId: id });
        continue;
      }

      // Anything else is real. logWarn, not logError: this route failing is
      // exactly when error_log is least likely to accept a row, and a retention
      // job that can't run is not worth an entry in the table it maintains.
      failed[job.table] = error.message;
      logWarn('cron/prune', `${job.table} prune failed`, { requestId: id, reason: error.message });
    }

    const ok = Object.keys(failed).length === 0;
    logInfo('cron/prune', 'retention pass complete', { requestId: id, removed, ...(Object.keys(skipped).length ? { skipped: Object.keys(skipped) } : {}) });

    return NextResponse.json({
      ok,
      removed,
      ...(Object.keys(skipped).length ? { skipped } : {}),
      ...(ok ? {} : { failed }),
    }, { status: ok ? 200 : 500 });
  } catch (err) {
    return failure('cron/prune', err, id, 'The retention job could not run.');
  }
}
