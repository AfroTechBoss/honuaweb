-- ============================================================
-- Migration 048: Orders are priced and created by the server
--   1. Buyers can no longer insert or update orders / order_items.
--   2. Sellers can change an item's status and nothing else.
--   3. checkout_intents: the server's quote for a checkout, written
--      before the card is charged.
--   4. finalize_checkout(): the Stripe webhook turns a paid quote into
--      the order, atomically and at most once.
--   5. seller_payout_ledger only counts sales that were actually paid.
--
-- Run this in Supabase Dashboard > SQL Editor.
-- Safe to re-run; every step is guarded.
--
-- Deploy order: ship the code that uses /api/checkout's new contract
-- together with (or before) running this. Old clients that still insert
-- orders from the browser will start getting RLS errors — which is the point.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- What was wrong
-- ════════════════════════════════════════════════════════════
--
-- Three holes, any one of them enough to take goods without paying:
--
--   * /api/checkout charged whatever `price` the browser put in the cart. Edit
--     the cart in devtools, pay $0.50 for a $300 item.
--   * The order row itself was written from the browser (lib/market.ts
--     createDbOrder) under "users create own orders", including
--     payment_status. `insert ... payment_status = 'paid'` needed no card.
--     "users update own orders" let a buyer flip an existing order to paid.
--   * The webhook marked an order paid on any succeeded PaymentIntent that
--     named it in metadata — never comparing what was charged with what the
--     order said it cost.
--
-- After this migration the browser never writes an order. /api/checkout
-- prices the cart from `products` with the service role and records that
-- quote here; the webhook checks Stripe's amount_received against the quote
-- and only then creates the order.


-- ════════════════════════════════════════════════════════════
-- 1. Buyers stop writing orders
-- ════════════════════════════════════════════════════════════

drop policy if exists "users create own orders" on public.orders;
drop policy if exists "users update own orders" on public.orders;
drop policy if exists "buyers create own order items" on public.order_items;

-- Reads are unchanged: "users see own orders", "buyers see own order items",
-- "sellers see their sold items" and the admin policies all stay.


-- ════════════════════════════════════════════════════════════
-- 2. Sellers may only move an item's status
-- ════════════════════════════════════════════════════════════
--
-- "sellers update their sold items" (020) has no column list, so a seller
-- could rewrite price_cents or quantity on their own line items — and the
-- payout ledger pays out of exactly those columns. Column privileges close it
-- without touching the policy: the row filter still decides *which* rows, the
-- grant now decides *which columns*.
--
-- The admin console writes order_items with the service role, which is not
-- affected by grants to `authenticated`.

revoke update on public.order_items from authenticated;
grant update (status) on public.order_items to authenticated;


-- ════════════════════════════════════════════════════════════
-- 3. checkout_intents
-- ════════════════════════════════════════════════════════════
--
-- One row per checkout attempt, keyed by the order id the order will get.
-- `lines` is the priced snapshot finalize_checkout copies into order_items;
-- `items` is the display shape the buyer's order page reads (name, brand,
-- price as "$12.00", quantity, imgUrl).
--
-- Snapshotting rather than re-reading products at finalize time matters: a
-- seller who changes a price between "Pay" and the webhook must not change
-- what this buyer is recorded as having paid.

create table if not exists public.checkout_intents (
  id                text primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  payment_intent_id text unique,
  items             jsonb not null,
  lines             jsonb not null,
  subtotal_cents    int not null check (subtotal_cents >= 0),
  shipping_cents    int not null check (shipping_cents >= 0),
  total_cents       int not null check (total_cents >= 50),
  currency          text not null default 'usd',
  status            text not null default 'open' check (status in ('open', 'finalized', 'rejected')),
  reject_reason     text,
  created_at        timestamptz not null default now(),
  finalized_at      timestamptz
);

create index if not exists checkout_intents_user_idx on public.checkout_intents (user_id, created_at desc);

-- RLS on, no policies: only the service role (the checkout route and the
-- webhook) can see or write these.
alter table public.checkout_intents enable row level security;


-- ════════════════════════════════════════════════════════════
-- 4. finalize_checkout
-- ════════════════════════════════════════════════════════════
--
-- Called by the Stripe webhook on payment_intent.succeeded. Returns one of:
--
--   'created'   the order and its line items were written
--   'exists'    already finalized — Stripe retried, or delivered twice
--   'missing'   no quote with that id (a legacy intent, or not ours)
--   'mismatch'  the quote belongs to another PaymentIntent, or the amount
--               Stripe captured is not what the quote said
--
-- 'mismatch' is recorded on the quote rather than raised, so the webhook can
-- acknowledge the event (Stripe would otherwise retry it forever) while the
-- row keeps the evidence for whoever reconciles it.
--
-- The `for update` lock serialises a retry that races the first delivery.

