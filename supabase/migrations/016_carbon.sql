-- ============================================================
-- Migration 016: Carbon market — credits + purchases
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

create table if not exists carbon_credits (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  region       text,
  type         text,                              -- Forestry / Wetland / DAC / …
  verifier     text,
  vintage      text,
  price_cents  int not null,                      -- per tonne
  volume_t     numeric not null default 0,        -- tonnes available
  tag          text,                              -- Premium / Verified / Removal
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table carbon_credits enable row level security;

drop policy if exists "credits viewable by everyone" on carbon_credits;
create policy "credits viewable by everyone" on carbon_credits for select using (true);

drop policy if exists "admins manage credits" on carbon_credits;
create policy "admins manage credits" on carbon_credits for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
);

-- Seed the six demo credits. Safe to re-run.
insert into carbon_credits (name, region, type, verifier, vintage, price_cents, volume_t, tag)
select * from (values
  ('Mau Forest restoration',            'Kenya',     'Forestry',  'Verra VCS',     '2025',  1820, 12400, 'Premium'),
  ('Borneo peatland protection',        'Indonesia', 'Wetland',   'Gold Standard', '2024',  2480,  8200, 'Verified'),
  ('Patagonia rewilding',               'Chile',     'Rewilding', 'Plan Vivo',     '2025',  3150,  4100, 'Premium'),
  ('Direct air capture (Hellisheiði)',  'Iceland',   'DAC',       'Puro.Earth',    '2026', 42000,   120, 'Removal'),
  ('Mangrove blue carbon',              'Senegal',   'Coastal',   'Verra VCS',     '2024',  2200,  6800, 'Verified'),
  ('Biochar (Sonoma Coop)',             'USA',       'Soil',      'Puro.Earth',    '2025', 11800,   900, 'Removal')
) as v(name, region, type, verifier, vintage, price_cents, volume_t, tag)
where not exists (select 1 from carbon_credits);

-- ---- Purchases (retirements) ----
create table if not exists carbon_purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  credit_id    uuid references carbon_credits(id) on delete set null,
  credit_name  text,                              -- snapshot so history survives credit deletion
  tonnes       numeric not null check (tonnes > 0),
  total_cents  int not null default 0,
  created_at   timestamptz not null default now()
);

alter table carbon_purchases enable row level security;

drop policy if exists "users see own purchases" on carbon_purchases;
create policy "users see own purchases" on carbon_purchases for select using (user_id = auth.uid());

drop policy if exists "users create own purchases" on carbon_purchases;
create policy "users create own purchases" on carbon_purchases for insert with check (user_id = auth.uid());

-- Decrement available volume on purchase
create or replace function decrement_credit_volume()
returns trigger language plpgsql security definer as $$
begin
  if NEW.credit_id is not null then
    update carbon_credits set volume_t = greatest(volume_t - NEW.tonnes, 0) where id = NEW.credit_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_credit_volume on carbon_purchases;
create trigger trg_credit_volume
  after insert on carbon_purchases
  for each row execute function decrement_credit_volume();
