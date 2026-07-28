-- ============================================================
-- Migration 025: Shop identity (logo + shop-branded conversations)
-- Adds a shop logo to seller applications and shop-context columns to
-- conversations so marketplace DMs display the shop, not the seller's
-- personal profile. Safe to re-run.
-- ============================================================

-- Shop logo captured during the seller application
alter table seller_applications add column if not exists logo_url text;

-- Shop context on a conversation. When shop_owner_id is set, the participant
-- with that id is rendered as the shop (name + logo) rather than as a person.
alter table conversations add column if not exists shop_owner_id uuid references public.profiles(id) on delete set null;
alter table conversations add column if not exists shop_name     text;
alter table conversations add column if not exists shop_logo_url text;
