// Next runs this once per server process, before any request is handled.
//
// It exists so that lib/observability.ts stays free of the thing it reports to:
// the module defines a `setErrorReporter` seam and knows nothing about what
// plugs into it, which is what lets the same logError() calls work in a test,
// in a script, and in production without a database attached.
export async function register() {
  // The edge runtime has no service-role client and no Node APIs to build one
  // with. Middleware runs there; every route that can fail meaningfully runs
  // in nodejs.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { installErrorSink } = await import('./lib/error-sink');
  installErrorSink();
}
