-- Migration 013: image attachments on comments
alter table comments add column if not exists image_url text;
