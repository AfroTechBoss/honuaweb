-- ============================================================
-- Bookmarks & Collections
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── collections ──────────────────────────────────────────────
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  emoji       text default '🔖',
  created_at  timestamptz default now()
);

alter table public.collections enable row level security;
create policy "collections_owner_read"   on public.collections for select using (auth.uid() = user_id);
create policy "collections_owner_insert" on public.collections for insert with check (auth.uid() = user_id);
create policy "collections_owner_update" on public.collections for update using (auth.uid() = user_id);
create policy "collections_owner_delete" on public.collections for delete using (auth.uid() = user_id);

-- ── bookmarks ─────────────────────────────────────────────────
create table if not exists public.bookmarks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  post_id       uuid not null references public.posts(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  created_at    timestamptz default now(),
  unique (user_id, post_id, collection_id)
);

create index if not exists bookmarks_user_created on public.bookmarks(user_id, created_at desc);

alter table public.bookmarks enable row level security;
create policy "bookmarks_owner_read"   on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_owner_insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_owner_delete" on public.bookmarks for delete using (auth.uid() = user_id);
