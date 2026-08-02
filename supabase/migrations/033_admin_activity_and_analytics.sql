-- ============================================================
-- Migration 033: The two tables the admin console was inventing
--
-- The overview's "Recent activity" list and the whole Analytics section were
-- hardcoded arrays in the component. Not stale data — no data. There was no
-- table behind either one, so there was nothing to query.
--
-- This adds both:
--
--   admin_audit_log   what admins actually did, persisted. Until now the log
--                     lived in React state: it started as a fixed array and
--                     every entry an admin generated vanished on refresh.
--
--   analytics_events  first-party pageviews. No third party, no cookies, no
--                     personal data — a random visitor id in localStorage, a
--                     random session id in sessionStorage, a normalised path,
--                     and which kind of place the visit came from.
--
-- Both tables are sealed: RLS on with zero policies, which denies every client
-- role outright. Only the service-role key reads or writes them, which means
-- only a Privy-authenticated admin route can, because that's the only place
-- the key exists.
-- ============================================================


-- ── Admin audit log ─────────────────────────────────────────
--
-- actor_id is a Privy DID (`did:privy:...`), not a Supabase uuid — the console
-- authenticates with Privy and its users have no row in auth.users. actor_label
-- is what gets rendered, stored at write time so the log still reads correctly
-- after someone's name changes; an audit trail that rewrites itself isn't one.
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    text,
  actor_label text        not null default 'System',
  action      text        not null,
  target      text        not null default '',
  kind        text        not null default 'check',
  meta        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

-- Deliberately no policies. RLS with none denies everyone; service_role
-- bypasses RLS entirely. So: unreachable from any browser, readable and
-- writable only by the server.


-- ── Analytics events ────────────────────────────────────────
--
-- One row per pageview. `path` is normalised before insert (query string
-- dropped, ids collapsed to :id), so this table cannot accumulate the tokens,
-- search terms, or handles that live in URLs.
--
-- `source` is the referrer bucketed to one of four words at ingest. The raw
-- referring URL is never stored — the bucket is the only thing the console
-- shows, and keeping the rest would be collecting data with no use for it.
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  visitor_id text        not null,
  session_id text        not null,
  path       text        not null,
  source     text        not null default 'direct',  -- direct | search | social | referral
  created_at timestamptz not null default now()
);

-- Every query below is "rows in a date range", then grouped by session or
-- visitor. These three cover all of them.
create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, created_at);
create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor_id, created_at);

alter table public.analytics_events enable row level security;

-- Same as above: no policies. Inserts go through /api/track, which is rate
-- limited and normalises the path — a table anyone could insert into directly
-- would be a free write endpoint into the database.
--
-- This table grows one row per pageview forever. Before it matters, schedule
--   delete from public.analytics_events where created_at < now() - interval '1 year';
-- Nothing here reads past 60 days.


-- ── Daily series ────────────────────────────────────────────
--
-- Each of these returns 2 × `days` rows ending today: the caller renders the
-- last half as the chart and compares the two halves for the trend arrow. One
-- round trip instead of two, and the two windows are guaranteed to line up.
--
-- generate_series fills the gaps, so a day with no orders comes back as 0
-- rather than going missing and shifting the chart left.

