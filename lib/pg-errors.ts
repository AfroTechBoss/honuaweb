// What "that isn't there yet" actually looks like coming back from Supabase.
//
// Every admin route degrades rather than 500s when it is one migration ahead of
// the database — the panel says "apply migration 0XX" instead of showing a red
// box. That only works if the route recognises the error, and the obvious guess
// is wrong: PostgREST resolves the table name against its own schema cache and
// answers 404 / PGRST205 before Postgres is ever asked, so a check for the
// Postgres code 42P01 never fires through supabase-js. Confirmed against this
// project's instance: selecting from a table that doesn't exist returns
// { code: 'PGRST205', message: "Could not find the table 'public.x' in the
// schema cache" } — never 42P01.
//
// Both codes are accepted anyway. 42P01 is what arrives from a raw connection
// or from inside a SECURITY DEFINER function that touches a missing table, and
// a check that only works through one of the two doors is the bug this file
// exists to stop repeating.

type PgErr = { code?: string | null; message?: string | null } | null | undefined;

/** The table doesn't exist. */
export const isMissingTable = (e: PgErr) => e?.code === 'PGRST205' || e?.code === '42P01';

/**
 * The column doesn't exist — an older revision of a table that is otherwise
 * there. Which code arrives depends on the verb, both measured against this
 * instance: a select falls through to Postgres and returns 42703, while a
 * write is caught by the schema cache first and returns PGRST204.
 */
export const isMissingColumn = (e: PgErr) => e?.code === 'PGRST204' || e?.code === '42703';

/** The RPC doesn't exist. PGRST202 is the schema-cache miss, 42883 the real one. */
export const isMissingFunction = (e: PgErr) => e?.code === 'PGRST202' || e?.code === '42883';
