-- ============================================================
-- Migration 057: account deletion erases the person, not the books
--
-- EU law pulls in two directions when someone deletes their account:
--
--   GDPR art. 17      erase what we no longer need, without undue delay.
--   art. 17(3)(b)     except what a legal obligation makes us keep:
--     Estonia         Accounting Act §12 — source documents, 7 years.
--     Italy           Civil Code art. 2220 — accounting records, 10 years.
--     EU VAT          Reg. 282/2011 art. 63c — marketplace sale records, 10 years.
--     DAC7            platform operators keep seller data they report, 5–10 years.
--
-- Before this migration, three tables cascaded from profiles and deleting an
-- account deleted them outright:
--
--   orders.user_id            (014) — the buyer's orders, and order_items with
--                                     them. Sellers lost sales they had earned.
--   carbon_purchases.user_id  (016) — the record that those tonnes are spent.
--   payout_requests.seller_id (022) — money that left the platform, unrecorded.
--
-- And seller_applications / payout_methods (the seller's legal name, country
-- and bank details) cascaded too, so even the rows that survived no longer
-- said who they belonged to.
--
-- Now:
--   1. Those FKs are ON DELETE SET NULL. The row stays, detached.
--   2. A trigger copies the old owner into former_* before the FK nulls it,
--      so the money rows still point at a (now pseudonymous) subject id.
--   3. retain_account_identity() snapshots the identity those records need —
--      legal name, email, country, payout destination, tax details (058),
--      buyers' shipping details — into retained_identities. Only the service role can read it.
--      Nothing is kept for an account that never bought, sold or got paid.
--   4. prune_retained_identities() — run daily by /api/cron/prune — deletes a
--      snapshot once its retention period ends, and clears the former_* links,
--      leaving the money rows anonymous.
--
-- The period runs from the end of the calendar year of the account's last
-- transaction, because that is how the accounting acts count. The length is
-- set in app/api/cron/prune/route.ts (10 years, the longest of the above).
--
-- Safe to re-run.
-- ============================================================


-- ── 1. Cascades become SET NULL ─────────────────────────────

create or replace function pg_temp.fk_set_null(tbl text, col text, ref text)
returns void
language plpgsql
as $$
declare
  c text;
begin
  -- Whatever the constraint ended up being called, drop every FK on this
  -- column and add one back with the behaviour we want.
  for c in
    select con.conname
      from pg_constraint con
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
     where con.contype = 'f'
       and con.conrelid = ('public.' || tbl)::regclass
       and att.attname = col
  loop
    execute format('alter table public.%I drop constraint %I', tbl, c);
  end loop;

  execute format('alter table public.%I alter column %I drop not null', tbl, col);
  execute format(
    'alter table public.%I add constraint %I foreign key (%I) references %s on delete set null',
    tbl, tbl || '_' || col || '_fkey', col, ref
  );
end $$;

-- perform, not select: a bare select of a void function shows up in the SQL
-- editor as a result named "fk_set_null", which reads like an error.
do $$
begin
  perform pg_temp.fk_set_null('orders',           'user_id',   'public.profiles(id)');
  perform pg_temp.fk_set_null('carbon_purchases', 'user_id',   'public.profiles(id)');
  perform pg_temp.fk_set_null('payout_requests',  'seller_id', 'public.profiles(id)');
end $$;
-- order_items.buyer_id / seller_id were already SET NULL (020).


-- ── 2. Remember who a row belonged to ───────────────────────
--
-- No FK on these: the profile they name is gone. They are the key into
-- retained_identities, and are cleared when that snapshot is purged.

alter table public.orders           add column if not exists former_user_id   uuid;
alter table public.order_items      add column if not exists former_buyer_id  uuid;
alter table public.order_items      add column if not exists former_seller_id uuid;
alter table public.payout_requests  add column if not exists former_seller_id uuid;
alter table public.carbon_purchases add column if not exists former_user_id   uuid;

-- Arguments come in pairs: (owner column, former column). Triggers fire for
-- the UPDATE a SET NULL foreign key performs, so this also covers a profile
-- deleted from the dashboard rather than through /api/delete-account.
create or replace function public.keep_former_owner()
returns trigger
language plpgsql
as $$
declare
  i int := 0;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
begin
  while i < tg_nargs loop
    if o->>tg_argv[i] is not null and n->>tg_argv[i] is null then
      new := jsonb_populate_record(new, jsonb_build_object(tg_argv[i + 1], o->tg_argv[i]));
    end if;
    i := i + 2;
  end loop;
  return new;
end $$;

drop trigger if exists keep_former_owner on public.orders;
create trigger keep_former_owner before update of user_id on public.orders
  for each row execute function public.keep_former_owner('user_id', 'former_user_id');

drop trigger if exists keep_former_owner on public.order_items;
create trigger keep_former_owner before update of buyer_id, seller_id on public.order_items
  for each row execute function public.keep_former_owner('buyer_id', 'former_buyer_id', 'seller_id', 'former_seller_id');

drop trigger if exists keep_former_owner on public.payout_requests;
create trigger keep_former_owner before update of seller_id on public.payout_requests
  for each row execute function public.keep_former_owner('seller_id', 'former_seller_id');

