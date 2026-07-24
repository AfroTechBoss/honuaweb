-- Track who created each community
-- Run in Supabase Dashboard > SQL Editor
alter table communities add column if not exists created_by uuid references auth.users(id) on delete set null;
