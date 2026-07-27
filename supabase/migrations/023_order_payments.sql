-- ============================================================
-- Migration 023: Order payment state (Stripe)
-- The webhook marks orders paid/failed server-side as the source
-- of truth. Safe to re-run.
-- ============================================================

alter table orders add column if not exists payment_status    text not null default 'unpaid';  -- unpaid | paid | failed
alter table orders add column if not exists payment_intent_id text;

create index if not exists orders_payment_intent_idx on orders (payment_intent_id);
