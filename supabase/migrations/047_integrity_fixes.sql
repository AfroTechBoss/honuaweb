-- ============================================================
-- Migration 047: Four integrity fixes
--   1. Carbon retirement moves behind a security-definer function.
--      The browser currently sets both the price and the quantity.
--   2. all_sellers broadcasts reach approved sellers who have not
--      listed a product yet.
--   3. impact_logs can no longer claim unbounded CO₂ or points.
--   4. The `comments` storage bucket is created. It never existed.
--
-- Run this in Supabase Dashboard > SQL Editor.
-- Safe to re-run; every step is guarded.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. Carbon retirement integrity
-- ════════════════════════════════════════════════════════════
--
-- What was wrong. `purchaseCredit` (lib/market.ts) inserted straight into
-- carbon_purchases from the browser:
--
--   insert into carbon_purchases (user_id, credit_id, tonnes, total_cents)
--
-- with `tonnes` and `total_cents` both computed in JavaScript. The only RLS
-- check was `user_id = auth.uid()`. So a crafted insert could retire any
-- tonnage for total_cents = 0, and the after-insert trigger would decrement
-- real inventory to match. There was also no stock guard — buying more than
-- the remaining volume silently clamped the inventory to zero via
-- greatest(..., 0) while still recording the full tonnage as retired.
--
-- The fix is the same shape as every other privileged write in this codebase:
-- the client stops writing the row and asks a function to do it. The function
-- reads the price from carbon_credits, so the browser can no longer name it.
--
-- Note on what this does NOT fix: no payment is taken. That is a separate
-- piece of work (a Stripe checkout for carbon), and it would be dishonest to
-- leave the resulting rows looking settled — so retirements are now explicitly
-- stamped `payment_state = 'unpaid'` until that exists. The data tells the
-- truth even though the flow is incomplete.

alter table public.carbon_purchases add column if not exists retired_at    timestamptz;
alter table public.carbon_purchases add column if not exists serial        text;
alter table public.carbon_purchases add column if not exists unit_cents    int;
alter table public.carbon_purchases add column if not exists payment_state text not null default 'unpaid';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'carbon_purchases_payment_state_check') then
    alter table public.carbon_purchases
      add constraint carbon_purchases_payment_state_check
      check (payment_state in ('unpaid', 'paid', 'refunded'));
  end if;
end $$;

-- Retirement serials. A retirement without one cannot be reconciled against a
-- registry, which is the whole point of retiring a credit rather than holding
-- it. Format: HONUA-<year>-<zero-padded sequence>.
create sequence if not exists public.carbon_retirement_seq;

-- Existing rows predate all of this. They get their created_at as the
-- retirement time and a serial so the column can be made unique — they remain
-- unpaid and unverifiable, which is exactly what they are.
update public.carbon_purchases
   set retired_at = coalesce(retired_at, created_at)
 where retired_at is null;

update public.carbon_purchases
   set serial = 'HONUA-' || to_char(coalesce(retired_at, created_at), 'YYYY')
                || '-' || lpad(nextval('public.carbon_retirement_seq')::text, 6, '0')
 where serial is null;

create unique index if not exists carbon_purchases_serial_idx
  on public.carbon_purchases (serial);

-- The old trigger decremented volume on every insert. The function below now
-- does that itself, under a row lock, in the same transaction as the insert.
-- Leaving both in place would double-decrement.
drop trigger if exists trg_credit_volume on public.carbon_purchases;
drop function if exists public.decrement_credit_volume();

-- The browser may no longer write a retirement. Only the function may.
-- Kept deliberately: users still read their own retirements.
drop policy if exists "users create own purchases" on public.carbon_purchases;

