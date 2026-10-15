-- Migration 055: end times for map projects
--
-- Start a project now asks when the project ends as well as when it starts,
-- so the map can mark projects Live while they're running and Past after.
-- Projects without an end are treated as running for three hours.
--
-- Safe to re-run.

alter table public.projects add column if not exists ends_at timestamptz;

alter table public.projects drop constraint if exists projects_ends_after_start;
alter table public.projects
  add constraint projects_ends_after_start
  check (ends_at is null or starts_at is null or ends_at > starts_at);
