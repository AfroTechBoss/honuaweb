-- ============================================================
-- Migration 019: Seller product management
-- Adds inventory fields so approved sellers can manage listings
-- from the dashboard. Safe to re-run.
-- ============================================================

alter table products add column if not exists stock        int;
alter table products add column if not exists low_stock_at int;
alter table products add column if not exists product_type text default 'physical';  -- physical | digital | service

-- Note on status values: the marketplace only shows status = 'live'.
-- Sellers may also use 'draft' and 'inactive'; admins use 'flagged'/'removed'.
