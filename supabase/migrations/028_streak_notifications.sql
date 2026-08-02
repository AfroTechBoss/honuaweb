-- ============================================================
-- Migration 028: Streak notifications
--
-- Two new notifications on the impact streak:
--   streak_risk  — a few hours before local midnight, when nothing is logged
--                  today and a streak is on the line
--   streak_ended — just after local midnight, when yesterday went unlogged
--
-- Both are sent by the hourly job at /api/cron/streak. Two things it needs
-- that didn't exist:
--
--  1. profiles.timezone — a streak is measured in the user's local calendar
--     days (see computeStreak in lib/impact.ts), so "a couple of hours before
--     the streak ends" is only meaningful per-user. The server has no way to
--     know that; the client writes its IANA zone on sign-in and the job falls
--     back to UTC when it's missing.
--
--  2. impact_streak_notices — the job runs hourly and a user can sit inside
--     the send window for more than one run, so the notice needs a natural
--     key to be idempotent against. One row per user, per kind, per local
--     day; the primary key does the deduping.
--
-- Safe to re-run.
-- ============================================================

alter table public.profiles add column if not exists timezone text;

create table if not exists impact_streak_notices (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  -- 'streak_risk' | 'streak_ended'
  kind       text not null,
  -- The user's LOCAL calendar day the notice is about, not the send time.
  for_day    date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, for_day)
);

alter table impact_streak_notices enable row level security;

-- Owner-read only, and no client writes at all: the cron job holds the service
-- role key and bypasses RLS, so leaving insert/update/delete unpolicied means a
-- browser can never forge or clear a notice to re-trigger a send.
drop policy if exists "streak_notices owner read" on impact_streak_notices;
create policy "streak_notices owner read" on impact_streak_notices
  for select using (user_id = auth.uid());

-- The job scans "who logged recently" by user and day.
create index if not exists impact_logs_user_logged_at
  on impact_logs (user_id, logged_at desc);
