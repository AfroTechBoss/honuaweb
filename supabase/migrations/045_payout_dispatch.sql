-- ============================================================
-- Migration 045: Closing the automated-dispatch seam
--
-- 042 left this stated plainly in its own footer: "Not in this file, and not
-- possible in this codebase today: automatic disbursement." `dispatch` recorded
-- which kinds were *meant* to settle through an API, and every payout on the
-- platform went out by hand regardless. This file is the other half.
--
-- Three things it adds, in order of how much they matter:
--
--   1. A claim. Two admins clicking Send on the same approved payout must not
--      both reach Stripe. `admin_dispatch_claim` locks the row and moves it to
--      'processing' in one transaction, so the second caller loses. The provider
--      idempotency key (the payout id itself) is the second line of defence, not
--      the first — a key only helps if the same request is retried, and two
--      concurrent clicks are two requests.
--
--   2. A state for "submitted, not yet arrived". A Stripe transfer either
--      succeeds or raises; when it succeeds the money has moved. A PayPal payout
--      comes back PENDING and settles minutes later, and may still be DENIED or
--      returned UNCLAIMED if the recipient has no PayPal account. Collapsing
--      those two into 'paid' at submit time would put the same lie back in the
--      console that 042 was written to remove. So: 'processing' means the
--      provider has it; only a confirmed settlement writes paid_at.
--
--   3. Onboarding facts about a connected Stripe account. Which is also a fix
--      for a hole that was harmless only while nothing sent money: the seller
--      form asks them to *type* an acct_ id, and validateMethod checks the shape
--      and nothing else. Once transfers.create is wired, a seller who types
--      someone else's account id is paid someone else's earnings. From here a
--      Stripe destination is only dispatchable when stripe_onboarded_at is set —
--      which only the Connect callback writes, against an account id this
--      platform created. Typed ids keep working for manual sends and can never
--      be auto-dispatched.
--
-- Stripe Connect does not operate in Nigeria, Ghana or Kenya, which is a large
-- share of this platform's sellers. Automation covers who it can; the bank and
-- UglyCash queue is not a fallback, it is the main path for those countries and
-- stays exactly as it was.
-- ============================================================


-- ── 1. What we know about a connected Stripe account ────────────────────────
--
-- Mirrored from Stripe rather than asked of the seller. Every one of these is
-- refreshed from account.updated and by the return-from-onboarding call, so a
-- seller who half-finishes KYC shows as half-finished instead of as ready.

alter table public.payout_methods
  add column if not exists stripe_onboarded_at timestamptz;

comment on column public.payout_methods.stripe_onboarded_at is
  'Set only by the Connect callback, against an account this platform created. Null means the seller typed the id in, which is never auto-dispatchable — see the header of migration 045.';

-- `transfers` is the capability that decides whether we may send money *to*
-- them. `payouts_enabled` decides whether Stripe may then move it on to their
-- bank. They are different, and a seller can have the first without the second.
alter table public.payout_methods
  add column if not exists stripe_transfers_enabled boolean not null default false;
alter table public.payout_methods
  add column if not exists stripe_payouts_enabled boolean not null default false;
alter table public.payout_methods
  add column if not exists stripe_charges_enabled boolean not null default false;

-- Whatever Stripe still wants before the account is complete: currently_due,
-- past_due, disabled_reason, the deadline. Stored whole because the useful
-- rendering of it changes with Stripe's requirements, not with our schema.
alter table public.payout_methods
  add column if not exists stripe_requirements jsonb;

alter table public.payout_methods
  add column if not exists stripe_country text;

alter table public.payout_methods
  add column if not exists stripe_synced_at timestamptz;

-- PayPal returns the payer id on a successful payout item. Recorded because it
-- is the only durable identifier for the receiving account — an email address
-- can be moved between PayPal accounts.
alter table public.payout_methods
  add column if not exists paypal_payer_id text;

-- An account this platform created must map to exactly one method row, or the
-- Connect callback has to guess which one to update.
create unique index if not exists payout_methods_stripe_account_idx
  on public.payout_methods (stripe_account_id) where stripe_account_id is not null;