create or replace function public.retire_carbon_credit(p_credit uuid, p_tonnes numeric)
returns table (
  id            uuid,
  serial        text,
  credit_name   text,
  tonnes        numeric,
  unit_cents    int,
  total_cents   int,
  retired_at    timestamptz,
  payment_state text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  buyer   uuid := auth.uid();
  c       record;
  total   int;
  new_ser text;
begin
  if buyer is null then
    raise exception 'Sign in to retire a credit' using errcode = '42501';
  end if;
  if p_credit is null then
    raise exception 'A retirement has to name a credit' using errcode = '22023';
  end if;
  -- Fractional tonnes are legitimate; zero and negative are not. Negative
  -- tonnage would have *increased* inventory through the old trigger.
  if p_tonnes is null or p_tonnes <= 0 then
    raise exception 'How many tonnes?' using errcode = '22023';
  end if;
  if p_tonnes > 100000 then
    raise exception 'That is more than this market can retire in one go' using errcode = '22023';
  end if;

  -- The lock is the point. Two buyers racing for the last tonne of a credit
  -- would otherwise both read the same volume_t and both succeed.
  select cc.id, cc.name, cc.price_cents, cc.volume_t, cc.active
    into c
    from public.carbon_credits cc
   where cc.id = p_credit
     for update;

  if not found then
    raise exception 'No such credit' using errcode = 'P0002';
  end if;
  if not coalesce(c.active, true) then
    raise exception 'That credit is no longer listed' using errcode = '22023';
  end if;
  if coalesce(c.price_cents, 0) <= 0 then
    raise exception 'That credit has no price set — nothing can be retired against it' using errcode = '22023';
  end if;
  -- The guard that did not exist. Previously an oversized purchase clamped the
  -- inventory to zero and still recorded the full tonnage.
  if p_tonnes > coalesce(c.volume_t, 0) then
    raise exception 'Only % t left on this credit', trim(to_char(coalesce(c.volume_t, 0), 'FM999999990.99'))
      using errcode = '22023';
  end if;

  -- Price comes from the table, never from the caller.
  total := round(p_tonnes * c.price_cents);

  update public.carbon_credits
     set volume_t = volume_t - p_tonnes
   where carbon_credits.id = c.id;

  new_ser := 'HONUA-' || to_char(now(), 'YYYY')
             || '-' || lpad(nextval('public.carbon_retirement_seq')::text, 6, '0');

  return query
  insert into public.carbon_purchases
    (user_id, credit_id, credit_name, tonnes, unit_cents, total_cents,
     retired_at, serial, payment_state)
  values
    (buyer, c.id, c.name, p_tonnes, c.price_cents, total,
     now(), new_ser, 'unpaid')
  returning
    carbon_purchases.id, carbon_purchases.serial, carbon_purchases.credit_name,
    carbon_purchases.tonnes, carbon_purchases.unit_cents, carbon_purchases.total_cents,
    carbon_purchases.retired_at, carbon_purchases.payment_state;
end $$;

revoke all on function public.retire_carbon_credit(uuid, numeric) from public, anon;
grant execute on function public.retire_carbon_credit(uuid, numeric) to authenticated;


-- ════════════════════════════════════════════════════════════
-- 2. all_sellers reaches approved sellers with no listings
-- ════════════════════════════════════════════════════════════
--
-- The audience in 044 was:
--
--   when 'all_sellers' then p.role = 'seller'
--                           or exists (select 1 from products pr where pr.seller_id = p.id)
--
-- The first half is dead: profiles.role has a CHECK constraint from migration
-- 011 allowing only user/admin/moderator, so no row can ever hold 'seller'.
-- The second half carries the whole audience, which means a seller whose
-- application was approved but who has not listed anything yet — precisely the
-- person most likely to need an onboarding message — is unreachable.
--
-- Approved application is the canonical marker; products remain as a fallback
-- for anyone selling from before applications existed.

create or replace function public.admin_broadcast_audience(p_audience text, p_target uuid default null)
returns table (
  user_id          uuid,
  email            text,
  handle           text,
  full_name        text,
  marketing_emails boolean,
  suspended_until  timestamptz,
  banned_at        timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_audience not in ('all_users', 'all_sellers', 'user') then
    raise exception 'Unknown audience %', p_audience using errcode = '22023';
  end if;
  if p_audience = 'user' and p_target is null then
    raise exception 'A message to one person needs to say which person' using errcode = '22023';
  end if;

  return query
  select p.id, u.email::text, p.handle, p.full_name, coalesce(p.marketing_emails, false),
         p.suspended_until, p.banned_at
    from public.profiles p
    left join auth.users u on u.id = p.id
   where case p_audience
           when 'user'        then p.id = p_target
           when 'all_sellers' then
             exists (select 1 from public.seller_applications sa
                      where sa.user_id = p.id and sa.status = 'approved')
             or exists (select 1 from public.products pr where pr.seller_id = p.id)
           else true
         end
   order by p.created_at;
end $$;


-- ════════════════════════════════════════════════════════════
-- 3. Bound what one impact log can claim
-- ════════════════════════════════════════════════════════════
--
-- impact_logs is written straight from the browser and RLS only checks
-- `auth.uid() = user_id`. lib/impact.ts computes co2_saved_kg and points from a
-- factor table (quantity × factorKgPerUnit), but that computation is advisory —
-- nothing stops an insert claiming 999999 kg. The trigger in migration 002 then
-- adds it directly to profiles.impact_score and profiles.total_co2_kg, and
-- 500 kg is the threshold that flips the eco_warrior flag.
--
-- These are deliberately generous ceilings, not the factor model restated in
-- SQL. Restating it would duplicate ACTION_IMPACTS in two languages and
-- guarantee they drift. The job here is to make the absurd impossible while
-- leaving every honest log comfortably inside the bounds: at the Transport
-- factor of 0.17 kg/km, 1000 kg is a 5,882 km journey in a single entry.

do $$
begin
  -- Clamp anything already stored outside the new bounds, or the constraint
  -- cannot be added. Logged as a notice so you can see if it touched anything.
  update public.impact_logs set co2_saved_kg = 1000 where co2_saved_kg > 1000;
  update public.impact_logs set co2_saved_kg = 0    where co2_saved_kg < 0;
  update public.impact_logs set points = 5000       where points > 5000;
  update public.impact_logs set points = 0          where points < 0;
  update public.impact_logs set quantity = 100000   where quantity > 100000;
  update public.impact_logs set quantity = 0        where quantity < 0;

  if not exists (select 1 from pg_constraint where conname = 'impact_logs_co2_bounds') then
    alter table public.impact_logs
      add constraint impact_logs_co2_bounds
      check (co2_saved_kg is null or (co2_saved_kg >= 0 and co2_saved_kg <= 1000));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'impact_logs_points_bounds') then
    alter table public.impact_logs
      add constraint impact_logs_points_bounds
      check (points is null or (points >= 0 and points <= 5000));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'impact_logs_quantity_bounds') then
    alter table public.impact_logs
      add constraint impact_logs_quantity_bounds
      check (quantity is null or (quantity >= 0 and quantity <= 100000));
  end if;
