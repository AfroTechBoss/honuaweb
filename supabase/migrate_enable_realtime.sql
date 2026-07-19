-- Enable Supabase Realtime for tables that need live updates.  (idempotent)
-- Run in Supabase Dashboard → SQL Editor

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'post_likes'
  ) then
    alter publication supabase_realtime add table public.post_likes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'post_reposts'
  ) then
    alter publication supabase_realtime add table public.post_reposts;
  end if;
end $$;

-- Full row data on DELETE so we get the old row's post_id
alter table public.post_likes    replica identity full;
alter table public.post_reposts  replica identity full;