drop trigger if exists keep_former_owner on public.carbon_purchases;
create trigger keep_former_owner before update of user_id on public.carbon_purchases
  for each row execute function public.keep_former_owner('user_id', 'former_user_id');


-- ── 3. The retention vault ──────────────────────────────────

create table if not exists public.retained_identities (
  subject_id   uuid primary key,          -- the deleted account's id
  identity     jsonb not null,            -- see retain_account_identity()
  retain_from  timestamptz not null,      -- end of the year of the last transaction
  reason       text not null default 'accounting, VAT and platform-reporting records',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- RLS on with no policies: invisible to anon and signed-in users. Only the
-- service role (which bypasses RLS) can read it.
alter table public.retained_identities enable row level security;
revoke all on public.retained_identities from public, anon, authenticated;

create or replace function public.retain_account_identity(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_last     timestamptz;
  v_identity jsonb;
  v_tax      jsonb;
  v_from     timestamptz;
begin
  -- Latest money movement this account took part in. Null means it never
  -- bought, sold, retired carbon or got paid: nothing to keep.
  select greatest(
    (select max(created_at) from public.orders           where user_id   = p_user),
    (select max(created_at) from public.order_items      where seller_id = p_user or buyer_id = p_user),
    (select max(coalesce(paid_at, created_at)) from public.payout_requests where seller_id = p_user),
    (select max(created_at) from public.carbon_purchases where user_id   = p_user)
  ) into v_last;

  if v_last is null then
    return jsonb_build_object('retained', false);
  end if;

  v_identity := jsonb_build_object(
    'account', (
      select jsonb_build_object('handle', p.handle, 'full_name', p.full_name, 'email', u.email)
        from public.profiles p left join auth.users u on u.id = p.id
       where p.id = p_user
    ),
    'seller', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'legal_name', legal_name, 'biz_type', biz_type, 'country', country, 'location', location,
        'shop_name', shop_name, 'shop_handle', shop_handle, 'status', status,
        'created_at', created_at, 'reviewed_at', reviewed_at
      ) order by created_at), '[]'::jsonb)
        from public.seller_applications where user_id = p_user
    ),
    'payout_methods', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'kind', kind, 'label', label,
        'paypal_email', paypal_email, 'stripe_account_id', stripe_account_id, 'uglycash_handle', uglycash_handle,
        'bank_country', bank_country, 'bank_currency', bank_currency, 'bank_name', bank_name,
        'bank_account_name', bank_account_name, 'bank_account_number', bank_account_number,
        'bank_extra', bank_extra, 'is_primary', is_primary, 'created_at', created_at
      ) order by created_at), '[]'::jsonb)
        from public.payout_methods where seller_id = p_user
    ),
    -- The buyer's contact details move here from orders, which sellers can
    -- read; /api/delete-account blanks them on the order rows afterwards.
    'orders', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'email', email, 'address', address, 'created_at', created_at
      ) order by created_at), '[]'::jsonb)
        from public.orders where user_id = p_user
    )
  );

  -- The seller's tax details (058) are what the DAC7 report for their last
  -- year needs. Dynamic so this function still installs before 058 does.
  if to_regclass('public.seller_tax_profiles') is not null then
    execute 'select to_jsonb(t) - ''seller_id'' from public.seller_tax_profiles t where t.seller_id = $1'
       into v_tax using p_user;
    v_identity := v_identity || jsonb_build_object('tax', v_tax);
  end if;

  v_from := date_trunc('year', v_last) + interval '1 year';

  insert into public.retained_identities (subject_id, identity, retain_from)
  values (p_user, v_identity, v_from)
  on conflict (subject_id) do update
    set identity = excluded.identity, retain_from = excluded.retain_from, updated_at = now();

  return jsonb_build_object('retained', true, 'retain_from', v_from);
end $$;

revoke all on function public.retain_account_identity(uuid) from public, anon, authenticated;
grant execute on function public.retain_account_identity(uuid) to service_role;


-- ── 4. Purge when the period ends ───────────────────────────

create or replace function public.prune_retained_identities(keep_days int default 3653)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ids uuid[];
begin
  with gone as (
    delete from public.retained_identities
     where retain_from < now() - make_interval(days => keep_days)
    returning subject_id
  )
  select coalesce(array_agg(subject_id), '{}') into ids from gone;

  if cardinality(ids) > 0 then
    -- Without the snapshot these ids lead nowhere; clear them so the money
    -- rows are plainly anonymous.
    update public.orders           set former_user_id   = null where former_user_id   = any (ids);
    update public.order_items      set former_buyer_id  = null where former_buyer_id  = any (ids);
    update public.order_items      set former_seller_id = null where former_seller_id = any (ids);
    update public.payout_requests  set former_seller_id = null where former_seller_id = any (ids);
    update public.carbon_purchases set former_user_id   = null where former_user_id   = any (ids);
  end if;

  return cardinality(ids);
end $$;

revoke all on function public.prune_retained_identities(int) from public, anon, authenticated;
grant execute on function public.prune_retained_identities(int) to service_role;

-- Superseded by retain_account_identity(), which the route now calls instead.
drop function if exists public.account_deletion_keeps_ledger();
