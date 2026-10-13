-- Test listings for trying checkout and carbon retirement end to end.
-- NOT a migration: run it by hand in Supabase Dashboard > SQL Editor, and run
-- the "Remove" block at the bottom before launch.
--
-- Everything here is named "[TEST] ..." so it's obvious in the app and easy to
-- clean up. The products have no seller, so the account you're signed in with
-- can buy them (checkout refuses your own listings), and no seller payout is
-- created for them. Use Stripe test mode with card 4242 4242 4242 4242.
--
-- Safe to re-run: each row is only inserted if a row with that name is missing.

-- ---- Marketplace products ------------------------------------------------
insert into products (name, brand, price_cents, tag, category, description, status, stock, product_type, featured)
select v.* from (values
  ('[TEST] Checkout test item',     'Honua test', 500,  'Test', 'Home',
   'Test listing for trying checkout. Not a real product; nothing ships.', 'live', 100, 'physical', false),
  ('[TEST] Free-shipping test item', 'Honua test', 8000, 'Test', 'Home',
   'Priced above the free-shipping threshold so you can check that shipping drops to $0.', 'live', 100, 'physical', false)
) as v(name, brand, price_cents, tag, category, description, status, stock, product_type, featured)
where not exists (select 1 from products p where p.name = v.name);

-- ---- Carbon credits ------------------------------------------------------
insert into carbon_credits (name, region, type, verifier, vintage, price_cents, volume_t, tag, active)
select v.* from (values
  ('[TEST] Cheap test credit',   'Test', 'Forestry', 'Test only', '2026',  100, 1000::numeric, 'Test', true),
  ('[TEST] Removal test credit', 'Test', 'Removal',  'Test only', '2026', 2500,   50::numeric, 'Test', true)
) as v(name, region, type, verifier, vintage, price_cents, volume_t, tag, active)
where not exists (select 1 from carbon_credits c where c.name = v.name);

-- ---- Remove (run before launch) ------------------------------------------
-- Products are taken down rather than deleted so any test orders keep their
-- product rows. Carbon credits are deactivated for the same reason.
--
-- update products       set status = 'removed' where name like '[TEST]%';
-- update carbon_credits set active = false     where name like '[TEST]%';
