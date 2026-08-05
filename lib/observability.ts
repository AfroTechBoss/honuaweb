import { NextResponse } from "next/server";

// Structured server-side logging.
//
// Two things make a production failure hard to chase, and neither is solved by
// logging more:
//
//   1. The log line and the user's report can't be connected. Someone says
//      "verification wouldn't save around 2pm" and there are four hundred lines
//      in that minute. So every request gets an id, it comes back in the error
//      response and in an `x-request-id` header, and it's stamped on every line
//      that request produces. The user pastes the id; you search one field.
//
//   2. Lines aren't queryable. `console.error('failed:', err)` produces prose,
//      and prose can't be filtered by scope or grouped by error. One JSON
//      object per line can — Vercel's log drain, and anything downstream of it,
//      indexes the fields.
//
// This is deliberately not an APM. It has no sampling, no traces, no spans. It
// is the floor: enough structure that the logs you already emit become useful,
// and one seam (`setErrorReporter`) where a real reporter plugs in.

type Level = "info" | "warn" | "error";

export function newRequestId(): string {
  // Short and typo-resistant — someone reads this out of a screenshot.
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

/**
 * Pulls the id off the request if a client or an upstream proxy set one, so a
 * single id can span the browser call and the server handling it. Otherwise
 * mints one.
 */
export function requestId(req: Request): string {
  const given = req.headers.get("x-request-id")?.trim();
  // Only accept something that looks like an id. An unbounded header value
  // ends up in every log line for that request, and logs are a place attacker
  // -controlled text can do damage.
  if (given && /^[\w-]{6,64}$/.test(given)) return given;
  return newRequestId();
}

// Where errors go beyond the log — the error_log table (lib/error-sink.ts),
// Sentry, or anything else. Left unset the app behaves exactly as before, so
// nothing here depends on a vendor.
//
// To wire Sentry up instead: install @sentry/nextjs, then in instrumentation.ts
//   setErrorReporter((e) => Sentry.captureException(e.error, { extra: e }));
type ErrorReport = { scope: string; message: string; requestId?: string; error?: unknown; meta?: Record<string, unknown> };

// Held on globalThis rather than in a module variable, which is not a style
// choice — it's the only thing that works.
//
// Next compiles instrumentation.ts into its own bundle, separate from the one
// route handlers are compiled into. Both bundles import this file, so both get
// their *own* copy of its module scope. A plain `let reporter` assigned from
// instrumentation therefore sets a variable no route can see, and every
// logError call finds it still null. Verified the hard way: the reporter was
// registered, four errors fired, and not one of them reached it.
//
// globalThis is shared across bundles because they share a process. The edge
// runtime is a separate isolate and won't see this — which is correct, since
// nothing that can reach a database runs there anyway.
const SLOT = Symbol.for('honua.errorReporter');
type Slot = { fn: ((report: ErrorReport) => void) | null };
const slot: Slot = ((globalThis as any)[SLOT] ??= { fn: null });

export function setErrorReporter(fn: ((report: ErrorReport) => void) | null) {
  slot.fn = fn;
}

export function log(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    scope,
    message,
    at: new Date().toISOString(),
    ...(meta ?? {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logInfo = (scope: string, message: string, meta?: Record<string, unknown>) => log("info", scope, message, meta);
export const logWarn = (scope: string, message: string, meta?: Record<string, unknown>) => log("warn", scope, message, meta);

/**
 * An error that shouldn't be lost. Logs it in the structured shape and hands it
 * to the reporter if one is registered.
 *
 * Use this for failures the code recovers from — the ones that would otherwise
 * be swallowed by a catch or an ignored `error` field. Those are the expensive
 * ones: nothing breaks visibly, so nobody looks, and the behaviour is quietly
 * wrong for weeks.
 */
export function logError(scope: string, message: string, error?: unknown, meta?: Record<string, unknown>) {
  // Supabase hands back a plain object, not an Error — String() on one of those
  // yields "[object Object]", which is how a logged failure ends up saying
  // nothing at all. Unwrap anything that carries a message, and keep the code
  // and hint: on a PostgREST error those two are the whole diagnosis.
  const bag = error as any;
  const detail = error instanceof Error
    ? { errorMessage: error.message, stack: error.stack }
    : bag && typeof bag === 'object' && typeof bag.message === 'string'
      ? { errorMessage: bag.message, ...(bag.code ? { errorCode: bag.code } : {}), ...(bag.hint ? { errorHint: bag.hint } : {}) }
      : error !== undefined ? { errorMessage: String(error) } : {};

  log("error", scope, message, { ...detail, ...(meta ?? {}) });
  try { slot.fn?.({ scope, message, error, meta, requestId: meta?.requestId as string | undefined }); }
  catch { /* a broken reporter must never take down the request */ }
}

/**
 * The 500 at the end of a catch. Logs the real detail server-side and returns
 * a response carrying only the id — the message from a database driver or an
 * HTTP client routinely names tables, columns, and hosts, and none of that
 * belongs in a browser.
 */
export function failure(scope: string, error: unknown, id: string, message = "Something went wrong on our end.") {
  logError(scope, "unhandled failure", error, { requestId: id });
  return NextResponse.json({ error: message, requestId: id }, {
    status: 500,
    headers: { "x-request-id": id, "Cache-Control": "no-store" },
  });
}
