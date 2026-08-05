-- ============================================================
-- Migration 039: Orders, from the admin's side — refunds and oversight
--
-- The console could not see orders at all. 014 wrote a policy for it:
--
--   create policy "admins see all orders" on orders for select using (
--     exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator'))
--   );
--
-- and that policy has never once fired. The admin console authenticates with
-- Privy, not Supabase, so an admin's browser holds no Supabase session and
-- auth.uid() is null inside RLS — the same dormant-policy shape carbon_credits
-- carries. It is left in place here (dropping it changes the rules for a
-- Supabase-session admin, which is a separate decision) but nothing depends on
-- it: /api/admin/orders reads with the service-role key behind a verified Privy
-- token, exactly like the support and verification queues.
--
-- What this migration adds is the part that genuinely wasn't there: a record of
-- money going back.
--
-- Depends on 014 (orders), 020 (order_items) and 023 (payment_status,
-- payment_intent_id).
-- ============================================================


-- ── Refunds ─────────────────────────────────────────────────
--
-- A separate table rather than a `refunded_cents` column on orders. Two
-- reasons, and the first is the one that matters:
--
--   * A refund is an event, not a state. Who issued it, when, why, for how
--     much, and which Stripe refund it corresponds to are all things somebody
--     will need to answer months later — most likely during a chargeback, which
--     is exactly when "the column said 4000" is not an answer. Partial refunds
--     make this concrete: three of them against one order are three facts.
--
--   * A total kept in two places drifts. The order's refunded amount is summed
--     from these rows on read, so it cannot disagree with its own history.
create table if not exists public.order_refunds (
  id                uuid primary key default gen_random_uuid(),
  order_id          text not null references public.orders(id) on delete cascade,

  -- Positive only. A "refund" of zero or less is a data-entry accident, and the
  -- route's ceiling check (never more than what's left unrefunded) can't catch
  -- it because a negative amount passes that test happily.
  amount_cents      int  not null check (amount_cents > 0),

  -- 'stripe' — the money actually moved through the processor, and
  --            stripe_refund_id points at the proof.
  -- 'manual' — refunded some other way (bank transfer, store credit, a
  --            correction to an order that was never charged). Recorded here
  --            anyway, or the order's arithmetic quietly stops being true.
  method            text not null default 'stripe'
                      check (method in ('stripe', 'manual')),

  reason            text,

  -- Null for manual refunds. Unique when present — see the index below.
  stripe_refund_id  text,
  payment_intent_id text,

  status            text not null default 'succeeded'
                      check (status in ('pending', 'succeeded', 'failed')),

  -- The Privy user id of the admin who issued it, not a profile id — the
  -- console has no auth.uid(). Same convention as support_tickets.handled_by
  -- and verification_requests.reviewed_by.
  issued_by         text,

  created_at        timestamptz not null default now()
);

-- Idempotency, and the reason it's a unique index rather than a column
-- constraint: manual refunds have no Stripe id, and a plain UNIQUE would let
-- exactly one of them exist across the whole table. Partial index, so the nulls
-- are ignored and a double-submitted Stripe refund still can't be recorded twice.
create unique index if not exists order_refunds_stripe_id_idx
  on public.order_refunds (stripe_refund_id) where stripe_refund_id is not null;

create index if not exists order_refunds_order_idx
  on public.order_refunds (order_id, created_at desc);

alter table public.order_refunds enable row level security;

-- No policies, on purpose — the same sealed posture as support_tickets (037)
-- and error_log (034). Only the service-role key reaches this table.
--
-- "Let buyers read their own refunds" is the tempting one to add now, and it is
-- the wrong time to add it: nothing renders a refund to a buyer yet, and a
-- policy written against a screen that doesn't exist is how 014 ended up with
-- an admin policy that has never worked. When there's a query to serve, write
-- the policy in front of it.