-- ── 2. What a dispatch attempt records ──────────────────────────────────────

alter table public.payout_requests
  add column if not exists provider text;
alter table public.payout_requests
  add column if not exists provider_ref text;

-- PayPal returns a batch id at submit and item ids per recipient; the item-level
-- webhook is the one that says whether this seller was actually paid, so both
-- are needed to match an event back to a row. Stripe leaves this null — a
-- transfer id is the whole identity.
alter table public.payout_requests
  add column if not exists provider_item_ref text;

alter table public.payout_requests
  add column if not exists provider_status text;
alter table public.payout_requests
  add column if not exists dispatch_attempted_at timestamptz;

-- Kept after a failure rather than cleared, so the queue can show why the last
-- attempt did not work next to the button that retries it.
alter table public.payout_requests
  add column if not exists dispatch_error text;

do $$
begin
  alter table public.payout_requests drop constraint if exists payout_requests_status_check;
  alter table public.payout_requests add constraint payout_requests_status_check
    check (status in ('pending', 'approved', 'rejected', 'on_hold', 'processing', 'paid'));

  alter table public.payout_requests drop constraint if exists payout_requests_provider_check;
  alter table public.payout_requests add constraint payout_requests_provider_check
    check (provider is null or provider in ('stripe', 'paypal'));
exception when others then
  raise warning 'payout_requests constraints not applied: %', sqlerrm;
end $$;

-- The webhook path finds its row by provider reference, not by id.
create index if not exists payout_requests_provider_ref_idx
  on public.payout_requests (provider, provider_ref) where provider_ref is not null;
create index if not exists payout_requests_provider_item_idx
  on public.payout_requests (provider_item_ref) where provider_item_ref is not null;

-- A payout stuck in 'processing' is money whose whereabouts nobody knows, which
-- is the worst state in this table. Indexed so a reconciliation sweep is cheap.
create index if not exists payout_requests_processing_idx
  on public.payout_requests (dispatch_attempted_at) where status = 'processing';


-- ── 3. Redefinitions from 042 ───────────────────────────────────────────────
--
-- Dropped rather than replaced, for 042's reason: create or replace refuses to
-- change a return type and silently creates an overload when the arguments move.

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'admin_payout_queue',
         'admin_review_payout',
         'admin_mark_payout_paid',
         'admin_dispatch_claim',
         'admin_dispatch_settle',
         'payout_provider_settle'
       )
  loop
    execute format('drop function if exists %s', fn.sig);
    raise notice 'dropped previous %', fn.sig;
  end loop;
end $$;


