-- ============================================================
-- Migration 042: Where the money actually goes
--
-- Two problems, one file.
--
-- The seller side had no destination model at all. `payout_requests.destination`
-- is a free-text column and both call sites in the seller dashboard pass the
-- literal string 'Default payout method' — so every payout row on the platform
-- names a destination that does not exist and cannot be paid to. The admin
-- console then rendered that string next to an Approve button.
--
-- The admin side had a table whose two admin policies have never once fired.
-- 022 wrote them as `exists (select 1 from profiles where id = auth.uid() ...)`,
-- but the console authenticates with Privy, so auth.uid() is null for every
-- request it makes. The queue was mock data in the component, which is the only
-- reason nobody noticed the policies were dormant.
--
-- So:
--
--   payout_methods    a seller connects PayPal, Stripe, UglyCash or a bank
--                     account, and marks one primary. One primary per seller,
--                     enforced by a partial unique index rather than by hope.
--
--   payout_requests   gains the method it pays to, a snapshot of that method's
--                     label, the reviewer, an admin note, and — separately from
--                     the review decision — whether the money has actually been
--                     sent and under what reference.
--
--   admin_* RPCs      the queue, the review, the disbursement record, and an
--                     audited reveal of full bank details.
--
-- The two-step status is the important part of the design. `status` records the
-- *decision* (pending → approved / rejected / on_hold). `paid_at` records that
-- money *moved*. Nothing in this file claims the second when only the first has
-- happened, because for uglycash and bank transfers a human has to go and do it,
-- and for paypal and stripe there is no integration in this codebase yet. An
-- Approve button that quietly implied "sent" would be the single most expensive
-- lie the console could tell.
-- ============================================================


-- ── 1. Connected payout methods ─────────────────────────────────────────────
--
-- Columns per kind rather than a jsonb blob. Sparse, but every field is
-- greppable, constrainable, and visible to anyone reading the schema — which
-- matters more than width for a table holding bank details.
--
-- Nothing here is encrypted at rest beyond what Postgres and Supabase already
-- do for the volume. That is a deliberate, stated limit, not an oversight: the
-- protection model for this table is that no browser can read it (RLS below
-- scopes every row to its owner, and the admin path is service-role only) and
-- that every admin who looks at full details leaves an audit line.

