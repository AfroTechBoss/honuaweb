-- ============================================================
-- Impact tracking: triggers + total_co2_kg column
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Add total_co2_kg to profiles if not already present
alter table profiles add column if not exists total_co2_kg numeric not null default 0;

-- Trigger function: on impact_logs INSERT, update impact_score and total_co2_kg on profiles,
-- and auto-grant verified badge when 500 kg CO₂ threshold is reached
create or replace function handle_impact_log_insert()
returns trigger language plpgsql security definer as $$
begin
  update profiles
  set
    impact_score  = impact_score  + coalesce(NEW.points, 0),
    total_co2_kg  = total_co2_kg  + coalesce(NEW.co2_saved_kg, 0),
    verified      = case
                      when total_co2_kg + coalesce(NEW.co2_saved_kg, 0) >= 500 then true
                      else verified
                    end
  where id = NEW.user_id;
  return NEW;
end;
$$;

drop trigger if exists trg_impact_log_insert on impact_logs;
create trigger trg_impact_log_insert
  after insert on impact_logs
  for each row execute function handle_impact_log_insert();

-- Make sure RLS allows owners to insert their own logs
-- (policy may already exist — use "or replace" workaround via drop+create)
drop policy if exists "impact_logs: owner insert" on impact_logs;
create policy "impact_logs: owner insert"
  on impact_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "impact_logs: public read" on impact_logs;
create policy "impact_logs: public read"
  on impact_logs for select using (true);

alter table impact_logs enable row level security;
