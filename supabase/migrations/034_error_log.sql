-- ============================================================
-- Migration 034: Server errors, in the console
--
-- lib/observability.ts already produces everything needed to chase a failure:
-- a scope, a message, a stack, and a request id that also comes back to the
-- browser in an `x-request-id` header. All of it goes to console.* and stops
-- there — in production that means Vercel's log drain, which is fine for
-- reading and miserable for asking "has this happened before, and how often".
--
-- This is the table behind an answer. It is deliberately narrow:
--
--   * errors only. logInfo and logWarn stay on the console. One row per
--     pageview already lands in analytics_events; adding one per request would
--     make Postgres the busiest thing in the stack and, on a bad day, the thing
--     that fails *because* something else already had.
--
--   * occurrences, not counters. A grouped view is what you read, but the
--     individual request id is what turns "it broke" from a user into one row.
--     admin_error_groups() below does the grouping at read time so both work.
--
--   * it expires. A prune function is included and is meant to be scheduled;
--     nothing here reads past 30 days.
--
-- Sealed like the 033 tables: RLS on with zero policies, so no browser can
-- reach it under any key. Only the service-role client writes it, and only the
-- Privy-authenticated /api/admin/errors route reads it.
-- ============================================================


-- ── The table ───────────────────────────────────────────────
--
-- fingerprint is the grouping key, computed by the writer rather than here: it
-- is the scope plus the message with volatile parts (uuids, ids, numbers,
-- quoted values) masked out, so "user 3f2a not found" and "user 9c11 not found"
-- collapse into one group instead of two thousand.
--
-- stack is stored already truncated. A full trace is tens of kilobytes and the
-- part that identifies the failure is the top few frames.
create table if not exists public.error_log (
  id            uuid primary key default gen_random_uuid(),
  fingerprint   text        not null,
  scope         text        not null,
  message       text        not null,
  error_message text,
  stack         text,
  -- The id the user can read off an error screen. Indexed, because pasting one
  -- in is the fastest path from a complaint to the line that caused it.
  request_id    text,
  -- Nullable on purpose: logError is called from places that have no request
  -- (startup, background work), and a fabricated path would be worse than none.
  path          text,
  meta          jsonb       not null default '{}'::jsonb,
  -- Drives the unread count on the console's left rail. Marking seen is an
  -- admin action, so it lives on the row rather than in someone's localStorage
  -- where a second admin would never see it.
  seen          boolean     not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists error_log_created_idx     on public.error_log (created_at desc);
create index if not exists error_log_fingerprint_idx on public.error_log (fingerprint, created_at desc);
create index if not exists error_log_request_idx     on public.error_log (request_id) where request_id is not null;
-- Partial: the unread count is the only query that touches this, and it only
-- ever asks for false. Indexing the true rows would be indexing the archive.
create index if not exists error_log_unseen_idx      on public.error_log (created_at desc) where not seen;

alter table public.error_log enable row level security;

-- No policies, same as admin_audit_log and analytics_events. RLS with none
-- denies every client role outright; service_role bypasses RLS entirely.
--
-- This matters more here than for the other two. failure() deliberately keeps
-- driver messages out of the browser because they name tables, columns, and
-- hosts — and this table is where those messages are kept. A readable
-- error_log would hand back exactly what that function withholds.


-- ── Grouped view ────────────────────────────────────────────
--
-- What the console lists: one row per distinct failure, with how many times it
-- happened and when it last did. Sorted by recency rather than by count, since
-- a thing that broke ten minutes ago matters more than a thing that broke
-- eight hundred times last week and then stopped.
--
-- The sample columns come from the newest occurrence in each group — DISTINCT
-- ON picks the row, then the aggregate joins against it.
create or replace function public.admin_error_groups(days int default 7, lim int default 50)
returns table (
  fingerprint    text,
  scope          text,
  message        text,
  error_message  text,
  stack          text,
  request_id     text,
  path           text,
  occurrences    bigint,
  unseen         bigint,
  first_seen     timestamptz,
  last_seen      timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with span as (
    select e.* from public.error_log e
    where e.created_at >= now() - make_interval(days => days)
  ),
  tally as (
    select s.fingerprint,
           count(*)::bigint                            as occurrences,
           count(*) filter (where not s.seen)::bigint  as unseen,
           min(s.created_at)                           as first_seen,
           max(s.created_at)                           as last_seen
    from span s
    group by s.fingerprint
  ),
  newest as (
    select distinct on (s.fingerprint)
           s.fingerprint, s.scope, s.message, s.error_message, s.stack, s.request_id, s.path
    from span s
    order by s.fingerprint, s.created_at desc
  )
  select n.fingerprint, n.scope, n.message, n.error_message, n.stack, n.request_id, n.path,
         t.occurrences, t.unseen, t.first_seen, t.last_seen
  from tally t join newest n on n.fingerprint = t.fingerprint
  order by t.last_seen desc
  limit lim;
$$;


-- ── Retention ───────────────────────────────────────────────
--
-- Not a trigger and not automatic: deleting rows as a side effect of writing
-- one would put a scan in the path of the request that just failed. Schedule it
-- instead — Supabase cron, or any daily job:
--
--   select public.prune_error_log(30);
--
-- Returns how many it removed, so a scheduled run has something to log.
create or replace function public.prune_error_log(keep_days int default 30)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare removed bigint;
begin
  delete from public.error_log
  where created_at < now() - make_interval(days => keep_days);
  get diagnostics removed = row_count;
  return removed;
end $$;


-- ── Only the server may call these ──────────────────────────
--
-- Same reasoning as 033: SECURITY DEFINER functions are granted EXECUTE to
-- PUBLIC by default, which would let the anon key read every stack trace the
-- server has ever produced. Revoke from public, grant back to service_role
-- explicitly — it is a member of public, and it bypasses RLS, not privileges.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.admin_error_groups(int, int)',
    'public.prune_error_log(int)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