-- The queue, carrying the dispatch state the console now draws. Everything from
-- 042 is unchanged; the last seven columns are new.
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
  prior_payouts     bigint,
  provider          text,
  provider_ref      text,
  provider_status   text,
  dispatch_attempted_at timestamptz,
  dispatch_error    text,
  -- Whether this destination could be sent through an API *right now*. Computed
  -- here so the console's Send button and the claim below cannot disagree about
  -- what is dispatchable.
  dispatchable      boolean,
  -- Why not, when not. Rendered under the disabled button, because "the button
  -- is grey" is not an explanation anyone can act on.
  dispatch_blocker  text
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
    pr.id, pr.amount_cents, pr.fee_cents, pr.net_cents, pr.status, pr.dispatch,
    pr.reject_reason, pr.admin_note, pr.created_at, pr.reviewed_at, pr.reviewed_by,
    pr.paid_at, pr.paid_by, pr.payment_reference,
    coalesce(pm.label, pr.destination_label, pr.destination, 'No method connected'),
    pr.method_id, pm.kind, pr.seller_id,
    pf.full_name, pf.handle, pf.avatar_url, pf.created_at,
    coalesce(pf.banned_at is not null or (pf.suspended_until is not null and pf.suspended_until > now()), false),
    led.earned_cents, led.committed_cents, led.available_cents,
    (select count(*) from public.order_items oi
      where oi.seller_id = pr.seller_id and oi.status = 'delivered'),
    (select count(distinct orf.order_id) from public.order_refunds orf
      where orf.status <> 'failed'
        and exists (select 1 from public.order_items oi2
                     where oi2.order_id = orf.order_id and oi2.seller_id = pr.seller_id)),
    (select count(*) from public.payout_requests pp
      where pp.seller_id = pr.seller_id and pp.status = 'paid'),
    pr.provider, pr.provider_ref, pr.provider_status,
    pr.dispatch_attempted_at, pr.dispatch_error,
    -- Must agree with admin_dispatch_claim, which is the thing that actually
    -- refuses — a button enabled here and a claim that rejects it would be a
    -- worse lie than a disabled button. Hence the second arm: a payout the
    -- provider already holds is sendable again only once the last attempt is on
    -- record as failed. Without that, the retry is just the second of two
    -- concurrent clicks.
    (pm.kind in ('paypal', 'stripe')
      and (pr.status = 'approved'
           or (pr.status = 'processing' and pr.dispatch_error is not null))
      and (pm.kind <> 'stripe' or (pm.stripe_onboarded_at is not null and pm.stripe_transfers_enabled))),
    case
      when pm.kind is null then 'No method connected'
      when pm.kind not in ('paypal', 'stripe') then null
      when pr.status = 'paid' then 'Already sent'
      when pr.status = 'processing' and pr.dispatch_error is null then 'Already with the provider'
      when pr.status not in ('approved', 'processing') then 'Approve it first'
      when pm.kind = 'stripe' and pm.stripe_onboarded_at is null then
        'This Stripe id was typed in, not connected through onboarding — it cannot be sent to automatically'
      when pm.kind = 'stripe' and not pm.stripe_transfers_enabled then
        'The seller has not finished Stripe onboarding'
      else null
    end
  from public.payout_requests pr
  left join public.profiles pf on pf.id = pr.seller_id
  left join public.payout_methods pm on pm.id = pr.method_id
  left join lateral public.seller_payout_ledger(pr.seller_id) led on true
  where p_status is null or pr.status = p_status
  order by
    case pr.status
      when 'pending' then 0 when 'on_hold' then 1
      when 'processing' then 2 when 'approved' then 3 else 4 end,
    pr.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end $$;


-- The decision. Unchanged from 042 except that 'processing' now also refuses:
-- a payout the provider is holding must not have its decision rewritten
-- underneath the settlement that is about to arrive.
create function public.admin_review_payout(
  p_actor text, p_label text, p_payout uuid, p_status text, p_note text default null
)
returns public.payout_requests
language plpgsql volatile security definer set search_path = public
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

  select * into rec from public.payout_requests where id = p_payout for update;
  if not found then
    raise exception 'No such payout request' using errcode = 'P0002';
  end if;

  if rec.status = 'paid' then
    raise exception 'That payout has already been sent — its decision cannot be changed' using errcode = '22023';
  end if;
  if rec.status = 'processing' then
    raise exception 'That payout is with % right now — wait for it to settle or fail before changing the decision',
      coalesce(rec.provider, 'the payment provider') using errcode = '22023';
  end if;

  if p_status = 'rejected' and v_note is null then
    raise exception 'A rejection needs a reason' using errcode = '22023';
  end if;

  if p_status = 'approved' then
    select earned_cents, committed_cents into v_earned, v_committed
      from public.seller_payout_ledger(rec.seller_id);

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
    p_actor, coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    case p_status
      when 'approved' then 'approved payout' when 'rejected' then 'rejected payout'
      when 'on_hold' then 'held payout' else 'reopened payout' end,
    '@' || coalesce(v_handle, 'unknown') || ' · ' || to_char(rec.amount_cents::numeric / 100, 'FM999,999,990.00'),
    case p_status when 'approved' then 'check' when 'rejected' then 'close' else 'lock' end,
    jsonb_build_object('payout', rec.id, 'amount_cents', rec.amount_cents, 'dispatch', rec.dispatch)
  );

  return rec;
end $$;