create or replace function public.finalize_checkout(
  p_order_id       text,
  p_payment_intent text,
  p_amount_cents   bigint,
  p_currency       text,
  p_email          text default null,
  p_address        jsonb default null
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  q public.checkout_intents;
begin
  select * into q from public.checkout_intents where id = p_order_id for update;
  if not found then
    return 'missing';
  end if;

  if q.status = 'finalized' or exists (select 1 from public.orders where id = q.id) then
    update public.checkout_intents
       set status = 'finalized', finalized_at = coalesce(finalized_at, now())
     where id = q.id;
    return 'exists';
  end if;

  if q.payment_intent_id is distinct from p_payment_intent then
    update public.checkout_intents
       set status = 'rejected', reject_reason = 'payment intent does not match this checkout'
     where id = q.id;
    return 'mismatch';
  end if;

  if p_amount_cents is distinct from q.total_cents::bigint
     or lower(coalesce(p_currency, '')) <> q.currency then
    update public.checkout_intents
       set status = 'rejected',
           reject_reason = format('charged %s %s, quoted %s %s',
                                  p_amount_cents, p_currency, q.total_cents, q.currency)
     where id = q.id;
    return 'mismatch';
  end if;

  insert into public.orders (
    id, user_id, items, subtotal_cents, shipping_cents, total_cents,
    email, address, payment_status, payment_intent_id
  ) values (
    q.id, q.user_id, q.items, q.subtotal_cents, q.shipping_cents, q.total_cents,
    nullif(trim(coalesce(p_email, '')), ''), p_address, 'paid', p_payment_intent
  );

  insert into public.order_items (
    order_id, buyer_id, product_id, seller_id, name, price_cents, quantity, image_url
  )
  select q.id,
         q.user_id,
         (l->>'product_id')::uuid,
         nullif(l->>'seller_id', '')::uuid,
         l->>'name',
         (l->>'price_cents')::int,
         (l->>'quantity')::int,
         l->>'image_url'
    from jsonb_array_elements(q.lines) l;

  -- Stock is tracked only where a seller set it (019: null means untracked).
  -- Clamped rather than raised: the money has already moved, and refusing the
  -- order now would leave a buyer charged with nothing recorded. The checkout
  -- route rejects quantities over stock up front; this only loses a race.
  update public.products p
     set stock = greatest(p.stock - l.qty, 0)
    from (
      select (x->>'product_id')::uuid as pid, sum((x->>'quantity')::int) as qty
        from jsonb_array_elements(q.lines) x
       group by 1
    ) l
   where p.id = l.pid and p.stock is not null;

  update public.checkout_intents
     set status = 'finalized', finalized_at = now()
   where id = q.id;

  return 'created';
end $$;

comment on function public.finalize_checkout(text, text, bigint, text, text, jsonb) is
  'Turns a server-priced checkout quote into a paid order once Stripe confirms the exact amount. Service role only; idempotent.';

revoke all on function public.finalize_checkout(text, text, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_checkout(text, text, bigint, text, text, jsonb) to service_role;


-- ════════════════════════════════════════════════════════════
-- 5. Only paid sales earn a payout
-- ════════════════════════════════════════════════════════════
--
-- 042's ledger counted every delivered line item. With browser-written orders
-- that included unpaid ones, so a seller (or a buyer colluding with one) could
-- manufacture a withdrawable balance. Same function, same signature — 045's
-- callers are unaffected — with the parent order's payment_status required.
-- Refunded orders drop out too, which is what a refund should do to earnings.

create or replace function public.seller_payout_ledger(p_seller uuid)
returns table (earned_cents bigint, committed_cents bigint, available_cents bigint)
language sql
stable
security definer
set search_path = public
as $$
  with earned as (
    select coalesce(floor(sum(oi.price_cents::numeric * coalesce(oi.quantity, 1)) * 0.95), 0)::bigint as cents
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where oi.seller_id = p_seller
       and oi.status = 'delivered'
       and o.payment_status = 'paid'
  ),
  committed as (
    select coalesce(sum(pr.amount_cents), 0)::bigint as cents
      from public.payout_requests pr
     where pr.seller_id = p_seller
       and pr.status in ('approved', 'paid')
  )
  select earned.cents,
         committed.cents,
         earned.cents - committed.cents
    from earned, committed;
$$;

comment on function public.seller_payout_ledger(uuid) is
  'Delivered, paid sales less the 5% platform fee, minus payouts already approved or paid. available_cents may be negative if a payout was approved above the balance before this guard existed.';

revoke all on function public.seller_payout_ledger(uuid) from public, anon, authenticated;
grant execute on function public.seller_payout_ledger(uuid) to service_role;
