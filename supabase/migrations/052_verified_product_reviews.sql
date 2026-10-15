-- Migration 052: product reviews only from people who bought the product
--
-- product_reviews (014) let any signed-in user rate any product any number of
-- stars — including 0 or 500 — and the product page mostly ignored the table
-- in favour of localStorage. The client now reads and writes this table only,
-- so it has to hold the rules:
--
--   * stars must be 1–5
--   * you can only review a product you have a paid order for
--   * deleting the last review takes the rating back to 0, not to whatever
--     stale value the product had (024 made 0 the "no reviews yet" value)
--
-- Safe to re-run.

-- 1. Star range ----------------------------------------------------------------
-- NOT VALID so any junk rows already there don't block the migration; new and
-- edited rows are checked.
alter table public.product_reviews drop constraint if exists product_reviews_stars_range;
alter table public.product_reviews
  add constraint product_reviews_stars_range check (stars between 1 and 5) not valid;

-- 2. Verified purchase ---------------------------------------------------------
-- Security definer so it can look at order_items/orders regardless of the
-- caller's RLS; it only ever answers for auth.uid().
create or replace function public.has_purchased(p_product uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product
      and oi.buyer_id = auth.uid()
      and o.payment_status in ('paid', 'refunded')
      and coalesce(oi.status, '') <> 'cancelled'
  );
$$;

grant execute on function public.has_purchased(uuid) to authenticated;

drop policy if exists "only buyers review (insert)" on public.product_reviews;
create policy "only buyers review (insert)" on public.product_reviews
  as restrictive for insert to authenticated
  with check (public.has_purchased(product_id));

drop policy if exists "only buyers review (update)" on public.product_reviews;
create policy "only buyers review (update)" on public.product_reviews
  as restrictive for update to authenticated
  using (true)
  with check (public.has_purchased(product_id));

-- 3. Rating falls back to 0 ------------------------------------------------------
create or replace function public.update_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.products set
    review_count = (select count(*) from public.product_reviews where product_id = pid),
    rating = coalesce((select round(avg(stars)::numeric, 1) from public.product_reviews where product_id = pid), 0)
  where id = pid;
  return null;
end;
$$;
