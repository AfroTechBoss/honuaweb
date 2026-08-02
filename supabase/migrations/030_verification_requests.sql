-- ============================================================
-- Migration 030: Verification requests
--
-- The badge stops being something an account can end up with by accident.
-- People apply, an admin reads the application, and only then does
-- profiles.verified flip (which migration 029's trigger timestamps).
--
-- Three things live here:
--   1. verification_requests — the queue itself.
--   2. A guard so `verified` can only be set by the server. Without it the
--      whole review step is decorative: profiles is client-writable through
--      PostgREST and its owner-update policy has no column restriction, so
--      any signed-in account could PATCH itself verified and skip the queue.
--   3. A search_path on 029's stamp_verified_at(), which the database linter
--      flags as function_search_path_mutable.
--
-- Safe to re-run.
-- ============================================================

-- ── The queue ───────────────────────────────────────────────

create table if not exists public.verification_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  -- 'revoked' rows are written when a badge is taken away, so the record of who
  -- removed one sits in the same place as the record of who granted it.
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'revoked')),
  -- What the applicant is claiming to be, in their words. `category` shapes
  -- what an admin should be looking for; the rest is the case they make.
  category      text check (category in ('individual', 'organization', 'project', 'business')),
  real_name     text,
  links         text,
  note          text,
  -- The reviewer's side. reviewed_by holds the Privy user id of whoever decided
  -- it — not a profiles FK, because the admin console authenticates through
  -- Privy rather than Supabase auth, so a reviewer has no row in profiles to
  -- point at. It's taken from the verified token, never from the request body.
  reviewer_note text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists verification_requests_status_idx
  on public.verification_requests (status, created_at desc);
create index if not exists verification_requests_user_idx
  on public.verification_requests (user_id, created_at desc);

-- One open application per account. Re-applying while a review is in flight
-- would just give the queue two copies of the same person to read.
create unique index if not exists verification_requests_one_pending
  on public.verification_requests (user_id) where status = 'pending';

alter table public.verification_requests enable row level security;

drop policy if exists "verification_requests_owner_read" on public.verification_requests;
create policy "verification_requests_owner_read" on public.verification_requests
  for select using (auth.uid() = user_id);

-- Applicants may open their own application and nothing else. status is pinned
-- to 'pending' here so the insert can't arrive pre-approved, and there is
-- deliberately no update or delete policy: only the service-role review route
-- decides an outcome, and withdrawing an application would erase the record an
-- admin was in the middle of reading.
drop policy if exists "verification_requests_owner_insert" on public.verification_requests;
create policy "verification_requests_owner_insert" on public.verification_requests
  for insert with check (auth.uid() = user_id and status = 'pending');

-- ── Only the server may verify an account ───────────────────

-- SECURITY INVOKER on purpose: the check below reads the role the statement is
-- actually running as, and a definer function would report its own owner.
-- anon/authenticated are the two roles a browser can reach PostgREST with;
-- service_role (server routes) and postgres (SQL editor) fall through.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.verified    := old.verified;
    new.verified_at := old.verified_at;
    new.role        := old.role;
  end if;
  return new;
end $$;

-- Name matters: triggers of the same timing fire in name order, and this has
-- to run before profiles_stamp_verified_at so a reverted flag never gets
-- stamped with a date.
drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ── Linter fix carried over from 029 ────────────────────────

create or replace function public.stamp_verified_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.verified is distinct from old.verified then
    new.verified_at := case when new.verified then now() else null end;
  end if;
  return new;
end $$;
