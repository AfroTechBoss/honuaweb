-- ============================================================
-- Blocked users  (idempotent)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.blocked_users (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, blocked_id)
);

alter table public.blocked_users enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='blocked_users' and policyname='blocked_users_owner_read') then
    create policy "blocked_users_owner_read"   on public.blocked_users for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='blocked_users' and policyname='blocked_users_owner_insert') then
    create policy "blocked_users_owner_insert" on public.blocked_users for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='blocked_users' and policyname='blocked_users_owner_delete') then
    create policy "blocked_users_owner_delete" on public.blocked_users for delete using (auth.uid() = user_id);
  end if;
  -- Allow anyone to check if they are blocked (needed for the "you are blocked" profile view)
  if not exists (select 1 from pg_policies where tablename='blocked_users' and policyname='blocked_users_blocked_read') then
    create policy "blocked_users_blocked_read" on public.blocked_users for select using (auth.uid() = blocked_id);
  end if;
end $$;
