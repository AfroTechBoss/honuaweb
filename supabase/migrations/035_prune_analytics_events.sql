-- 035 — retention for analytics_events
--
-- 033 created the table and left a note where this function should have gone:
--
--   "This table grows one row per pageview forever. Before it matters, schedule
--    delete from public.analytics_events where created_at < now() - interval '1 year';
--    Nothing here reads past 60 days."
--
-- That note is doing no work as a comment. This makes it a function the daily
-- cron can call (/api/cron/prune), alongside prune_error_log from 034.
--
-- Why a function rather than the raw DELETE the comment suggests: the route
-- holds the service-role key, and a route that can run arbitrary deletes is a
-- much larger thing to secure than a route that can call one named function
-- with an integer. The same reason admin_error_groups exists instead of a
-- hand-built query.
--
-- ── Why 365 and not 60 ──────────────────────────────────────
--
-- 60 days is the read horizon, and it is exact rather than approximate:
-- admin_analytics_summary defaults to long_days = 30 and reaches back
-- long_days * 2 for the retention cohort, and admin_traffic_series returns
-- 2 × days ending today. Nothing in the console asks for day 61.
--
-- Pruning at 60 would still be wrong. It would leave the table holding exactly
-- what is on screen and nothing else, so the first question anyone asks that
-- the console doesn't already answer — was this quarter better than the last —
-- has no data behind it, permanently and unrecoverably. A pageview row is a
-- handful of bytes with no personal data in it (see 033: a random visitor id, a
-- normalised path, a bucketed referrer). A year of them is cheap; a year of
-- them thrown away is not recoverable at any price.
--
-- The point of this function is bounding growth, not minimising storage.
--
-- ── One edge worth knowing ──────────────────────────────────
--
-- admin_analytics_summary returns total_events as count(*) over the whole
-- table, and the console reads it as "collecting" — the flag that tells
-- "no traffic yet" apart from "a quiet week". A site with no traffic at all for
-- a full year would prune down to zero rows and read as never having collected
-- anything. That is a site with bigger problems than a mislabelled panel, and
-- fixing it properly means a separate counter that survives the delete. Left
-- alone deliberately.
create or replace function public.prune_analytics_events(keep_days int default 365)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare removed bigint;
begin
  delete from public.analytics_events
  where created_at < now() - make_interval(days => keep_days);
  get diagnostics removed = row_count;
  return removed;
end $$;


-- ── Only the server may call this ───────────────────────────
--
-- Same reasoning as 033 and 034. SECURITY DEFINER plus the default EXECUTE
-- grant to PUBLIC would hand the anon key a delete over the traffic table —
-- worse than a read, since the rows do not come back.
--
-- Plain DDL rather than the do-block loop 033 and 034 use: that loop exists to
-- iterate a list of function names, and there is one here.
revoke all on function public.prune_analytics_events(int) from public, anon, authenticated;
grant execute on function public.prune_analytics_events(int) to service_role;