create table if not exists public.payout_methods (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.profiles(id) on delete cascade,
  kind         text not null check (kind in ('paypal', 'stripe', 'uglycash', 'bank')),

  -- Rendered everywhere the full details must not be: the queue, the seller's
  -- own history, the audit log. Built by the route, never by the client.
  label        text not null default '',

  is_primary   boolean not null default false,

  -- paypal
  paypal_email text,

  -- stripe. Holds a Connect account id once onboarding exists; until then a
  -- seller can record the account they intend to be paid into, and the admin
  -- queue shows the payout as awaiting a manual send like any other.
  stripe_account_id text,

  -- uglycash — the $handle, stored with its leading $ stripped by the route.
  uglycash_handle text,

  -- bank
  bank_country        text,   -- ISO 3166-1 alpha-2
  bank_currency       text,   -- ISO 4217, derived from the country by the client
  bank_name           text,
  bank_account_name   text,
  bank_account_number text,
  -- Sort code, routing number, IBAN or SWIFT depending on the country. One
  -- column because which one it is is a function of bank_country, and four
  -- mutually exclusive columns would be four ways to store the same fact.
  bank_extra          text,

  -- 'unverified' is the honest default and stays that way: there is no
  -- micro-deposit or Connect handshake in this codebase to move it forward.
  -- 'disabled' is how a method is retired without deleting rows that historical
  -- payout_requests point at.
  status       text not null default 'unverified'
               check (status in ('unverified', 'verified', 'disabled')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Each kind must carry the fields its kind needs, so a half-filled method
  -- cannot reach the queue and strand a payout at the point of sending.
  constraint payout_methods_fields_present check (
    case kind
      when 'paypal'   then paypal_email is not null and paypal_email <> ''
      when 'stripe'   then stripe_account_id is not null and stripe_account_id <> ''
      when 'uglycash' then uglycash_handle is not null and uglycash_handle <> ''
      when 'bank'     then bank_country is not null and bank_country <> ''
                       and bank_account_name is not null and bank_account_name <> ''
                       and bank_account_number is not null and bank_account_number <> ''
      else false
    end
  )
);

create index if not exists payout_methods_seller_idx on public.payout_methods (seller_id, created_at desc);

-- One primary per seller, in the database. A route that reads-then-writes to
-- keep this true has a race in it; a partial unique index does not.
create unique index if not exists payout_methods_primary_idx
  on public.payout_methods (seller_id) where is_primary;

-- The same method connected twice is a duplicate, not a second destination.
create unique index if not exists payout_methods_paypal_idx
  on public.payout_methods (seller_id, lower(paypal_email)) where kind = 'paypal';
create unique index if not exists payout_methods_uglycash_idx
  on public.payout_methods (seller_id, lower(uglycash_handle)) where kind = 'uglycash';
create unique index if not exists payout_methods_bank_idx
  on public.payout_methods (seller_id, bank_account_number, bank_country) where kind = 'bank';

alter table public.payout_methods enable row level security;

do $$
begin
  drop policy if exists "sellers manage own payout methods" on public.payout_methods;
  drop policy if exists "sellers read own payout methods" on public.payout_methods;

  -- Read and write, scoped to the owner. Note this is the *only* permissive
  -- pair on the table: there is no admin policy, deliberately. An admin reads
  -- these rows through the service-role RPCs below, which leave a trail.
  create policy "sellers read own payout methods" on public.payout_methods
    for select to authenticated using (seller_id = auth.uid());

  create policy "sellers manage own payout methods" on public.payout_methods
    for all to authenticated
    using (seller_id = auth.uid())
    with check (seller_id = auth.uid());
end $$;

-- 041's freeze, extended to this table. It could not be in 041's list because
-- the table did not exist then. Changing where your money is sent while you are
-- suspended for fraud is precisely the move the freeze exists to stop, so this
-- is not a formality — it is the point.
do $$
begin
  if to_regprocedure('public.is_frozen(uuid)') is null then
    raise warning 'payout_methods: is_frozen() not found — apply 041_account_freeze.sql; a suspended seller can currently change their payout destination';
    return;
  end if;

  drop policy if exists "frozen accounts cannot insert" on public.payout_methods;
  drop policy if exists "frozen accounts cannot update" on public.payout_methods;
  drop policy if exists "frozen accounts cannot delete" on public.payout_methods;

  create policy "frozen accounts cannot insert" on public.payout_methods
    as restrictive for insert to authenticated
    with check (not public.is_frozen(auth.uid()));

  create policy "frozen accounts cannot update" on public.payout_methods
    as restrictive for update to authenticated
    using (not public.is_frozen(auth.uid()))
    with check (not public.is_frozen(auth.uid()));

  create policy "frozen accounts cannot delete" on public.payout_methods
    as restrictive for delete to authenticated
    using (not public.is_frozen(auth.uid()));
end $$;


-- ── 2. What a payout request now records ────────────────────────────────────

alter table public.payout_requests
  add column if not exists method_id uuid references public.payout_methods(id) on delete set null;

-- Snapshotted at request time. The FK above is `on delete set null` because a
-- seller may retire a method, and the payout that was already sent to it must
-- still say where it went. A label that disappears with the method is not a
-- record.
alter table public.payout_requests
  add column if not exists destination_label text;

-- 'automatic' means "this kind is meant to settle through an API" — paypal and
-- stripe. It does not mean anything settled: see the header, and see
-- admin_mark_payout_paid, which is the only thing that records money moving.
alter table public.payout_requests
  add column if not exists dispatch text not null default 'manual';

alter table public.payout_requests
  add column if not exists reviewed_by text;

alter table public.payout_requests
  add column if not exists admin_note text;

alter table public.payout_requests
  add column if not exists paid_at timestamptz;

alter table public.payout_requests
  add column if not exists paid_by text;

-- The bank's reference, the PayPal batch id, the UglyCash transaction — whatever
-- the person who sent it can be asked to produce if the seller says it never
-- arrived.
alter table public.payout_requests
  add column if not exists payment_reference text;

do $$
begin
  -- 'paid' is new, so whatever CHECK 022 left behind has to be replaced rather
  -- than added to. Dropping by name is safe: if 022 named it differently or
  -- omitted it, the drop is a no-op and the add still lands.
  alter table public.payout_requests drop constraint if exists payout_requests_status_check;
  alter table public.payout_requests add constraint payout_requests_status_check
    check (status in ('pending', 'approved', 'rejected', 'on_hold', 'paid'));

  alter table public.payout_requests drop constraint if exists payout_requests_dispatch_check;
  alter table public.payout_requests add constraint payout_requests_dispatch_check
    check (dispatch in ('manual', 'automatic'));
exception when others then
  raise warning 'payout_requests constraints not applied: % — existing rows may hold a status outside the new set', sqlerrm;
end $$;

create index if not exists payout_requests_status_idx
  on public.payout_requests (status, created_at desc);
create index if not exists payout_requests_open_idx
  on public.payout_requests (created_at desc) where status in ('pending', 'approved');

-- Backfill the label on rows that predate this migration. They all say
-- 'Default payout method'; rewriting that to something honest is better than
-- leaving a string that reads like a real destination.
update public.payout_requests
   set destination_label = 'No method connected'
 where destination_label is null;


-- ── 3. What a seller has actually earned ────────────────────────────────────
--
-- The guard behind approval. lib/market.ts computes a balance in the browser
-- for the seller's own dashboard, which is fine for showing someone their own
-- number and useless as a control — it is a client-side sum over rows the
-- client also controls the query for.
--
-- earned    delivered line items, less the 5% platform fee (lib/market.ts's
--           SALE_FEE). Cancelled items never count; undelivered ones have not
--           cleared.
-- committed payouts already approved or paid. Deliberately *not* including
--           pending ones: a pending request is not a commitment, and counting
--           it would make a request block its own approval.

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
     where oi.seller_id = p_seller
       and oi.status = 'delivered'
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
  'Delivered sales less the 5% platform fee, minus payouts already approved or paid. available_cents may be negative if a payout was approved above the balance before this guard existed.';

-- Service-role only. Granting this to `authenticated` would let any signed-in
-- user read any seller''s earnings by passing someone else''s id — the function
-- is security definer, so RLS would not stop them.
revoke all on function public.seller_payout_ledger(uuid) from public, anon, authenticated;
grant execute on function public.seller_payout_ledger(uuid) to service_role;


-- ── 4. The admin entry points ───────────────────────────────────────────────
--
-- Dropped before creation for the same reason 041 does it: `create or replace`
-- refuses to change a return type, and silently creates a second overload when
-- the argument list differs rather than replacing anything.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'admin_payout_queue',
         'admin_review_payout',
         'admin_mark_payout_paid',
         'admin_payout_destination'
       )
  loop
    execute format('drop function if exists %s', fn.sig);
    raise notice 'dropped previous %', fn.sig;
  end loop;
