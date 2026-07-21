-- Stories feature migration
-- Run in Supabase Dashboard → SQL Editor

-- 1. Stories table
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  type        text not null check (type in ('image', 'video', 'text', 'post')),
  media_url   text,
  text_content text,
  bg_colors   text[],                          -- [startColor, endColor] for text type
  post_id     uuid references public.posts(id) on delete set null,
  caption     text,
  created_at  timestamptz default now() not null,
  expires_at  timestamptz default (now() + interval '24 hours') not null
);

-- 2. Index for fast "active stories" query
create index if not exists stories_expires_at_idx on public.stories (expires_at);
create index if not exists stories_user_id_idx   on public.stories (user_id);

-- 3. RLS
alter table public.stories enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='stories' and policyname='stories_read') then
    create policy "stories_read" on public.stories
      for select using (expires_at > now());
  end if;
  if not exists (select 1 from pg_policies where tablename='stories' and policyname='stories_insert') then
    create policy "stories_insert" on public.stories
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='stories' and policyname='stories_delete') then
    create policy "stories_delete" on public.stories
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 4. Add stories table to realtime publication
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table public.stories;
  end if;
end $$;

-- 5. Storage bucket for story media (public)
insert into storage.buckets (id, name, public)
  values ('stories', 'stories', true)
  on conflict (id) do nothing;

-- Storage policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='stories_media_read') then
    create policy "stories_media_read" on storage.objects
      for select using (bucket_id = 'stories');
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='stories_media_insert') then
    create policy "stories_media_insert" on storage.objects
      for insert with check (bucket_id = 'stories' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='stories_media_delete') then
    create policy "stories_media_delete" on storage.objects
      for delete using (bucket_id = 'stories' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;
