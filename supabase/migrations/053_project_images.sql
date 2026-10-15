-- Migration 053: photos on map projects
--
-- The Start a project form now lets hosts attach up to six photos. The first
-- is still written to cover_url (015), which the map and the project card
-- already show; the full set goes in image_urls so the project page can show
-- all of them. Files live in the public `projects` bucket under the host's
-- own folder, which that bucket's policies already enforce.
--
-- Safe to re-run.

alter table public.projects add column if not exists image_urls text[] not null default '{}';

alter table public.projects drop constraint if exists projects_image_urls_max;
alter table public.projects
  add constraint projects_image_urls_max check (coalesce(array_length(image_urls, 1), 0) <= 6);

-- Existing projects with a cover keep it as their only photo.
update public.projects
   set image_urls = array[cover_url]
 where cover_url is not null and image_urls = '{}';