-- Recording a payment by hand. Now also accepts a 'processing' row, for the case
-- the automated path exists to create: a PayPal batch submitted, the webhook
-- never arrived, and someone has confirmed in the PayPal dashboard that it
-- landed. Refusing that would leave the only correct state unreachable.
create function public.admin_mark_payout_paid(
  p_actor text, p_label text, p_payout uuid, p_reference text
)
returns public.payout_requests
language plpgsql volatile security definer set search_path = public
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
  if rec.status not in ('approved', 'processing') then
    raise exception 'Only an approved payout can be marked sent — this one is %', rec.status
      using errcode = '22023';
  end if;

  update public.payout_requests pr
     set status = 'paid', paid_at = now(), paid_by = p_actor, payment_reference = v_ref
   where pr.id = p_payout
  returning * into rec;

  select handle into v_handle from public.profiles where id = rec.seller_id;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
  values (
    p_actor, coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    'recorded payout sent',
    '@' || coalesce(v_handle, 'unknown') || ' · ' || to_char(rec.net_cents::numeric / 100, 'FM999,999,990.00'),
    'check',
    jsonb_build_object('payout', rec.id, 'net_cents', rec.net_cents, 'reference', v_ref,
                       'was', rec.status, 'by_hand', true)
  );

  return rec;
end $$;


-- ── 4. Dispatch ─────────────────────────────────────────────────────────────

-- Claim the row and hand back what the provider call needs. The lock is the
-- whole point: between this returning and the settle below, no other request can
-- reach the same payout, because it is no longer 'approved'.
--
-- Returns the destination fields. That is a read of a seller's payout details,
-- but not the same event as an admin opening them on screen — so it writes
-- 'started payout dispatch', not 'viewed payout details'. Recording it as the
-- latter would bury real reveals in machine noise.
create function public.admin_dispatch_claim(
  p_actor text, p_label text, p_payout uuid
)
returns table (
  payout_id     uuid,
  provider      text,
  net_cents     int,
  currency      text,
  seller_handle text,
  paypal_email  text,
  stripe_account_id text,
  retry         boolean
)
language plpgsql volatile security definer set search_path = public
as $$
#variable_conflict use_column
declare
  rec public.payout_requests;
  m public.payout_methods;
  v_handle text;
  v_provider text;
  v_retry boolean := false;
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Missing actor' using errcode = '22023';
  end if;

  select * into rec from public.payout_requests where id = p_payout for update;
  if not found then
    raise exception 'No such payout request' using errcode = 'P0002';
  end if;

  if rec.status = 'paid' then
    raise exception 'That payout has already been sent' using errcode = '22023';
  end if;

  -- A row already in flight. Allowed through only when the last attempt is on
  -- record as having failed — otherwise this is the second of two concurrent
  -- clicks and it must lose.
  if rec.status = 'processing' then
    if rec.dispatch_error is null then
      raise exception 'That payout is already with % — nothing to retry until it fails',
        coalesce(rec.provider, 'the payment provider') using errcode = '22023';
    end if;
    v_retry := true;
  elsif rec.status <> 'approved' then
    raise exception 'Only an approved payout can be sent — this one is %', rec.status using errcode = '22023';
  end if;

  if rec.method_id is null then
    raise exception 'That payout has no connected method to pay to' using errcode = '22023';
  end if;

  select * into m from public.payout_methods where id = rec.method_id;
  if not found then
    raise exception 'That payout method no longer exists' using errcode = 'P0002';
  end if;

  if m.kind not in ('paypal', 'stripe') then
    raise exception 'A % payout is sent by hand — record the reference once you have sent it', m.kind
      using errcode = '22023';
  end if;
  v_provider := m.kind;

  -- The rule from the header. A typed acct_ id has never been proven to belong
  -- to the seller who typed it, so it is not something this platform will move
  -- money to on its own.
  if v_provider = 'stripe' then
    if m.stripe_onboarded_at is null then
      raise exception 'That Stripe account was entered by hand rather than connected — it cannot be sent to automatically. Ask the seller to connect Stripe, or send it manually and record the reference.'
        using errcode = '22023';
    end if;
    if not m.stripe_transfers_enabled then
      raise exception 'That seller has not finished Stripe onboarding, so Stripe will not accept a transfer to them yet'
        using errcode = '22023';
    end if;
  end if;

  -- Re-checked at the moment of sending, not just at approval. Approval may have
  -- been days ago, and a seller banned since then must not still be paid.
  if exists (
    select 1 from public.profiles p
     where p.id = rec.seller_id
       and (p.banned_at is not null or (p.suspended_until is not null and p.suspended_until > now()))
  ) then
    raise exception 'That seller''s account is suspended or banned — money cannot be sent while it is'
      using errcode = '22023';
  end if;

  update public.payout_requests pr
     set status = 'processing',
         provider = v_provider,
         dispatch_attempted_at = now(),
         dispatch_error = null
   where pr.id = p_payout
  returning * into rec;

  select handle into v_handle from public.profiles where id = rec.seller_id;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
  values (
    p_actor, coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    case when v_retry then 'retried payout dispatch' else 'started payout dispatch' end,
    '@' || coalesce(v_handle, 'unknown') || ' · ' || to_char(rec.net_cents::numeric / 100, 'FM999,999,990.00'),
    'send',
    jsonb_build_object('payout', rec.id, 'provider', v_provider, 'net_cents', rec.net_cents)
  );

  return query select
    rec.id, v_provider, rec.net_cents,
    -- The platform charges in USD (see app/api/checkout). A seller's bank
    -- currency describes where it lands, not what leaves.
    'usd'::text,
    v_handle, m.paypal_email, m.stripe_account_id, v_retry;
