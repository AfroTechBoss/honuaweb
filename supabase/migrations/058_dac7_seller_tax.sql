-- ============================================================
-- Migration 058: seller tax details and the DAC7 report
--
-- Requires 057 (former_seller_id, retained_identities).
--
-- A platform that lets people sell goods for money is a "reporting platform
-- operator" under the EU's DAC7 (Directive 2021/514). Registered in Estonia or
-- Italy, Honua has to:
--
--   1. collect, from every seller, who they are and where they are tax resident
--      (name, address, TIN and the country that issued it, date of birth for a
--      person; registration number and VAT number for a business; the account
--      they are paid into);
--   2. report the EU-resident ones to its tax authority by 31 January, with
--      what they earned each quarter, net of the platform's fees, and how many
--      sales that was;
--   3. withhold payment from a seller who will not provide the details.
--
-- The UK, Canada, Australia and New Zealand run the same OECD model rules, so
-- the same data covers them. US sellers give a TIN (SSN or EIN) for 1099-K.
--
-- Before this migration nothing collected a TIN, so none of that was possible.
--
--   seller_tax_profiles   one row per seller, written by the seller (RLS), with
--                         a review status only the server can set.
--   payout gate           a withdrawal request is refused until a profile
--                         exists and is not rejected (point 3).
--   delivered_at          the day an item's money became the seller's — which
--                         quarter it is reported in.
--   dac7_report(year)     per-seller, per-quarter totals for the export, deleted
--                         sellers included through 057's retention vault.
--
-- Safe to re-run.
-- ============================================================


-- ── 1. Seller tax profiles ──────────────────────────────────

create table if not exists public.seller_tax_profiles (
  seller_id        uuid primary key references public.profiles(id) on delete cascade,

  entity_type      text not null check (entity_type in ('individual', 'entity')),

  -- Individuals: first and last name, as DAC7 asks for them separately.
  first_name       text,
  last_name        text,
  date_of_birth    date,
  -- Only needed when the country of residence does not issue TINs.
  birth_city       text,
  birth_country    text,

  -- Entities: the registered name and company number.
  legal_name       text,
  business_reg_number text,
  -- ISO country codes of EU member states where the business has a permanent
  -- establishment through which it sells on Honua.
  permanent_establishments text[] not null default '{}',

  -- Primary address. `country` is the country of tax residence.
  address_line1    text not null,
  address_line2    text,
  city             text not null,
  region           text,
  postal_code      text,
  country          text not null check (country ~ '^[A-Z]{2}$'),

  tin              text,
  tin_country      text check (tin_country is null or tin_country ~ '^[A-Z]{2}$'),
  -- True when the country of residence does not issue a TIN. Allowed by DAC7,
  -- in which case place of birth is required instead.
  no_tin           boolean not null default false,
  vat_number       text,

  -- submitted — the seller saved it; payouts are allowed.
  -- verified  — an admin checked it against the seller's documents or VIES.
  -- rejected  — wrong or incomplete; payouts are blocked until it is fixed.
  status           text not null default 'submitted' check (status in ('submitted', 'verified', 'rejected')),
  review_note      text,
  reviewed_at      timestamptz,
  reviewed_by      text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint seller_tax_individual check (
    entity_type <> 'individual'
    or (nullif(trim(first_name), '') is not null and nullif(trim(last_name), '') is not null and date_of_birth is not null)
  ),
  constraint seller_tax_entity check (
    entity_type <> 'entity' or nullif(trim(legal_name), '') is not null
  ),
  constraint seller_tax_tin check (
    (nullif(trim(tin), '') is not null and tin_country is not null)
    or (no_tin and (entity_type = 'entity' or (nullif(trim(birth_city), '') is not null and birth_country is not null)))
  )
);

alter table public.seller_tax_profiles enable row level security;

-- A seller reads and writes their own row and nobody else's. No delete: the
-- row goes with the account, after 057 has copied it into the vault.
drop policy if exists "sellers read own tax profile" on public.seller_tax_profiles;
create policy "sellers read own tax profile" on public.seller_tax_profiles
  for select using (seller_id = auth.uid());

drop policy if exists "sellers create own tax profile" on public.seller_tax_profiles;
create policy "sellers create own tax profile" on public.seller_tax_profiles
  for insert with check (seller_id = auth.uid());

drop policy if exists "sellers update own tax profile" on public.seller_tax_profiles;
create policy "sellers update own tax profile" on public.seller_tax_profiles
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());

revoke all on public.seller_tax_profiles from anon;
grant select, insert, update on public.seller_tax_profiles to authenticated;

