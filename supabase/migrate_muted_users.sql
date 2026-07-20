-- ============================================================
-- Muted users  (idempotent)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.muted_users (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  muted_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, muted_id)
);

alter table public.muted_users enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='muted_users' and policyname='muted_users_owner_read') then
    create policy "muted_users_owner_read"   on public.muted_users for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='muted_users' and policyname='muted_users_owner_insert') then
    create policy "muted_users_owner_insert" on public.muted_users for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='muted_users' and policyname='muted_users_owner_delete') then
    create policy "muted_users_owner_delete" on public.muted_users for delete using (auth.uid() = user_id);
  end if;
end $$;
