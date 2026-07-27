-- ============================================================
-- Migration 017: Seller applications — real apply → review → approve loop
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

create table if not exists seller_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  shop_name    text not null,
  shop_handle  text,
  tagline      text,
  location     text,
  categories   text[] default '{}',
  offering_type text default 'Physical goods',
  ships_to     text,
  practices    text[] default '{}',
  certs        text[] default '{}',
  impact_story text,
  legal_name   text,
  biz_type     text,
  country      text,
  payout_method text,
  payout_schedule text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

alter table seller_applications enable row level security;

drop policy if exists "users see own applications" on seller_applications;
create policy "users see own applications" on seller_applications for select using (user_id = auth.uid());

drop policy if exists "users create own applications" on seller_applications;
create policy "users create own applications" on seller_applications for insert with check (user_id = auth.uid());

drop policy if exists "admins review applications" on seller_applications;
create policy "admins review applications" on seller_applications for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
);
