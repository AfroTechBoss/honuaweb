import { getSupabaseAdmin } from "./supabase-admin";
import { setErrorReporter } from "./observability";

// Persists logError() calls to public.error_log (migration 034), so the admin
// console can show what has been failing instead of only what is failing right
// now in a terminal someone happens to be watching.
//
// Registered once from instrumentation.ts. Everything below is written on the
// assumption that this code runs *while something is already going wrong*,
// which sets three rules:
//
//   1. It never throws. setErrorReporter's caller wraps this in a try/catch
//      already, but a reporter that can fail during an incident is a reporter
//      that turns one broken request into two.
//   2. It never awaits. The request that failed shouldn't also wait on a
//      round trip to Postgres to find out it failed.
//   3. It never calls back into logError. That is a loop, and the loop is
//      fastest exactly when the database is the thing that's broken.

// Enough to identify a failure, short enough that a storm of them doesn't fill
// a table. The interesting frames are always the first few.
const MAX_STACK = 2000;
const MAX_MESSAGE = 500;

// One row per fingerprint per window. An error inside a hot path can fire
// hundreds of times a second, and five hundred identical rows say nothing the
// first one didn't — except that the count matters, so it's carried forward in
// `suppressed` on the next write rather than lost.
const WINDOW_MS = 60_000;
const MAX_TRACKED = 500;

type Slot = { until: number; suppressed: number };
const seen = new Map<string, Slot>();

/**
 * A stable key for "the same failure". Volatile substrings are masked so that
 * one bug produces one group: without this, an error naming a row id would
 * fingerprint differently on every request and the console would show a
 * thousand distinct problems that are all the same problem.
 */
function fingerprint(scope: string, message: string, errorMessage?: string): string {
  const normalized = `${scope}|${message}|${errorMessage ?? ''}`
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')
    .replace(/did:privy:[a-z0-9]+/g, '<did>')
    .replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/g, '<email>')
    // Quoted values are almost always the specific thing that was missing.
    .replace(/"[^"]*"|'[^']*'/g, '<v>')
    .replace(/\b\d+\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.slice(0, 300);
}

/** True if this fingerprint may be written now; counts the drop if not. */
function admit(key: string): { write: boolean; suppressed: number } {
  const now = Date.now();
  const slot = seen.get(key);

  if (slot && slot.until > now) {
    slot.suppressed++;
    return { write: false, suppressed: 0 };
  }

  // A long-running server would otherwise keep a slot for every distinct
  // failure it has ever produced. Dropping the whole map costs at most one
  // duplicate row per fingerprint.
  if (seen.size >= MAX_TRACKED) seen.clear();

  const carried = slot?.suppressed ?? 0;
  seen.set(key, { until: now + WINDOW_MS, suppressed: 0 });
  return { write: true, suppressed: carried };
}

const str = (v: unknown, max: number) => typeof v === 'string' ? v.slice(0, max) : undefined;

// One line if the table isn't there, then silence. A missing table would
// otherwise log on every single error, which is the fastest way to make the
// logs you're trying to fix useless.
let warned = false;

export function installErrorSink() {
  setErrorReporter(report => {
    const db = getSupabaseAdmin();
    if (!db) return;

    const err = report.error;
    const errorMessage = err instanceof Error ? err.message : err !== undefined ? String(err) : undefined;
    const key = fingerprint(report.scope, report.message, errorMessage);
    const { write, suppressed } = admit(key);
    if (!write) return;

    const meta: Record<string, unknown> = { ...(report.meta ?? {}) };
    // requestId and path get their own columns; leaving copies in meta would
    // just be the same value rendered twice.
    delete meta.requestId;
    delete meta.path;
    if (suppressed) meta.suppressed = suppressed;

    // Deliberately not awaited — see rule 2. The floating promise is caught
    // below so an unhandled rejection can't take the process down.
    void db.from('error_log').insert({
      fingerprint: key,
      scope: report.scope,
      message: str(report.message, MAX_MESSAGE) ?? '',
      error_message: str(errorMessage, MAX_MESSAGE) ?? null,
      stack: err instanceof Error ? str(err.stack, MAX_STACK) ?? null : null,
      request_id: str(report.requestId, 64) ?? null,
      path: str(report.meta?.path, 200) ?? null,
      meta,
    }).then(({ error }) => {
      if (error && !warned) {
        warned = true;
        // console directly, not logWarn — see rule 3.
        console.warn(JSON.stringify({
          level: 'warn',
          scope: 'error-sink',
          message: 'could not persist an error — the admin console will show nothing',
          fix: 'apply supabase/migrations/034_error_log.sql',
          reason: error.message,
          at: new Date().toISOString(),
        }));
      }
    }, () => { /* rule 1 */ });
  });
}