-- ── Internal note on an order ───────────────────────────────
--
-- Where "buyer called, agreed to a partial" lives. Admin-only by virtue of the
-- table's policies: buyers can select their own orders, so this is visible to
-- them if they go looking with the anon key. Kept deliberately blunt about that
-- rather than pretending otherwise — it is a working note, not a private one,
-- and the honest fix (a sealed side table) is not worth the join until someone
-- actually wants to write something a buyer must not read.
alter table public.orders add column if not exists admin_note text;


-- ── Counts, in one round trip ───────────────────────────────
--
-- Same shape as admin_support_counts(): the figures above the table and the
-- number on the rail badge come from one call, so they cannot disagree by a
-- request. gross_cents and refunded_cents are here because the two numbers are
-- only meaningful next to each other.
create or replace function public.admin_order_counts()
returns table (
  total           bigint,
  processing      bigint,
  confirmed       bigint,
  shipped         bigint,
  delivered       bigint,
  cancelled       bigint,
  unpaid          bigint,
  paid            bigint,
  payment_failed  bigint,
  refunded        bigint,
  last_24h        bigint,
  gross_cents     bigint,
  refunded_cents  bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    count(*)::bigint,
    count(*) filter (where o.status = 'processing')::bigint,
    count(*) filter (where o.status = 'confirmed')::bigint,
    count(*) filter (where o.status = 'shipped')::bigint,
    count(*) filter (where o.status = 'delivered')::bigint,
    count(*) filter (where o.status = 'cancelled')::bigint,
    count(*) filter (where o.payment_status = 'unpaid')::bigint,
    count(*) filter (where o.payment_status in ('paid', 'refunded'))::bigint,
    count(*) filter (where o.payment_status = 'failed')::bigint,
    -- Orders with any refund against them, not refund rows: three partials on
    -- one order is one order somebody had a problem with.
    count(*) filter (where exists (
      select 1 from public.order_refunds r
      where r.order_id = o.id and r.status = 'succeeded'
    ))::bigint,
    count(*) filter (where o.created_at >= now() - interval '24 hours')::bigint,
    -- Money actually collected. An unpaid order is a cart someone abandoned at
    -- the last step, and counting it as revenue would overstate every figure on
    -- the page.
    coalesce(sum(o.total_cents) filter (where o.payment_status in ('paid', 'refunded')), 0)::bigint,
    coalesce((
      select sum(r.amount_cents) from public.order_refunds r where r.status = 'succeeded'
    ), 0)::bigint
  from public.orders o;
$$;


-- ── Who is signed into the console ──────────────────────────
--
-- The console knows the admin's email (Privy gives it to the browser) and
-- nothing else. It wants their avatar, and profiles has no email column —
-- addresses live in auth.users, which PostgREST does not expose.
--
-- So: one narrow door, the mirror image of 032's admin_account_emails(). An
-- address in, that account's public profile fields out. Nothing from auth.users
-- is returned, so this cannot be used to confirm an address exists unless it
-- also has a Honua profile.
create or replace function public.admin_profile_by_email(addr text)
returns table (id uuid, handle text, full_name text, avatar_url text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.handle, p.full_name, p.avatar_url
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(addr))
  limit 1;
$$;


-- ── Only the server may call either ─────────────────────────
--
-- Postgres grants EXECUTE to PUBLIC on new functions and both are SECURITY
-- DEFINER, so without this the anon key could ask an RLS-sealed table what the
-- platform's gross revenue is, and turn any email address into a user id.
-- service_role is granted back explicitly because revoking from public revokes
-- it too — service_role bypasses RLS, not privileges.
revoke all on function public.admin_order_counts()            from public, anon, authenticated;
revoke all on function public.admin_profile_by_email(text)    from public, anon, authenticated;
grant execute on function public.admin_order_counts()         to service_role;
grant execute on function public.admin_profile_by_email(text) to service_role;


-- The console's default view is "everything, newest first"; the search filters
-- narrow it. 014 indexed neither.
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status, created_at desc);
create index if not exists orders_email_idx   on public.orders (lower(email));
