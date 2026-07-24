-- ============================================================
-- Challenge status & submission workflow
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- Add status column: active (default / admin-created), pending (user-submitted), archived
alter table challenges add column if not exists status text not null default 'active';
alter table challenges add column if not exists submitted_by uuid references auth.users(id) on delete set null;
alter table challenges add column if not exists reject_reason text;

-- Update existing rows to be active
update challenges set status = 'active' where status is null or status = '';

-- RLS: authenticated users can insert their own pending challenges
drop policy if exists "challenges: auth insert" on challenges;
create policy "challenges: auth insert"
  on challenges for insert
  with check (
    auth.role() = 'authenticated'
    and status = 'pending'
    and submitted_by = auth.uid()
  );

-- Admins (service role) can insert active challenges and update status
-- Already covered by service-role bypass; the select policy lets everyone read active ones
drop policy if exists "challenges: public read" on challenges;
create policy "challenges: public read"
  on challenges for select
  using (status = 'active' or auth.role() = 'service_role');

-- Only service role can approve/reject (update status)
drop policy if exists "challenges: admin update" on challenges;
create policy "challenges: admin update"
  on challenges for update
  using (auth.role() = 'service_role');
