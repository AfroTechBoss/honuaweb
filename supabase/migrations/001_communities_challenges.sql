-- ============================================================
-- Communities & Challenges tables
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ---- Communities ----

create table if not exists communities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  cover_url     text,
  category      text,
  member_count  int not null default 0,
  post_count    int not null default 0,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists community_members (
  community_id  uuid not null references communities(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- Keep member_count accurate via trigger
create or replace function update_community_member_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update communities set member_count = member_count + 1 where id = NEW.community_id;
  elsif TG_OP = 'DELETE' then
    update communities set member_count = greatest(member_count - 1, 0) where id = OLD.community_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_community_member_count on community_members;
create trigger trg_community_member_count
  after insert or delete on community_members
  for each row execute function update_community_member_count();

-- ---- Challenges ----

create table if not exists challenges (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  category          text,
  days              int not null default 30,
  reward            text,
  participant_count int not null default 0,
  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  ends_at           timestamptz
);

create table if not exists challenge_participants (
  challenge_id   uuid not null references challenges(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  joined_at      timestamptz not null default now(),
  last_logged_at timestamptz,
  streak         int not null default 0,
  primary key (challenge_id, user_id)
);

-- Keep participant_count accurate via trigger
create or replace function update_challenge_participant_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update challenges set participant_count = participant_count + 1 where id = NEW.challenge_id;
  elsif TG_OP = 'DELETE' then
    update challenges set participant_count = greatest(participant_count - 1, 0) where id = OLD.challenge_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_challenge_participant_count on challenge_participants;
create trigger trg_challenge_participant_count
  after insert or delete on challenge_participants
  for each row execute function update_challenge_participant_count();

-- ---- Row-level security ----

alter table communities enable row level security;
alter table community_members enable row level security;
alter table challenges enable row level security;
alter table challenge_participants enable row level security;

-- Anyone can read
create policy "communities: public read"         on communities          for select using (true);
create policy "community_members: public read"   on community_members    for select using (true);
create policy "challenges: public read"          on challenges           for select using (true);
create policy "challenge_participants: public read" on challenge_participants for select using (true);

-- Authenticated users can create communities and challenges
create policy "communities: auth insert"  on communities  for insert with check (auth.uid() = created_by);
create policy "challenges: auth insert"   on challenges   for insert with check (auth.uid() = created_by);

-- Users can manage their own membership / participation
create policy "community_members: self manage"      on community_members      for all using (auth.uid() = user_id);
create policy "challenge_participants: self manage" on challenge_participants for all using (auth.uid() = user_id);

-- ---- Seed data (optional — remove if you want to start empty) ----

insert into communities (name, slug, description, category, member_count) values
  ('Urban gardeners',    'urban-gardeners',    'For anyone growing food, herbs, or pollinator habitat in cities. Beginners welcome.',       'Food',      12400),
  ('Solar DIY',          'solar-diy',          'Practical solar for homes, vans, and off-grid builds. Share schematics, ask questions.',    'Energy',     8700),
  ('Ocean cleanup crew', 'ocean-cleanup-crew', 'Volunteers, researchers, and policy advocates working to reduce ocean plastic.',            'Ocean',      6200),
  ('Climate policy nerds','climate-policy',    'Deep dives into legislation, carbon markets, and advocacy.',                                'Policy',     4100),
  ('Zero-waste households','zero-waste',       'Practical tips for reducing household waste — from swaps to systems.',                      'Lifestyle',  9300),
  ('EV owners',          'ev-owners',          'Real talk about EV ownership: range, charging, costs, and the software that runs your car.','Transport',  7800)
on conflict (slug) do nothing;

insert into challenges (title, description, category, days, reward, participant_count) values
  ('Bike-to-work week',  'Commute by bike every day for a week.',      'Transport', 7,  '120 GP + Cyclist badge', 12400),
  ('30-day plastic free','Avoid single-use plastic for 30 days.',      'Waste',     30, '50 GP /wk · 2× streak',  38200),
  ('Meatless Monday',   'Skip meat every Monday for a month.',         'Food',      30, '60 GP',                   22100),
  ('Cold shower streak', 'Take a cold shower every day for 21 days.',  'Lifestyle', 21, '45 GP + Resilience badge', 9800)
on conflict do nothing;
