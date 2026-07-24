-- Add post_kind to distinguish tip / question / win / discussion from regular posts
-- Run in Supabase Dashboard > SQL Editor
alter table posts add column if not exists post_kind text check (post_kind in ('tip', 'question', 'win', 'discussion'));
