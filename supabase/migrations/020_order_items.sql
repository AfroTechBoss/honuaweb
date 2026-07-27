-- ============================================================
-- Migration 020: Order items — seller order visibility + fulfillment
-- Orders stay owned by buyers; each line item carries the seller_id
-- so sellers can see and fulfil exactly their part of an order.
-- Item status changes roll up to the buyer's order automatically.
-- Safe to re-run.
-- ============================================================

-- A leftover order_items table from an earlier experiment may still exist with
-- a uuid order_id (its FK was cascade-dropped with the old orders table, but
-- the table survived). The new orders use text ids, so: if the leftover is
-- EMPTY, drop and recreate it; if it has rows, stop and let a human decide.
do $$
declare n bigint;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items'
      and column_name = 'order_id' and data_type = 'uuid'
  ) then
    execute 'select count(*) from public.order_items' into n;
    if n = 0 then
      drop table public.order_items cascade;
    else
      raise exception 'Leftover order_items table has % row(s) with uuid order ids. Back up anything you need, run: drop table if exists order_items cascade; then re-run this migration.', n;
    end if;
  end if;
end $$;

create table if not exists order_items (id uuid primary key default gen_random_uuid());

alter table order_items add column if not exists order_id    text references orders(id) on delete cascade;
alter table order_items add column if not exists buyer_id    uuid references public.profiles(id) on delete set null;
alter table order_items add column if not exists product_id  uuid references products(id) on delete set null;
alter table order_items add column if not exists seller_id   uuid references public.profiles(id) on delete set null;
alter table order_items add column if not exists name        text;
alter table order_items add column if not exists price_cents int not null default 0;
alter table order_items add column if not exists quantity    int not null default 1;
alter table order_items add column if not exists image_url   text;
alter table order_items add column if not exists status      text not null default 'processing';  -- processing|confirmed|shipped|delivered|cancelled
alter table order_items add column if not exists created_at  timestamptz not null default now();

alter table order_items enable row level security;

-- Buyers see the items of their own orders
drop policy if exists "buyers see own order items" on order_items;
create policy "buyers see own order items" on order_items for select
  using (buyer_id = auth.uid());

-- Sellers see items sold by them
drop policy if exists "sellers see their sold items" on order_items;
create policy "sellers see their sold items" on order_items for select
  using (seller_id = auth.uid());

-- Buyers create items for their own orders at checkout
drop policy if exists "buyers create own order items" on order_items;
create policy "buyers create own order items" on order_items for insert
  with check (
    buyer_id = auth.uid()
    and exists (select 1 from orders where orders.id = order_id and orders.user_id = auth.uid())
  );

-- Sellers advance fulfillment on their items
drop policy if exists "sellers update their sold items" on order_items;
create policy "sellers update their sold items" on order_items for update
  using (seller_id = auth.uid());

drop policy if exists "admins manage order items" on order_items;
create policy "admins manage order items" on order_items for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
);

-- ---- Roll item statuses up to the parent order ----
-- The order's status is the least-advanced stage across its non-cancelled
-- items (an order isn't "shipped" until everything shipped). All cancelled →
-- cancelled. Security definer so the seller's update can move the buyer-owned
-- order row.
create or replace function sync_order_status()
returns trigger language plpgsql security definer as $$
declare
  oid text;
  new_status text;
begin
  oid := coalesce(NEW.order_id, OLD.order_id);
  if oid is null then return null; end if;

  select case
    when count(*) filter (where status <> 'cancelled') = 0 then 'cancelled'
    when count(*) filter (where status = 'processing' and status <> 'cancelled') > 0 then 'processing'
    when count(*) filter (where status = 'confirmed') > 0 then 'processing'
    when count(*) filter (where status = 'shipped') > 0 then 'shipped'
    else 'delivered'
  end into new_status
  from order_items where order_id = oid;

  if new_status is not null then
    update orders set status = new_status where id = oid and status is distinct from new_status;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_order_status on order_items;
create trigger trg_sync_order_status
  after insert or update or delete on order_items
  for each row execute function sync_order_status();
