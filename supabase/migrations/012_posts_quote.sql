-- Migration 012: quote repost support
alter table posts add column if not exists quote_post_id uuid references posts(id) on delete set null;
