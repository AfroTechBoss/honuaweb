-- Link posts to communities
-- Run in Supabase Dashboard > SQL Editor
alter table posts add column if not exists community_id uuid references communities(id) on delete set null;
create index if not exists posts_community_id_idx on posts(community_id);
