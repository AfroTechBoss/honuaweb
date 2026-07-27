-- ============================================================
-- Migration 015: Action Map — real projects with coordinates + RSVPs
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Extend the existing projects table for the map
alter table public.projects add column if not exists lat double precision;
alter table public.projects add column if not exists lng double precision;
alter table public.projects add column if not exists category text default 'Cleanup';
alter table public.projects add column if not exists starts_at timestamptz;
alter table public.projects add column if not exists when_label text;      -- e.g. "Every Sat · 10am–2pm"
alter table public.projects add column if not exists location_name text;   -- e.g. "Brooklyn, NY"
alter table public.projects add column if not exists host_name text;       -- display name of host
alter table public.projects add column if not exists going_count int not null default 0;

alter table public.projects enable row level security;

drop policy if exists "projects viewable by everyone" on public.projects;
create policy "projects viewable by everyone" on public.projects for select using (true);

drop policy if exists "users create own projects" on public.projects;
create policy "users create own projects" on public.projects for insert with check (user_id = auth.uid());

drop policy if exists "users update own projects" on public.projects;
create policy "users update own projects" on public.projects for update using (user_id = auth.uid());

drop policy if exists "users delete own projects" on public.projects;
create policy "users delete own projects" on public.projects for delete using (user_id = auth.uid());

-- ---- RSVPs ----
create table if not exists project_rsvps (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table project_rsvps enable row level security;

drop policy if exists "rsvps viewable by everyone" on project_rsvps;
create policy "rsvps viewable by everyone" on project_rsvps for select using (true);

drop policy if exists "users manage own rsvps" on project_rsvps;
create policy "users manage own rsvps" on project_rsvps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Keep going_count accurate
create or replace function update_project_going_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.projects set going_count = going_count + 1 where id = NEW.project_id;
  elsif TG_OP = 'DELETE' then
    update public.projects set going_count = greatest(going_count - 1, 0) where id = OLD.project_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_project_going_count on project_rsvps;
create trigger trg_project_going_count
  after insert or delete on project_rsvps
  for each row execute function update_project_going_count();
