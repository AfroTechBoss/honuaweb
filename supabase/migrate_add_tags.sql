-- Safe migration: adds tags column to existing posts table
-- Run this in Supabase Dashboard → SQL Editor
-- Does NOT drop any existing data

alter table public.posts
  add column if not exists tags text[] default '{}';
