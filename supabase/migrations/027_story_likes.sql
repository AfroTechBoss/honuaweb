-- ============================================================
-- Migration 027: Story likes
-- Persist likes on stories (the story viewer's heart). Story replies
-- are sent as real DMs via the existing conversations/messages tables,
-- so they need no new schema. Safe to re-run.
-- ============================================================

create table if not exists story_likes (
  story_id   uuid not null references stories(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

alter table story_likes enable row level security;

drop policy if exists "story_likes public read" on story_likes;
create policy "story_likes public read" on story_likes for select using (true);

drop policy if exists "story_likes owner insert" on story_likes;
create policy "story_likes owner insert" on story_likes for insert with check (user_id = auth.uid());

drop policy if exists "story_likes owner delete" on story_likes;
create policy "story_likes owner delete" on story_likes for delete using (user_id = auth.uid());
