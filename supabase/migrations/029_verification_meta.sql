-- ============================================================
-- Migration 029: Verification metadata & handle history
--
-- Clicking the badge on a profile now opens a panel that explains what the
-- badge means for THAT account. Two of the facts it wants didn't exist:
--
--  1. profiles.verified_at — `verified` is a bare boolean, so "verified since
--     June 2026" had nothing to read. A trigger stamps it whenever the flag
--     flips, so no admin path has to remember to set it by hand.
--
--  2. handle_history — a username is the one identity field that can be
--     handed off to someone else, so how often it has changed is worth
--     showing next to a trust badge. A trigger records every rename.
--
-- Both triggers live in the database rather than in app code: profiles is
-- writable by its owner through PostgREST, so anything enforced only in the
-- client is advisory. Safe to re-run.
-- ============================================================

alter table public.profiles add column if not exists verified_at timestamptz;

-- Accounts verified before this migration stay NULL on purpose. We don't know
-- when they were verified, and inventing a date would put a fabricated fact
-- behind a badge whose entire job is to be trustworthy. The panel omits the
-- "verified since" line when it's missing.

create or replace function public.stamp_verified_at()
returns trigger language plpgsql as $$
begin
  if new.verified is distinct from old.verified then
    new.verified_at := case when new.verified then now() else null end;
  end if;
  return new;
end $$;

drop trigger if exists profiles_stamp_verified_at on public.profiles;
create trigger profiles_stamp_verified_at
  before update on public.profiles
  for each row execute function public.stamp_verified_at();

-- ── Handle history ──────────────────────────────────────────

create table if not exists public.handle_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  old_handle text not null,
  new_handle text not null,
  changed_at timestamptz not null default now()
);

create index if not exists handle_history_user_idx
  on public.handle_history (user_id, changed_at desc);

alter table public.handle_history enable row level security;

-- Readable by anyone, because the count sits on a public profile next to a
-- public badge. Deliberately no insert/update/delete policy: only the trigger
-- below writes here, and it runs as definer, so a browser can neither forge a
-- rename nor quietly erase one of its own.
drop policy if exists "handle history is public" on public.handle_history;
create policy "handle history is public" on public.handle_history
  for select using (true);

create or replace function public.log_handle_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.handle is distinct from old.handle then
    insert into public.handle_history (user_id, old_handle, new_handle)
    values (old.id, old.handle, new.handle);
  end if;
  return new;
end $$;

drop trigger if exists profiles_log_handle_change on public.profiles;
create trigger profiles_log_handle_change
  after update on public.profiles
  for each row execute function public.log_handle_change();
