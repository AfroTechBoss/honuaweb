-- ============================================================
-- Migration 014: Real marketplace — products + orders
-- Run this in Supabase Dashboard > SQL Editor
-- Safe to re-run. Also safe if partial/older versions of these
-- tables already exist: every column is backfilled first.
-- ============================================================

-- OPTIONAL clean slate: if you previously created products/orders tables that
-- the app never used and the alters below still clash, uncomment these two
-- lines and re-run. (Only do this if those tables hold nothing you care about.)
-- drop table if exists product_reviews cascade;
-- drop table if exists products cascade; drop table if exists orders cascade;

-- Needed by the admin policies below (no-op if 011 already ran)
alter table profiles add column if not exists role text default 'user';

-- ---- Products ----
create table if not exists products (id uuid primary key default gen_random_uuid());

-- Backfill every column in case an older products table existed
alter table products add column if not exists name          text;
alter table products add column if not exists brand         text;
alter table products add column if not exists price_cents   int;
alter table products add column if not exists tag           text;
alter table products add column if not exists category      text default 'Home';
alter table products add column if not exists image_url     text;
alter table products add column if not exists description   text;
alter table products add column if not exists rating        numeric(2,1) default 4.8;
alter table products add column if not exists review_count  int default 0;
alter table products add column if not exists seller_id     uuid references public.profiles(id) on delete set null;
alter table products add column if not exists status        text not null default 'live';
alter table products add column if not exists featured      boolean not null default false;
alter table products add column if not exists compare_at_cents int;
alter table products add column if not exists created_at    timestamptz not null default now();

alter table products enable row level security;

drop policy if exists "products are viewable by everyone" on products;
create policy "products are viewable by everyone"
  on products for select using (status = 'live' or seller_id = auth.uid());

drop policy if exists "sellers manage own products" on products;
create policy "sellers manage own products"
  on products for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists "admins manage all products" on products;
create policy "admins manage all products"
  on products for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
  );

-- Seed the catalogue (previously mock data). Only inserts into an empty table.
insert into products (name, brand, price_cents, tag, category, image_url, description, rating, review_count, featured, compare_at_cents)
select * from (values
  ('Refillable shampoo bar',  'BareHaus', 1200, 'Plastic-free', 'Home',     'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80',  'Zero-waste shampoo bar in a refillable tin. Ships plastic-free and carbon-neutral.', 4.7, 134, false, null),
  ('Solar phone charger',     'Sunly',    4800, 'Solar',        'Energy',   'https://images.unsplash.com/photo-1620634409738-62a2e2b1a5b7?w=400&q=80', 'Foldable 20W solar charger. Repairable and backed by a 5-year warranty.', 4.8, 148, false, null),
  ('Bamboo cutlery set',      'Forrest',  1800, 'Compostable',  'Home',     'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&q=80', 'Travel cutlery roll in fast-growing bamboo. Fully compostable at end of life.', 4.9, 162, false, null),
  ('Reusable produce bags',   'Loop',     1600, 'Zero-waste',   'Home',     'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80', 'Set of 8 mesh produce bags. Replaces hundreds of single-use plastic bags a year.', 4.7, 176, false, null),
  ('Wool insulation panel',   'Hjem',     8900, 'Carbon-neg',   'Home',     'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',  'Sheep-wool insulation that stores more carbon than its production emits.', 4.8, 190, false, null),
  ('Compost starter kit',     'Soily',    3400, 'Soil',         'Outdoors', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80', 'Everything you need to start composting at home, including a season of coaching.', 4.9, 204, false, null),
  ('The repair kit',          'Fix-it Collective', 8400, 'Repairable', 'Home', null, '92 tools, one foldable case. Every purchase funds a community repair café for a month.', 4.9, 214, true, 12000)
) as v(name, brand, price_cents, tag, category, image_url, description, rating, review_count, featured, compare_at_cents)
-- seed unless valid catalogue rows already exist (rows from a leftover table
-- that lack name/price don't count)
where not exists (select 1 from products where name is not null and price_cents is not null);

-- ---- Orders ----
-- Client-generated text ids (e.g. ORD-2K4F9A)
create table if not exists orders (id text primary key);

-- If a leftover orders table used uuid ids, convert to text so the app's
-- client-generated ids ('ORD-XXXXXX') can be inserted. Old policies on the
-- table block the type change, so drop them first — ours are recreated below.
do $$
declare pol record;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    begin
      for pol in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = 'orders'
      loop
        execute format('drop policy if exists %I on public.orders', pol.policyname);
      end loop;
      alter table public.orders alter column id drop default;
      alter table public.orders alter column id type text using id::text;
    exception when others then
      raise exception 'orders.id is uuid and could not be converted to text (%). If the old orders table is unused, run: drop table if exists orders cascade; then re-run this migration.', sqlerrm;
    end;
  end if;
end $$;

alter table orders add column if not exists user_id        uuid references public.profiles(id) on delete cascade;
alter table orders add column if not exists items          jsonb not null default '[]'::jsonb;
alter table orders add column if not exists subtotal_cents int not null default 0;
alter table orders add column if not exists shipping_cents int not null default 0;
alter table orders add column if not exists total_cents    int not null default 0;
alter table orders add column if not exists email          text;
alter table orders add column if not exists address        jsonb;
alter table orders add column if not exists status         text not null default 'processing';
alter table orders add column if not exists created_at     timestamptz not null default now();

alter table orders enable row level security;

drop policy if exists "users see own orders" on orders;
create policy "users see own orders" on orders for select using (user_id = auth.uid());

drop policy if exists "users create own orders" on orders;
create policy "users create own orders" on orders for insert with check (user_id = auth.uid());

drop policy if exists "users update own orders" on orders;
create policy "users update own orders" on orders for update using (user_id = auth.uid());

drop policy if exists "admins see all orders" on orders;
create policy "admins see all orders" on orders for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
);

-- ---- Product reviews (real ratings instead of fabricated stars) ----
create table if not exists product_reviews (id uuid primary key default gen_random_uuid());

alter table product_reviews add column if not exists product_id uuid references products(id) on delete cascade;
alter table product_reviews add column if not exists user_id    uuid references public.profiles(id) on delete cascade;
-- plain text, no FK: order ids are client-generated and the link is informational
alter table product_reviews add column if not exists order_id   text;
alter table product_reviews add column if not exists stars      int;
alter table product_reviews add column if not exists body       text;
alter table product_reviews add column if not exists created_at timestamptz not null default now();

-- One review per user per product (needed for the client's upsert)
create unique index if not exists product_reviews_product_user_uidx
  on product_reviews (product_id, user_id);

alter table product_reviews enable row level security;

drop policy if exists "reviews viewable by everyone" on product_reviews;
create policy "reviews viewable by everyone" on product_reviews for select using (true);

drop policy if exists "users write own reviews" on product_reviews;
create policy "users write own reviews" on product_reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Keep product rating/review_count in sync
create or replace function update_product_rating()
returns trigger language plpgsql security definer as $$
declare pid uuid;
begin
  pid := coalesce(NEW.product_id, OLD.product_id);
  update products set
    review_count = (select count(*) from product_reviews where product_id = pid),
    rating = coalesce((select round(avg(stars)::numeric, 1) from product_reviews where product_id = pid), rating)
  where id = pid;
  return null;
end;
$$;

drop trigger if exists trg_product_rating on product_reviews;
create trigger trg_product_rating
  after insert or update or delete on product_reviews
  for each row execute function update_product_rating();
