-- ============================================================
-- Migration 017: Seller applications — real apply → review → approve loop
-- Run this in Supabase Dashboard > SQL Editor
-- Safe to re-run; every column is backfilled before use.
-- ============================================================

-- Needed by the admin policy below (no-op if already present)
alter table profiles add column if not exists role text default 'user';

create table if not exists seller_applications (id uuid primary key default gen_random_uuid());

alter table seller_applications add column if not exists user_id         uuid references public.profiles(id) on delete cascade;
alter table seller_applications add column if not exists shop_name       text;
alter table seller_applications add column if not exists shop_handle     text;
alter table seller_applications add column if not exists tagline         text;
alter table seller_applications add column if not exists location        text;
alter table seller_applications add column if not exists categories      text[] default '{}';
alter table seller_applications add column if not exists offering_type   text default 'Physical goods';
alter table seller_applications add column if not exists ships_to        text;
alter table seller_applications add column if not exists practices       text[] default '{}';
alter table seller_applications add column if not exists certs           text[] default '{}';
alter table seller_applications add column if not exists impact_story    text;
alter table seller_applications add column if not exists legal_name      text;
alter table seller_applications add column if not exists biz_type        text;
alter table seller_applications add column if not exists country         text;
alter table seller_applications add column if not exists payout_method   text;
alter table seller_applications add column if not exists payout_schedule text;
alter table seller_applications add column if not exists status          text not null default 'pending';
alter table seller_applications add column if not exists review_notes    text;
alter table seller_applications add column if not exists created_at      timestamptz not null default now();
alter table seller_applications add column if not exists reviewed_at     timestamptz;

alter table seller_applications enable row level security;

drop policy if exists "users see own applications" on seller_applications;
create policy "users see own applications" on seller_applications for select using (user_id = auth.uid());

drop policy if exists "users create own applications" on seller_applications;
create policy "users create own applications" on seller_applications for insert with check (user_id = auth.uid());

drop policy if exists "admins review applications" on seller_applications;
create policy "admins review applications" on seller_applications for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
);