end $$;


-- The settlement. Three outcomes, because there are three:
--
--   paid       the money has moved and is the seller's. Stripe says this at the
--              moment transfers.create returns.
--   submitted  the provider accepted it and will tell us later. PayPal.
--   failed     it did not go. Back to 'approved' so it can be retried or sent by
--              hand, with the reason kept on the row.
create function public.admin_dispatch_settle(
  p_actor text, p_label text, p_payout uuid,
  p_outcome text, p_ref text default null, p_item_ref text default null,
  p_status text default null, p_error text default null
)
returns public.payout_requests
language plpgsql volatile security definer set search_path = public
as $$
declare
  rec public.payout_requests;
  v_handle text;
begin
  if p_outcome not in ('paid', 'submitted', 'failed') then
    raise exception 'Unknown dispatch outcome: %', p_outcome using errcode = '22023';
  end if;

  select * into rec from public.payout_requests where id = p_payout for update;
  if not found then
    raise exception 'No such payout request' using errcode = 'P0002';
  end if;

  -- Not an error worth raising on: a webhook that beat the submit call back has
  -- already settled this, and the right answer is to leave its verdict alone.
  if rec.status = 'paid' then
    return rec;
  end if;

  update public.payout_requests pr
     set status = case p_outcome
                    when 'paid' then 'paid'
                    when 'submitted' then 'processing'
                    else 'approved' end,
         provider_ref      = coalesce(nullif(trim(coalesce(p_ref, '')), ''), pr.provider_ref),
         provider_item_ref = coalesce(nullif(trim(coalesce(p_item_ref, '')), ''), pr.provider_item_ref),
         provider_status   = coalesce(nullif(trim(coalesce(p_status, '')), ''), pr.provider_status),
         dispatch_error    = case when p_outcome = 'failed'
                                  then nullif(trim(coalesce(p_error, '')), '') else null end,
         paid_at           = case when p_outcome = 'paid' then now() else pr.paid_at end,
         paid_by           = case when p_outcome = 'paid' then p_actor else pr.paid_by end,
         -- The provider's own id is the reference. It is what someone would
         -- quote back to Stripe or PayPal if the seller says it never arrived,
         -- which is exactly what this column is for.
         payment_reference = case when p_outcome = 'paid'
                                  then coalesce(nullif(trim(coalesce(p_ref, '')), ''), pr.payment_reference)
                                  else pr.payment_reference end
   where pr.id = p_payout
  returning * into rec;

  select handle into v_handle from public.profiles where id = rec.seller_id;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
  values (
    coalesce(nullif(trim(coalesce(p_actor, '')), ''), 'system'),
    coalesce(nullif(trim(coalesce(p_label, '')), ''), 'System'),
    case p_outcome
      when 'paid' then 'payout sent'
      when 'submitted' then 'payout submitted to provider'
      else 'payout dispatch failed' end,
    '@' || coalesce(v_handle, 'unknown') || ' · ' || to_char(rec.net_cents::numeric / 100, 'FM999,999,990.00'),
    case p_outcome when 'paid' then 'check' when 'failed' then 'close' else 'send' end,
    jsonb_build_object('payout', rec.id, 'provider', rec.provider, 'ref', rec.provider_ref,
                       'provider_status', rec.provider_status, 'error', p_error,
                       'net_cents', rec.net_cents, 'automated', true)
  );

  return rec;
