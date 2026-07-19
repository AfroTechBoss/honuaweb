-- ============================================================
-- Notifications system + missing tables  (idempotent)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── post_likes ───────────────────────────────────────────────
create table if not exists public.post_likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
alter table public.post_likes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='post_likes' and policyname='post_likes_public_read')  then create policy "post_likes_public_read"  on public.post_likes for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename='post_likes' and policyname='post_likes_owner_insert') then create policy "post_likes_owner_insert" on public.post_likes for insert with check (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where tablename='post_likes' and policyname='post_likes_owner_delete') then create policy "post_likes_owner_delete" on public.post_likes for delete using (auth.uid() = user_id); end if;
end $$;

-- ── post_reposts ─────────────────────────────────────────────
create table if not exists public.post_reposts (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
alter table public.post_reposts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='post_reposts' and policyname='post_reposts_public_read')  then create policy "post_reposts_public_read"  on public.post_reposts for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename='post_reposts' and policyname='post_reposts_owner_insert') then create policy "post_reposts_owner_insert" on public.post_reposts for insert with check (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where tablename='post_reposts' and policyname='post_reposts_owner_delete') then create policy "post_reposts_owner_delete" on public.post_reposts for delete using (auth.uid() = user_id); end if;
end $$;

-- ── notifications ─────────────────────────────────────────────
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  actor_id     uuid references public.profiles(id) on delete set null,
  type         text not null,
  post_id      uuid references public.posts(id) on delete cascade,
  community_id uuid,
  badge_name   text,
  body         text not null,
  read         boolean default false,
  created_at   timestamptz default now()
);
create index if not exists notifications_user_created on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='notifs_owner_read')    then create policy "notifs_owner_read"    on public.notifications for select using (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='notifs_owner_update')  then create policy "notifs_owner_update"  on public.notifications for update using (auth.uid() = user_id); end if;
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='notifs_authed_insert') then create policy "notifs_authed_insert" on public.notifications for insert with check (auth.uid() = actor_id or actor_id is null); end if;
end $$;