create or replace function public.admin_gmv_series(days int default 30)
returns table (day date, cents bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select s.day,
         coalesce((
           select sum(o.total_cents) from public.orders o
           where o.payment_status = 'paid'
             and o.created_at >= s.day
             and o.created_at <  s.day + 1
         ), 0)::bigint
  from (
    select generate_series(current_date - (days * 2 - 1), current_date, interval '1 day')::date as day
  ) s
  order by s.day;
$$;

-- Cumulative headcount at the end of each day, not signups per day — "member
-- growth" is the total climbing. Counted as a baseline plus a running sum so
-- profiles is scanned once instead of once per day.
create or replace function public.admin_member_series(days int default 30)
returns table (day date, total bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  with span as (
    select generate_series(current_date - (days * 2 - 1), current_date, interval '1 day')::date as day
  ),
  base as (
    select count(*)::bigint as n
    from public.profiles
    where created_at < current_date - (days * 2 - 1)
  ),
  daily as (
    select s.day,
           (select count(*) from public.profiles p
             where p.created_at >= s.day and p.created_at < s.day + 1) as added
    from span s
  )
  select d.day,
         ((select n from base) + sum(d.added) over (order by d.day))::bigint
  from daily d
  order by d.day;
$$;

create or replace function public.admin_traffic_series(days int default 30)
returns table (day date, views bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select s.day,
         coalesce((
           select count(*) from public.analytics_events e
           where e.created_at >= s.day and e.created_at < s.day + 1
         ), 0)::bigint
  from (
    select generate_series(current_date - (days * 2 - 1), current_date, interval '1 day')::date as day
  ) s
  order by s.day;
$$;


-- ── Analytics summary ───────────────────────────────────────
--
-- Every scalar the Analytics page shows, in one row, with each figure paired
-- against the equivalent figure from the window before it so the trend arrows
-- are a real comparison rather than a decoration.
--
-- Definitions worth knowing before reading the numbers:
--
--   avg_seconds   last pageview minus first, per session, averaged. A session
--                 with one pageview counts as 0 — there is no second timestamp
--                 to measure against. Every analytics tool has this floor; it
--                 means the figure is a lower bound, not a lie.
--
--   retention     of the visitors seen in the `long_days` window before last,
--                 the share who came back during the last one. Returns 0/0 on
--                 a young install, which the caller renders as "—" rather than
--                 as 0%.
--
--   conversion    paid orders ÷ sessions. Sessions, not visitors: the same
--                 person shopping twice is two chances to convert.
create or replace function public.admin_analytics_summary(
  short_days int default 7,
  long_days  int default 30
)
returns table (
  views            bigint,
  prev_views       bigint,
  sessions         bigint,
  prev_sessions    bigint,
  avg_seconds      numeric,
  prev_avg_seconds numeric,
  orders_paid      bigint,
  prev_orders_paid bigint,
  retained         bigint,
  retention_base   bigint,
  total_events     bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with bounds as (
    select now() - make_interval(days => short_days)     as short_start,
           now() - make_interval(days => short_days * 2) as short_prev_start,
           now() - make_interval(days => long_days)      as long_start,
           now() - make_interval(days => long_days * 2)  as long_prev_start
  ),
  -- Per-session span, split by which window the session started in.
  spans as (
    select e.session_id,
           min(e.created_at) as first_seen,
           extract(epoch from (max(e.created_at) - min(e.created_at))) as seconds
    from public.analytics_events e, bounds b
    where e.created_at >= b.short_prev_start
    group by e.session_id
  )
  select
    (select count(*) from public.analytics_events e, bounds b
      where e.created_at >= b.short_start)::bigint,
    (select count(*) from public.analytics_events e, bounds b
      where e.created_at >= b.short_prev_start and e.created_at < b.short_start)::bigint,

    (select count(*) from spans s, bounds b where s.first_seen >= b.short_start)::bigint,
    (select count(*) from spans s, bounds b
      where s.first_seen >= b.short_prev_start and s.first_seen < b.short_start)::bigint,

    (select coalesce(round(avg(s.seconds)), 0) from spans s, bounds b
      where s.first_seen >= b.short_start),
    (select coalesce(round(avg(s.seconds)), 0) from spans s, bounds b
      where s.first_seen >= b.short_prev_start and s.first_seen < b.short_start),

    (select count(*) from public.orders o, bounds b
      where o.payment_status = 'paid' and o.created_at >= b.short_start)::bigint,
    (select count(*) from public.orders o, bounds b
      where o.payment_status = 'paid'
        and o.created_at >= b.short_prev_start and o.created_at < b.short_start)::bigint,

    (select count(*) from (
       select e.visitor_id from public.analytics_events e, bounds b
       where e.created_at >= b.long_prev_start and e.created_at < b.long_start
       intersect
       select e.visitor_id from public.analytics_events e, bounds b
       where e.created_at >= b.long_start
     ) r)::bigint,
    (select count(distinct e.visitor_id) from public.analytics_events e, bounds b
      where e.created_at >= b.long_prev_start and e.created_at < b.long_start)::bigint,

    (select count(*) from public.analytics_events)::bigint;
$$;


-- ── Breakdowns ──────────────────────────────────────────────

create or replace function public.admin_top_pages(days int default 30, lim int default 5)
returns table (path text, views bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  -- count(*) is repeated in ORDER BY rather than aliased: an alias here would
  -- share a name with the declared output column, and an unqualified reference
  -- that matches both a column and an OUT parameter is ambiguous.
  select e.path, count(*)::bigint
  from public.analytics_events e
  where e.created_at >= now() - make_interval(days => days)
  group by e.path
  order by count(*) desc, e.path
  limit lim;
$$;

-- Sessions by where they came from, attributed to the session's *first*
-- pageview. Counting every pageview instead would let one long visit from a
-- search result outweigh fifty short direct ones.
create or replace function public.admin_acquisition_sources(days int default 30)
returns table (source text, sessions bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  with firsts as (
    select distinct on (e.session_id) e.session_id, e.source
    from public.analytics_events e
    where e.created_at >= now() - make_interval(days => days)
    order by e.session_id, e.created_at
  )
  select f.source, count(*)::bigint
  from firsts f
  group by f.source
  order by count(*) desc;
$$;


-- ── Only the server may call any of these ────────────────────
--
-- All six are SECURITY DEFINER, so they run with the owner's rights regardless
-- of who calls them. Postgres grants EXECUTE to PUBLIC on new functions, which
-- would hand the anon key a complete read of the platform's revenue and
-- traffic. service_role is granted back explicitly because revoking from
-- public also revokes it — it is a member of public, and it bypasses RLS, not
-- privileges.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.admin_gmv_series(int)',
    'public.admin_member_series(int)',
    'public.admin_traffic_series(int)',
    'public.admin_analytics_summary(int, int)',
    'public.admin_top_pages(int, int)',
    'public.admin_acquisition_sources(int)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
