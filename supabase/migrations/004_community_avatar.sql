-- Add avatar_url to communities (separate from cover_url)
-- Run in Supabase Dashboard > SQL Editor
alter table communities add column if not exists avatar_url text;
