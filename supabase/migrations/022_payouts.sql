-- ============================================================
-- Migration 022: Seller payouts
-- Sellers request withdrawals against their cleared balance;
-- admins approve / reject / hold. Safe to re-run.
-- ============================================================

create table if not exists payout_requests (id uuid primary key default gen_random_uuid());

alter table payout_requests add column if not exists seller_id     uuid references public.profiles(id) on delete cascade;
alter table payout_requests add column if not exists amount_cents  int not null default 0;   -- gross requested (before withdrawal fee)
alter table payout_requests add column if not exists fee_cents     int not null default 0;   -- withdrawal fee withheld
alter table payout_requests add column if not exists net_cents     int not null default 0;   -- what the seller receives
alter table payout_requests add column if not exists destination   text;
alter table payout_requests add column if not exists status        text not null default 'pending';  -- pending|approved|rejected|on_hold
alter table payout_requests add column if not exists reject_reason text;
alter table payout_requests add column if not exists created_at    timestamptz not null default now();
alter table payout_requests add column if not exists reviewed_at   timestamptz;

alter table payout_requests enable row level security;

-- Sellers see and create their own requests
drop policy if exists "sellers see own payouts" on payout_requests;
create policy "sellers see own payouts" on payout_requests for select
  using (seller_id = auth.uid());

drop policy if exists "sellers request own payouts" on payout_requests;
create policy "sellers request own payouts" on payout_requests for insert
  with check (seller_id = auth.uid() and status = 'pending');

-- Admins see everyone's and change status
drop policy if exists "admins see all payouts" on payout_requests;
create policy "admins see all payouts" on payout_requests for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
);

drop policy if exists "admins review payouts" on payout_requests;
create policy "admins review payouts" on payout_requests for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
);
