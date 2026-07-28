-- ============================================================
-- Migration 024: Products start at 0 stars until reviewed
-- The rating trigger (014) fills the real average once reviews
-- exist; this stops new listings showing a fake default rating.
-- Safe to re-run.
-- ============================================================

alter table products alter column rating set default 0;

-- Zero the rating on anything with no reviews (leaves the seeded demo
-- catalogue, which carries illustrative review counts, untouched)
update products set rating = 0 where coalesce(review_count, 0) = 0;