end $$;


-- The webhook entry point. Finds the row by what the provider knows about it
-- rather than by an id the caller supplies, so a forged body cannot name an
-- arbitrary payout — and the route verifies the signature before reaching here
-- regardless.
create function public.payout_provider_settle(
  p_provider text, p_ref text, p_item_ref text,
  p_outcome text, p_status text default null, p_error text default null
)
returns public.payout_requests
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  select pr.id into v_id
    from public.payout_requests pr
   where pr.provider = p_provider
     and (
       (p_item_ref is not null and pr.provider_item_ref = p_item_ref)
       or (p_ref is not null and pr.provider_ref = p_ref)
     )
   order by pr.dispatch_attempted_at desc nulls last
   limit 1;

  -- Genuinely normal: a payout batch this platform did not create, or an event
  -- replayed after the row was cleaned up. The route logs and returns 200 so the
  -- provider stops retrying.
  if v_id is null then
    return null;
  end if;

  return public.admin_dispatch_settle(
    'system', 'Provider webhook', v_id, p_outcome, p_ref, p_item_ref, p_status, p_error
  );
end $$;


-- ── 5. Reachable only from the server ───────────────────────────────────────

do $$
declare
  sig text;
  sigs text[] := array[
    'public.admin_payout_queue(text, int)',
    'public.admin_review_payout(text, text, uuid, text, text)',
    'public.admin_mark_payout_paid(text, text, uuid, text)',
    'public.admin_dispatch_claim(text, text, uuid)',
    'public.admin_dispatch_settle(text, text, uuid, text, text, text, text, text)',
    'public.payout_provider_settle(text, text, text, text, text, text)'
  ];
begin
  foreach sig in array sigs loop
    execute format('revoke all on function %s from public, anon, authenticated', sig);
    execute format('grant execute on function %s to service_role', sig);
  end loop;
end $$;


-- ── Notes for whoever applies this ──────────────────────────────────────────
--
-- After this runs, nothing changes on its own. Dispatch stays unavailable until
-- the credentials exist:
--
--   Stripe    Connect must be enabled on the platform account (Dashboard →
--             Connect → Get started). STRIPE_SECRET_KEY is already set. No new
--             secret is needed; the capability is an account setting.
--             Add STRIPE_CONNECT_WEBHOOK_SECRET for the Connect endpoint —
--             it is a *separate* endpoint and secret from the payments one
--             already configured, because Connect events arrive on their own.
--
--   PayPal    PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV=sandbox|live,
--             and PAYPAL_WEBHOOK_ID. Payouts is a feature that must be enabled
--             on the business account — it is not on by default, and the API
--             returns AUTHORIZATION_ERROR rather than anything clearer if it
--             is not.
--
-- Until each is present the console shows the Send button disabled with the
-- missing piece named, and the manual path is untouched.
--
-- Existing Stripe methods: every one of them was typed in, so stripe_onboarded_at
-- is null and none can be auto-dispatched. That is deliberate and is the fix for
-- the hole described in the header — those sellers should reconnect through
-- onboarding. Their payouts can still be sent by hand in the meantime.