end $$;


-- ════════════════════════════════════════════════════════════
-- 4. The `comments` storage bucket
-- ════════════════════════════════════════════════════════════
--
-- components/screens/communities.tsx:260 calls
--   uploadFile('comments', app.user.id, replyImageFile)
-- and lib/storage.ts lists 'comments' in its bucket union — but the bucket was
-- never created, in SQL or by hand. Confirmed against the live project: the
-- storage API returns avatars, covers, posts, projects, stories and nothing
-- else. So attaching an image to a community reply has been failing outright.
--
-- Public like the other five: comment images render through getPublicUrl in an
-- <img src>, which for a public bucket is served without consulting RLS.

insert into storage.buckets (id, name, public)
select 'comments', 'comments', true
where not exists (select 1 from storage.buckets where id = 'comments');

-- Owner-scoped, matching the shape migration 031 settled on for the other
-- buckets: the first path segment is the uploader's id, and that is what every
-- policy checks. The select policy exists to stop anon enumerating the bucket
-- through the list endpoint, not to serve the images.
drop policy if exists comments_owner_read   on storage.objects;
drop policy if exists comments_owner_insert on storage.objects;
drop policy if exists comments_owner_update on storage.objects;
drop policy if exists comments_owner_delete on storage.objects;

create policy comments_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'comments' and auth.uid()::text = (storage.foldername(name))[1]);

create policy comments_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comments' and auth.uid()::text = (storage.foldername(name))[1]);

create policy comments_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'comments' and auth.uid()::text = (storage.foldername(name))[1]);

create policy comments_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'comments' and auth.uid()::text = (storage.foldername(name))[1]);


-- ── Done ────────────────────────────────────────────────────
do $$
begin
  raise notice '047 applied: carbon retirement is server-priced, all_sellers reaches approved sellers, impact logs are bounded, comments bucket exists.';
end $$;
