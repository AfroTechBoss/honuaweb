-- ============================================================
-- Migration 049: Carbon retirements are paid for
--   1. The browser can no longer retire credits for free.
--   2. carbon_checkouts: the server's quote for a retirement,
--      written before the card is charged.
--   3. finalize_carbon_checkout(): the Stripe webhook turns a paid
--      quote into a retirement, atomically and at most once.
--
-- Run this in Supabase Dashboard > SQL Editor, after 047 and 048.
-- Safe to re-run; every step is guarded.
--
-- Deploy order: ship the code that uses /api/carbon/checkout together
-- with (or before) running this. Old clients that still call
-- retire_carbon_credit() will get a permission error — which is the point.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- What was wrong
-- ════════════════════════════════════════════════════════════
--
-- 047 moved retirement behind retire_carbon_credit(), so the browser stopped
-- naming the price. But nothing took the money: any signed-in user could call
-- the function and retire real inventory, stamped payment_state = 'unpaid'.
--
-- Now the shape matches the product checkout in 048. /api/carbon/checkout
-- prices the retirement from carbon_credits with the service role and records
-- the quote here; the webhook checks Stripe's amount_received against the
-- quote and only then decrements inventory and writes the retirement.


-- ════════════════════════════════════════════════════════════
-- 1. No more free retirements
-- ════════════════════════════════════════════════════════════
--
-- The function itself is kept (it documents what 047 did, and an admin can
-- still run it by hand from the SQL editor) but nobody signed in through the
-- app may call it any more.

revoke execute on function public.retire_carbon_credit(uuid, numeric) from authenticated;

-- Retirements that came out of the old path stay 'unpaid' — that is the
-- truth about them. The app counts only paid ones from here on.


-- ════════════════════════════════════════════════════════════
-- 2. carbon_checkouts
-- ════════════════════════════════════════════════════════════
--
-- One row per attempt. The price is snapshotted at quote time: an admin who
-- reprices a credit between "Pay" and the webhook must not change what this
-- buyer is recorded as having paid.
--
-- Inventory is NOT reserved at quote time — an abandoned checkout must not
-- lock tonnes away. It is checked when quoting and again, under a row lock,
-- when finalizing. Losing that race returns 'oversold' and the webhook
-- refunds the payment.

create table if not exists public.carbon_checkouts (
  id                text primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  -- Cascade so the admin console can still delete a credit nobody retired
  -- against. A checkout in flight for it then finalizes as 'missing' and the
  -- webhook refunds it.
  credit_id         uuid not null references public.carbon_credits(id) on delete cascade,
  credit_name       text not null,
  tonnes            numeric not null check (tonnes > 0 and tonnes <= 100000),
  unit_cents        int not null check (unit_cents > 0),
  total_cents       int not null check (total_cents >= 50),
  currency          text not null default 'usd',
  payment_intent_id text unique,
  status            text not null default 'open' check (status in ('open', 'finalized', 'rejected')),
  reject_reason     text,
  purchase_id       uuid references public.carbon_purchases(id) on delete set null,
  created_at        timestamptz not null default now(),
  finalized_at      timestamptz
);

create index if not exists carbon_checkouts_user_idx on public.carbon_checkouts (user_id, created_at desc);

-- RLS on, no policies: only the service role (the checkout route and the
-- webhook) can see or write these.
alter table public.carbon_checkouts enable row level security;

-- Ties a retirement to the payment that bought it. Null for the old unpaid rows.
alter table public.carbon_purchases add column if not exists payment_intent_id text;
create unique index if not exists carbon_purchases_payment_intent_idx
  on public.carbon_purchases (payment_intent_id) where payment_intent_id is not null;


-- ════════════════════════════════════════════════════════════
-- 3. finalize_carbon_checkout
-- ════════════════════════════════════════════════════════════
--
-- Called by the Stripe webhook on payment_intent.succeeded. Returns one of:
--
--   'created'   the retirement was written and inventory decremented
--   'exists'    already finalized — Stripe retried, or delivered twice
--   'missing'   no quote with that id
--   'mismatch'  the quote belongs to another PaymentIntent, or the amount
--               Stripe captured is not what the quote said
--   'oversold'  paid, but the credit no longer has the tonnes — refund it
--
-- 'mismatch' and 'oversold' are recorded on the quote rather than raised, so
-- the webhook can acknowledge the event (Stripe would otherwise retry it
-- forever) while the row keeps the evidence.

create or replace function public.finalize_carbon_checkout(
  p_checkout_id    text,
  p_payment_intent text,
  p_amount_cents   bigint,
  p_currency       text
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  q       public.carbon_checkouts;
  vol     numeric;
  new_ser text;
  new_id  uuid;
begin
  select * into q from public.carbon_checkouts where id = p_checkout_id for update;
  if not found then
    return 'missing';
  end if;

  if q.status = 'finalized' then
    return 'exists';
  end if;
  if q.status = 'rejected' then
    -- Already judged; a redelivery must not flip it.
    return coalesce(nullif(split_part(q.reject_reason, ':', 1), ''), 'mismatch');
  end if;

  if q.payment_intent_id is distinct from p_payment_intent then
    update public.carbon_checkouts
       set status = 'rejected', reject_reason = 'mismatch: payment intent does not match this checkout'
     where id = q.id;
    return 'mismatch';
  end if;

  if p_amount_cents is distinct from q.total_cents::bigint
     or lower(coalesce(p_currency, '')) <> q.currency then
    update public.carbon_checkouts
       set status = 'rejected',
           reject_reason = format('mismatch: charged %s %s, quoted %s %s',
                                  p_amount_cents, p_currency, q.total_cents, q.currency)
     where id = q.id;
    return 'mismatch';
  end if;

  -- The lock is the point: two paid checkouts racing for the last tonnes of a
  -- credit would otherwise both read the same volume_t and both succeed.
  select cc.volume_t into vol
    from public.carbon_credits cc
   where cc.id = q.credit_id
     for update;

  if not found or coalesce(vol, 0) < q.tonnes then
    update public.carbon_checkouts
       set status = 'rejected',
           reject_reason = format('oversold: %s t paid for, %s t left', q.tonnes, coalesce(vol, 0))
     where id = q.id;
    return 'oversold';
  end if;

  update public.carbon_credits
     set volume_t = volume_t - q.tonnes
   where id = q.credit_id;

  new_ser := 'HONUA-' || to_char(now(), 'YYYY')
             || '-' || lpad(nextval('public.carbon_retirement_seq')::text, 6, '0');

  insert into public.carbon_purchases
    (user_id, credit_id, credit_name, tonnes, unit_cents, total_cents,
     retired_at, serial, payment_state, payment_intent_id)
  values
    (q.user_id, q.credit_id, q.credit_name, q.tonnes, q.unit_cents, q.total_cents,
     now(), new_ser, 'paid', p_payment_intent)
  returning id into new_id;

  update public.carbon_checkouts
     set status = 'finalized', finalized_at = now(), purchase_id = new_id
   where id = q.id;

  return 'created';
end $$;

comment on function public.finalize_carbon_checkout(text, text, bigint, text) is
  'Turns a server-priced carbon quote into a paid retirement once Stripe confirms the exact amount. Service role only; idempotent.';

revoke all on function public.finalize_carbon_checkout(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.finalize_carbon_checkout(text, text, bigint, text) to service_role;


-- ── Done ────────────────────────────────────────────────────
do $$
begin
  raise notice '049 applied: carbon retirements now require a Stripe payment confirmed by the webhook.';
end $$;
