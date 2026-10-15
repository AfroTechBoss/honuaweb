-- Migration 054: uncropped originals for project photos
--
-- Project photos are cropped square for the map pins and the project card
-- (053). The full-screen viewer should show the whole picture, so the
-- uncropped original (scaled down to at most 2400px) is stored too.
-- original_urls lines up index for index with image_urls; a photo that was
-- already square repeats its image_urls entry. Projects from before this
-- migration have none, and the viewer falls back to the square photos.
--
-- Safe to re-run.

alter table public.projects add column if not exists original_urls text[] not null default '{}';

alter table public.projects drop constraint if exists projects_original_urls_max;
alter table public.projects
  add constraint projects_original_urls_max check (coalesce(array_length(original_urls, 1), 0) <= 6);