-- The review columns belong to the console. A signed-in user (auth.uid() set)
-- can't mark themselves verified, and any edit they make goes back to
-- 'submitted' so a verified profile can't be quietly changed afterwards. The
-- service role has no uid and passes through untouched.
create or replace function public.seller_tax_profile_guard()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.country := upper(new.country);
  new.tin_country := upper(nullif(trim(new.tin_country), ''));
  new.birth_country := upper(nullif(trim(new.birth_country), ''));

  if auth.uid() is not null then
    new.status := 'submitted';
    new.reviewed_at := null;
    new.reviewed_by := null;
    if tg_op = 'INSERT' then
      new.review_note := null;
      new.created_at := now();
    else
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists seller_tax_profile_guard on public.seller_tax_profiles;
create trigger seller_tax_profile_guard before insert or update on public.seller_tax_profiles
  for each row execute function public.seller_tax_profile_guard();


-- ── 2. No tax details, no withdrawal ────────────────────────
--
-- Payout requests are inserted from the browser (lib/market.ts requestPayout),
-- so the gate lives in the database. lib/market.ts recognises the message
-- prefix and turns it into a sentence that sends the seller to the form.
-- Rows the service role writes (auth.uid() null) are not gated.

create or replace function public.payout_requires_tax_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select status into v_status from public.seller_tax_profiles where seller_id = new.seller_id;

  if v_status is null then
    raise exception 'tax_profile_required: add your tax details before withdrawing';
  elsif v_status = 'rejected' then
    raise exception 'tax_profile_rejected: your tax details need correcting before you can withdraw';
  end if;
  return new;
end $$;

drop trigger if exists payout_requires_tax_profile on public.payout_requests;
create trigger payout_requires_tax_profile before insert on public.payout_requests
  for each row execute function public.payout_requires_tax_profile();


-- ── 3. When a sale became the seller's money ────────────────
--
-- A seller's balance clears on delivery (lib/market.ts getSellerBalance), so
-- that is when the consideration is "credited" in DAC7's words, and the
-- quarter it is reported in. Items delivered before this migration take their
-- order date — the closest thing on record.

alter table public.order_items add column if not exists delivered_at timestamptz;

update public.order_items
   set delivered_at = created_at
 where status = 'delivered' and delivered_at is null;

create or replace function public.stamp_delivered_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'delivered' then
    if new.delivered_at is null then new.delivered_at := now(); end if;
  else
    new.delivered_at := null;
  end if;
  return new;
end $$;

drop trigger if exists stamp_delivered_at on public.order_items;
create trigger stamp_delivered_at before insert or update of status on public.order_items
  for each row execute function public.stamp_delivered_at();

create index if not exists order_items_delivered_at_idx
  on public.order_items (delivered_at) where status = 'delivered';


-- ── 4. The report ───────────────────────────────────────────
--
-- One row per seller with a delivered sale in p_year, live or deleted. Each
-- q_* array has four entries, Q1..Q4.
--
--   gross   price × quantity of delivered items
--   refund  refunds on the order, shared across its items by value — refunds
--           are recorded per order (039), not per item
--   fee     the platform's sale fee on the gross (lib/market.ts SALE_FEE),
--           exactly what getSellerBalance deducts
--   net     gross − refund − fee: the consideration DAC7 asks for
--
-- Which sellers are reportable (EU residence, the 30-sale / €2,000 exclusion)
-- is decided by the route, which knows the country lists and the exchange
-- rate. This function only adds up.

