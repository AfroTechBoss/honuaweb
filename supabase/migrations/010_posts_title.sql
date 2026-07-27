-- Migration 010: optional title for community posts
alter table posts add column if not exists title text;
