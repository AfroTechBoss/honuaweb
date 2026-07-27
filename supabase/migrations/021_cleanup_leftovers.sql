-- ============================================================
-- Migration 021: Drop leftover tables from the pre-app experiment
-- None of these are referenced anywhere in the codebase or in any
-- schema/migration file. They caused three migration collisions
-- (products' missing columns, orders' uuid ids, order_items' uuid
-- order_id) — removing them ends that class of failure for good.
-- Safe to re-run.
-- ============================================================

drop table if exists actions cascade;
drop table if exists cart_items cascade;
drop table if exists conversation_participants cascade;
drop table if exists event_rsvps cascade;
drop table if exists events cascade;
drop table if exists reposts cascade;
drop table if exists shops cascade;
drop table if exists tips cascade;

-- Legacy from the original schema.sql, never used by the app
-- (the app uses post_likes; the likes-count trigger lives on post_likes):
drop table if exists likes cascade;
