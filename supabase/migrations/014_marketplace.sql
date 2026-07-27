-- ============================================================
-- Migration 014: Real marketplace — products + orders
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ---- Products ----
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  brand         text not null,
  price_cents   int  not null,
  tag           text,
  category      text default 'Home',
  image_url     text,
  description   text,
  rating        numeric(2,1) default 4.8,
  review_count  int default 0,
  seller_id     uuid references public.profiles(id) on delete set null,
  status        text not null default 'live' check (status in ('live', 'flagged', 'removed')),
  featured      boolean not null default false,
  compare_at_cents int,
  created_at    timestamptz not null default now()
);

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

-- Seed the catalogue (previously mock data). Safe to re-run.
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
where not exists (select 1 from products);

-- ---- Orders ----
create table if not exists orders (
  id             text primary key,                -- client-generated e.g. HN-2K4F9A
  user_id        uuid not null references public.profiles(id) on delete cascade,
  items          jsonb not null default '[]'::jsonb,
  subtotal_cents int not null default 0,
  shipping_cents int not null default 0,
  total_cents    int not null default 0,
  email          text,
  address        jsonb,
  status         text not null default 'processing' check (status in ('processing', 'shipped', 'delivered', 'cancelled', 'returned')),
  created_at     timestamptz not null default now()
);

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
create table if not exists product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  order_id    text references orders(id) on delete set null,
  stars       int not null check (stars between 1 and 5),
  body        text,
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)
);

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
