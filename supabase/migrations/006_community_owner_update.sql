-- Allow community creators to update and delete their own communities
-- Run in Supabase Dashboard > SQL Editor

alter table communities add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table communities add column if not exists avatar_url text;

drop policy if exists "communities: owner update" on communities;
create policy "communities: owner update"
  on communities for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "communities: owner delete" on communities;
create policy "communities: owner delete"
  on communities for delete
  using (auth.uid() = created_by);