create or replace function public.dac7_report(p_year int, p_fee_rate numeric default 0.05)
returns table (
  seller_id       uuid,
  deleted         boolean,
  account         jsonb,
  tax             jsonb,
  payout_accounts jsonb,
  q_sales         int[],
  q_gross_cents   bigint[],
  q_refund_cents  bigint[],
  q_fee_cents     bigint[],
  q_net_cents     bigint[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with bounds as (
    select make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC') as lo,
           make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC') as hi
  ),
  items as (
    select coalesce(oi.seller_id, oi.former_seller_id) as sid,
           oi.seller_id is null as gone,
           oi.order_id,
           (oi.price_cents::bigint * oi.quantity) as line,
           extract(quarter from coalesce(oi.delivered_at, oi.created_at) at time zone 'UTC')::int as q
      from public.order_items oi, bounds b
     where oi.status = 'delivered'
       and coalesce(oi.delivered_at, oi.created_at) >= b.lo
       and coalesce(oi.delivered_at, oi.created_at) <  b.hi
       and coalesce(oi.seller_id, oi.former_seller_id) is not null
  ),
  order_tot as (
    select order_id, sum(price_cents::bigint * quantity)::numeric as tot
      from public.order_items
     where status <> 'cancelled' and order_id in (select order_id from items)
     group by order_id
  ),
  refunds as (
    select order_id, sum(amount_cents)::numeric as amt
      from public.order_refunds
     where status = 'succeeded' and order_id in (select order_id from items)
     group by order_id
  ),
  lines as (
    select i.sid, i.gone, i.q, i.line,
           least(i.line, round(coalesce(r.amt, 0) * i.line / nullif(t.tot, 0)))::bigint as refund,
           round(i.line * p_fee_rate)::bigint as fee
      from items i
      left join order_tot t on t.order_id = i.order_id
      left join refunds r   on r.order_id = i.order_id
  ),
  agg as (
    select sid,
           bool_or(gone) as gone,
           array[
             count(*) filter (where q = 1), count(*) filter (where q = 2),
             count(*) filter (where q = 3), count(*) filter (where q = 4)
           ]::int[] as q_sales,
           array[
             coalesce(sum(line) filter (where q = 1), 0), coalesce(sum(line) filter (where q = 2), 0),
             coalesce(sum(line) filter (where q = 3), 0), coalesce(sum(line) filter (where q = 4), 0)
           ]::bigint[] as q_gross,
           array[
             coalesce(sum(refund) filter (where q = 1), 0), coalesce(sum(refund) filter (where q = 2), 0),
             coalesce(sum(refund) filter (where q = 3), 0), coalesce(sum(refund) filter (where q = 4), 0)
           ]::bigint[] as q_refund,
           array[
             coalesce(sum(fee) filter (where q = 1), 0), coalesce(sum(fee) filter (where q = 2), 0),
             coalesce(sum(fee) filter (where q = 3), 0), coalesce(sum(fee) filter (where q = 4), 0)
           ]::bigint[] as q_fee
      from lines
     group by sid
  )
  select
    a.sid,
    a.gone,
    case when a.gone then
      jsonb_build_object(
        'handle',    ri.identity->'account'->>'handle',
        'full_name', ri.identity->'account'->>'full_name',
        'email',     ri.identity->'account'->>'email',
        'shop_name', ri.identity->'seller'->-1->>'shop_name',
        'legal_name', ri.identity->'seller'->-1->>'legal_name',
        'country',   ri.identity->'seller'->-1->>'country'
      )
    else
      (select jsonb_build_object(
         'handle', p.handle, 'full_name', p.full_name, 'email', u.email,
         'shop_name', sa.shop_name, 'legal_name', sa.legal_name, 'country', sa.country
       )
         from public.profiles p
         left join auth.users u on u.id = p.id
         left join lateral (
           select shop_name, legal_name, country from public.seller_applications
            where user_id = p.id order by created_at desc limit 1
         ) sa on true
        where p.id = a.sid)
    end,
    case when a.gone then ri.identity->'tax'
         else (select to_jsonb(t) - 'seller_id' from public.seller_tax_profiles t where t.seller_id = a.sid)
    end,
    case when a.gone then coalesce(ri.identity->'payout_methods', '[]'::jsonb)
    else
      (select coalesce(jsonb_agg(jsonb_build_object(
         'kind', kind, 'label', label, 'is_primary', is_primary,
         'paypal_email', paypal_email, 'stripe_account_id', stripe_account_id, 'uglycash_handle', uglycash_handle,
         'bank_country', bank_country, 'bank_name', bank_name,
         'bank_account_name', bank_account_name, 'bank_account_number', bank_account_number,
         'bank_extra', bank_extra
       ) order by is_primary desc, created_at), '[]'::jsonb)
         from public.payout_methods pm where pm.seller_id = a.sid)
    end,
    a.q_sales,
    a.q_gross,
    a.q_refund,
    a.q_fee,
    array[
      a.q_gross[1] - a.q_refund[1] - a.q_fee[1], a.q_gross[2] - a.q_refund[2] - a.q_fee[2],
      a.q_gross[3] - a.q_refund[3] - a.q_fee[3], a.q_gross[4] - a.q_refund[4] - a.q_fee[4]
    ]::bigint[]
  from agg a
  left join public.retained_identities ri on ri.subject_id = a.sid
  order by a.sid
$$;

revoke all on function public.dac7_report(int, numeric) from public, anon, authenticated;
grant execute on function public.dac7_report(int, numeric) to service_role;