end $$;


-- The queue. Never returns a full account number — `destination` here is the
-- masked label. Revealing the real thing is admin_payout_destination, which
-- costs an audit line.
create function public.admin_payout_queue(p_status text default null, p_limit int default 200)
returns table (
  id                uuid,
  amount_cents      int,
  fee_cents         int,
  net_cents         int,
  status            text,
  dispatch          text,
  reject_reason     text,
  admin_note        text,
  created_at        timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       text,
  paid_at           timestamptz,
  paid_by           text,
  payment_reference text,
  destination       text,
  method_id         uuid,
  method_kind       text,
  seller_id         uuid,
  seller_name       text,
  seller_handle     text,
  seller_avatar     text,
  seller_since      timestamptz,
  seller_frozen     boolean,
  earned_cents      bigint,
  committed_cents   bigint,
  available_cents   bigint,
  delivered_items   bigint,
  refunded_orders   bigint,
  prior_payouts     bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  select
    pr.id,
    pr.amount_cents,
    pr.fee_cents,
    pr.net_cents,
    pr.status,
    pr.dispatch,
    pr.reject_reason,
    pr.admin_note,
    pr.created_at,
    pr.reviewed_at,
    pr.reviewed_by,
    pr.paid_at,
    pr.paid_by,
    pr.payment_reference,
    -- Prefer the live method's label so a seller who fixes a typo sees the fix;
    -- fall back to the snapshot for rows whose method is gone.
    coalesce(pm.label, pr.destination_label, pr.destination, 'No method connected'),
    pr.method_id,
    pm.kind,
    pr.seller_id,
    pf.full_name,
    pf.handle,
    pf.avatar_url,
    pf.created_at,
    coalesce(pf.banned_at is not null or (pf.suspended_until is not null and pf.suspended_until > now()), false),
    led.earned_cents,
    led.committed_cents,
    led.available_cents,
    -- The real signals, replacing the invented trust score and dispute count
    -- the screen used to draw. Each one is a count of rows that exist.
    (select count(*) from public.order_items oi
      where oi.seller_id = pr.seller_id and oi.status = 'delivered'),
    -- A refund Stripe rejected is not a refund, so 'failed' rows do not count
    -- against the seller. Pending ones do: the money is on its way back.
    (select count(distinct orf.order_id) from public.order_refunds orf
      where orf.status <> 'failed'
        and exists (
          select 1 from public.order_items oi2
           where oi2.order_id = orf.order_id and oi2.seller_id = pr.seller_id
        )),
    (select count(*) from public.payout_requests pp
      where pp.seller_id = pr.seller_id and pp.status = 'paid')
  from public.payout_requests pr
  left join public.profiles pf on pf.id = pr.seller_id
  left join public.payout_methods pm on pm.id = pr.method_id
  left join lateral public.seller_payout_ledger(pr.seller_id) led on true
  where p_status is null or pr.status = p_status
  order by
    -- Pending first regardless of age: this is a work queue, not a history.
    case pr.status when 'pending' then 0 when 'on_hold' then 1 when 'approved' then 2 else 3 end,
    pr.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end $$;


-- The decision. Refuses to approve more than the seller has actually earned —
-- the one thing in this file that stops a bug elsewhere from becoming a wire
-- transfer.
create function public.admin_review_payout(
  p_actor  text,
  p_label  text,
  p_payout uuid,
  p_status text,
  p_note   text default null
)
returns public.payout_requests
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  rec public.payout_requests;
  v_handle text;
  v_earned bigint;
  v_committed bigint;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Missing actor' using errcode = '22023';
  end if;
  if p_status not in ('approved', 'rejected', 'on_hold', 'pending') then
    raise exception 'Unknown payout status: %', p_status using errcode = '22023';
  end if;

  -- Locked for the duration: two admins clicking Approve on the same request
  -- must not both pass the balance check below.
  select * into rec from public.payout_requests where id = p_payout for update;
  if not found then
    raise exception 'No such payout request' using errcode = 'P0002';
  end if;

  if rec.status = 'paid' then
    raise exception 'That payout has already been sent — its decision cannot be changed' using errcode = '22023';
  end if;

  if p_status = 'rejected' and v_note is null then
    raise exception 'A rejection needs a reason' using errcode = '22023';
  end if;

  if p_status = 'approved' then
    select earned_cents, committed_cents into v_earned, v_committed
      from public.seller_payout_ledger(rec.seller_id);

    -- rec is still pending here, so it is not in committed_cents — the
    -- comparison is "does approving this one stay inside what they earned".
    if rec.amount_cents > (v_earned - v_committed) then
      raise exception
        'Payout exceeds the seller''s available balance: requested %, available %',
        (rec.amount_cents::numeric / 100)::money,
        ((v_earned - v_committed)::numeric / 100)::money
        using errcode = '22023';
    end if;

    if exists (
      select 1 from public.profiles p
       where p.id = rec.seller_id
         and (p.banned_at is not null or (p.suspended_until is not null and p.suspended_until > now()))
    ) then
      raise exception 'That seller''s account is suspended or banned — lift it first, or reject the payout'
        using errcode = '22023';
    end if;

    if rec.method_id is null then
      raise exception 'That payout has no connected method to pay to' using errcode = '22023';
    end if;
  end if;

  update public.payout_requests pr
     set status        = p_status,
         reject_reason = case when p_status = 'rejected' then v_note else pr.reject_reason end,
         admin_note    = coalesce(v_note, pr.admin_note),
         reviewed_at   = now(),
         reviewed_by   = p_actor
   where pr.id = p_payout
  returning * into rec;

  select handle into v_handle from public.profiles where id = rec.seller_id;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
  values (
    p_actor,
    coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    case p_status
      when 'approved' then 'approved payout'
      when 'rejected' then 'rejected payout'
      when 'on_hold'  then 'held payout'
      else                 'reopened payout'
    end,
    '@' || coalesce(v_handle, 'unknown') || ' · ' || to_char(rec.amount_cents::numeric / 100, 'FM999,999,990.00'),
    case p_status when 'approved' then 'check' when 'rejected' then 'close' else 'lock' end,
    jsonb_build_object('payout', rec.id, 'amount_cents', rec.amount_cents, 'dispatch', rec.dispatch)
  );

  return rec;
end $$;


-- The disbursement record. Separate from the decision on purpose: this is the
-- only thing in the schema that asserts money left the platform, and it will
-- not do so without a reference someone can be held to.
create function public.admin_mark_payout_paid(
  p_actor     text,
  p_label     text,
  p_payout    uuid,
  p_reference text
)
returns public.payout_requests
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  rec public.payout_requests;
  v_handle text;
  v_ref text := nullif(trim(coalesce(p_reference, '')), '');
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Missing actor' using errcode = '22023';
  end if;
  if v_ref is null then
    raise exception 'Recording a payment needs the transfer reference' using errcode = '22023';
  end if;

  select * into rec from public.payout_requests where id = p_payout for update;
  if not found then
    raise exception 'No such payout request' using errcode = 'P0002';
  end if;
  if rec.status = 'paid' then
    raise exception 'That payout is already recorded as sent (ref %)', coalesce(rec.payment_reference, '—')
      using errcode = '22023';
  end if;
  if rec.status <> 'approved' then
    raise exception 'Only an approved payout can be marked sent — this one is %', rec.status
      using errcode = '22023';
  end if;

  update public.payout_requests pr
     set status            = 'paid',
         paid_at           = now(),
         paid_by           = p_actor,
         payment_reference = v_ref
   where pr.id = p_payout
  returning * into rec;

  select handle into v_handle from public.profiles where id = rec.seller_id;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
  values (
    p_actor,
    coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    'recorded payout sent',
    '@' || coalesce(v_handle, 'unknown') || ' · ' || to_char(rec.net_cents::numeric / 100, 'FM999,999,990.00'),
    'check',
    jsonb_build_object('payout', rec.id, 'net_cents', rec.net_cents, 'reference', v_ref)
  );

  return rec;
end $$;


-- The reveal. Someone paying a Nigerian bank transfer by hand needs the account
-- number, so this exists; looking at another person's bank details is an event,
-- so it writes an audit line before returning them. The audit line is written in
-- the same transaction as the read, which means there is no way to take the
-- details without leaving the trace.
create function public.admin_payout_destination(
  p_actor  text,
  p_label  text,
  p_payout uuid
)
returns table (
  kind                text,
  label               text,
  status              text,
  paypal_email        text,
  stripe_account_id   text,
  uglycash_handle     text,
  bank_country        text,
  bank_currency       text,
  bank_name           text,
  bank_account_name   text,
  bank_account_number text,
  bank_extra          text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_method uuid;
  v_seller uuid;
  v_handle text;
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Missing actor' using errcode = '22023';
  end if;

  select pr.method_id, pr.seller_id into v_method, v_seller
    from public.payout_requests pr where pr.id = p_payout;

  if v_seller is null then
    raise exception 'No such payout request' using errcode = 'P0002';
  end if;
  if v_method is null then
    raise exception 'That payout has no connected method' using errcode = 'P0002';
  end if;

  select p.handle into v_handle from public.profiles p where p.id = v_seller;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
  values (
    p_actor,
    coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    'viewed payout details',
    '@' || coalesce(v_handle, 'unknown'),
    'view',
    jsonb_build_object('payout', p_payout, 'method', v_method)
  );

  return query
  select pm.kind, pm.label, pm.status,
         pm.paypal_email, pm.stripe_account_id, pm.uglycash_handle,
         pm.bank_country, pm.bank_currency, pm.bank_name,
         pm.bank_account_name, pm.bank_account_number, pm.bank_extra
    from public.payout_methods pm
   where pm.id = v_method;
end $$;


-- ── 5. Reachable only from the server ───────────────────────────────────────
--
-- Every function above is security definer, so an EXECUTE grant to `anon` or
-- `authenticated` would hand a browser the ability to approve its own payout.
-- The grants are stripped and re-issued to service_role alone, which exists in
-- exactly one place: SUPABASE_SERVICE_ROLE_KEY on the server.

do $$
declare
  sig text;
  sigs text[] := array[
    'public.admin_payout_queue(text, int)',
    'public.admin_review_payout(text, text, uuid, text, text)',
    'public.admin_mark_payout_paid(text, text, uuid, text)',
    'public.admin_payout_destination(text, text, uuid)'
  ];
begin
  foreach sig in array sigs loop
    execute format('revoke all on function %s from public, anon, authenticated', sig);
    execute format('grant execute on function %s to service_role', sig);
  end loop;
end $$;


-- ── Notes for whoever applies this ──────────────────────────────────────────
--
-- After this runs:
--   * every existing payout_requests row reads 'No method connected', because
--     none of them had one. They cannot be approved until the seller connects a
--     method and re-requests — which is correct; there was nowhere to send them.
--   * approving a payout above a seller's delivered-and-cleared earnings now
--     fails with a message naming both numbers.
--   * nothing marks a payout paid except a person recording a reference.
--
-- Not in this file, and not possible in this codebase today: automatic
-- disbursement. PayPal Payouts needs API credentials that do not exist here, and
-- Stripe payouts need Connect onboarding that has never been built. `dispatch`
-- records which kinds are *meant* to settle automatically so the seam is
-- explicit rather than implied.
