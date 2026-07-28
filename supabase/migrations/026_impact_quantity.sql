-- ============================================================
-- Migration 026: Quantity-based impact model
-- Impact is now computed as quantity × emission factor. Store the
-- quantity and its unit alongside each log for transparency
-- (e.g. "12 km not driven → 2.04 kg CO₂"). Safe to re-run.
-- ============================================================

alter table impact_logs add column if not exists quantity numeric;
alter table impact_logs add column if not exists unit text;
