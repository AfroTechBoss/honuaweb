-- ============================================================
-- Migration 018: Impact verification loop
--   log action (+ proof photo, + optional feed post)
--   → community vouches → verified at 3 vouches
--   → linked post gains co2_saved_kg and enters the Verified feed
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Extend impact_logs
alter table impact_logs add column if not exists proof_url text;
alter table impact_logs add column if not exists post_id uuid references public.posts(id) on delete set null;
alter table impact_logs add column if not exists status text not null default 'unverified'
  check (status in ('unverified', 'pending', 'verified'));
alter table impact_logs add column if not exists vouch_count int not null default 0;
alter table impact_logs add column if not exists description text;

-- Existing verified=true logs (legacy flag) map to verified status
update impact_logs set status = 'verified' where verified = true and status = 'unverified';

-- ---- Vouches ----
create table if not exists impact_vouches (
  log_id      uuid not null references impact_logs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (log_id, user_id)
);

alter table impact_vouches enable row level security;

drop policy if exists "vouches viewable by everyone" on impact_vouches;
create policy "vouches viewable by everyone" on impact_vouches for select using (true);

-- You can vouch as yourself, but never for your own log
drop policy if exists "users vouch others' logs" on impact_vouches;
create policy "users vouch others' logs" on impact_vouches
  for insert with check (
    user_id = auth.uid()
    and auth.uid() <> (select user_id from impact_logs where id = log_id)
  );

drop policy if exists "users remove own vouches" on impact_vouches;
create policy "users remove own vouches" on impact_vouches
  for delete using (user_id = auth.uid());

-- ---- Verification trigger ----
-- 3 community vouches promote a log to verified; dropping below demotes it.
-- When a log is verified and linked to a post, the post receives the CO₂ value,
-- which is what the "Verified impact" feed tab filters on (co2_saved_kg > 0).
create or replace function handle_impact_vouch()
returns trigger language plpgsql security definer as $$
declare
  lid uuid;
  cnt int;
  log_row impact_logs%rowtype;
begin
  lid := coalesce(NEW.log_id, OLD.log_id);
  select count(*) into cnt from impact_vouches where log_id = lid;
  select * into log_row from impact_logs where id = lid;
  if not found then return null; end if;

  if cnt >= 3 and log_row.status <> 'verified' then
    update impact_logs set vouch_count = cnt, status = 'verified', verified = true where id = lid;
    if log_row.post_id is not null then
      update public.posts set co2_saved_kg = log_row.co2_saved_kg where id = log_row.post_id;
    end if;
  elsif cnt < 3 and log_row.status = 'verified' then
    update impact_logs set vouch_count = cnt, status = 'pending', verified = false where id = lid;
    if log_row.post_id is not null then
      update public.posts set co2_saved_kg = 0 where id = log_row.post_id;
    end if;
  else
    update impact_logs set vouch_count = cnt,
      status = case when cnt > 0 and log_row.status = 'unverified' then 'pending' else log_row.status end
      where id = lid;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_impact_vouch on impact_vouches;
create trigger trg_impact_vouch
  after insert or delete on impact_vouches
  for each row execute function handle_impact_vouch();

-- Owners may update their own logs (attach proof/post after the fact)
drop policy if exists "impact_logs: owner update" on impact_logs;
create policy "impact_logs: owner update"
  on impact_logs for update using (auth.uid() = user_id);
