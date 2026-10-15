-- ============================================================
-- Migration 056: challenge rewards are paid, once, on completion
--
-- Until now `challenges.reward` was a sentence ("120 GP + Cyclist badge") that
-- nothing ever acted on. Finishing a challenge earned exactly what the daily
-- logs earned on their own, there are no badges, and there is no streak
-- multiplier. This makes the reward a number and pays it.
--
--  1. challenges.reward_points  — what completion pays, in Green Points.
--     challenges.required_logs  — how many distinct days must be logged inside
--                                 the window. NULL means every day (= days).
--                                 Meatless Monday is 30 days long but asks for
--                                 4 logs, which `days` alone can't express.
--  2. A browser can't set either. User submissions arrive as pending with
--     reward_points 0; an admin sets the figure on approval, through
--     /api/admin/challenges (service role).
--  3. challenge_completions — one row per person per challenge, ever. It
--     survives leaving, so leave-and-rejoin can't earn the reward twice.
--  4. claim_challenge_rewards() — checks the caller's joined challenges and
--     pays any that are complete. It counts the caller's own impact_logs for
--     the challenge (action = title) on distinct local days within
--     [joined_at, joined_at + days). The payout is an ordinary impact_logs row,
--     so the existing insert trigger adds it to impact_score like every other
--     point, and it shows in the person's history with a clear name.
--
-- Safe to re-run.
-- ============================================================


-- ── 1. The reward as a number ───────────────────────────────

alter table public.challenges add column if not exists reward_points int not null default 0;
alter table public.challenges add column if not exists required_logs int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'challenges_reward_points_bounds') then
    alter table public.challenges
      add constraint challenges_reward_points_bounds check (reward_points >= 0 and reward_points <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'challenges_required_logs_bounds') then
    alter table public.challenges
      add constraint challenges_required_logs_bounds check (required_logs is null or (required_logs >= 1 and required_logs <= days));
  end if;
end $$;

-- Backfill from the old text. "120 GP + Cyclist badge" → 120; anything that
-- doesn't start with a number stays 0 for an admin to set.
update public.challenges
   set reward_points = least(2000, (substring(reward from '^\s*(\d+)\s*GP'))::int)
 where reward_points = 0
   and reward ~ '^\s*\d+\s*GP';

-- The three challenges 001 seeded. Their text promised things that don't
-- exist (a badge, a 2× streak); the number is what's kept.
update public.challenges set reward_points = 120, reward = '120 GP'
 where title = 'Bike-to-work week' and reward = '120 GP + Cyclist badge';
-- "50 GP /wk" over 30 days, paid as one lump at the end.
update public.challenges set reward_points = 200, reward = '200 GP'
 where title = '30-day plastic free' and reward = '50 GP /wk · 2× streak';
-- One log per Monday, four Mondays.
update public.challenges set required_logs = 4
 where title = 'Meatless Monday' and required_logs is null and days >= 28;


-- ── 2. Only the server sets a reward ────────────────────────

create or replace function public.guard_challenge_reward()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.reward_points := 0;
      new.required_logs := null;
    else
      new.reward_points := old.reward_points;
      new.required_logs := old.required_logs;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists challenges_guard_reward on public.challenges;
create trigger challenges_guard_reward
  before insert or update on public.challenges
  for each row execute function public.guard_challenge_reward();

revoke all on function public.guard_challenge_reward() from public, anon, authenticated;


-- ── 3. Completions ──────────────────────────────────────────

create table if not exists public.challenge_completions (
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  points        int not null default 0,
  impact_log_id uuid references public.impact_logs(id) on delete set null,
  primary key (challenge_id, user_id)
);

alter table public.challenge_completions enable row level security;

-- Read-only from the browser. Rows are written only by the function below.
drop policy if exists "challenge_completions: public read" on public.challenge_completions;
create policy "challenge_completions: public read"
  on public.challenge_completions for select using (true);


-- ── 4. The payout ───────────────────────────────────────────

create or replace function public.claim_challenge_rewards()
returns table (challenge_id uuid, title text, points int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  uid   uuid := auth.uid();
  tz    text;
  r     record;
  done  int;
  logid uuid;
begin
  if uid is null then
    return;
  end if;
  -- A suspended or banned account keeps what it had but earns nothing new,
  -- matching what 041 does to its writes.
  if public.is_frozen(uid) then
    return;
  end if;

  -- The user's calendar, as the streak uses it. An unknown zone name would
  -- make `at time zone` throw, so it falls back to UTC instead.
  select p.timezone into tz from public.profiles p where p.id = uid;
  if tz is null or not exists (select 1 from pg_timezone_names where name = tz) then
    tz := 'UTC';
  end if;

  for r in
    select c.id, c.title, c.days, c.reward_points,
           coalesce(c.required_logs, c.days) as need, cp.joined_at
      from public.challenge_participants cp
      join public.challenges c on c.id = cp.challenge_id
     where cp.user_id = uid
       and c.status = 'active'
       and not exists (
         select 1 from public.challenge_completions cc
          where cc.challenge_id = c.id and cc.user_id = uid
       )
  loop
    select count(distinct (l.logged_at at time zone tz)::date) into done
      from public.impact_logs l
     where l.user_id = uid
       and l.action = r.title
       and l.logged_at >= r.joined_at
       and l.logged_at <  r.joined_at + make_interval(days => r.days)
       -- logged_at is client-settable; a log dated ahead doesn't count yet.
       and l.logged_at <= now();

    if done < r.need then
      continue;
    end if;

    -- Claim the completion first. If two tabs race, only one insert lands
    -- and only that one pays.
    insert into public.challenge_completions (challenge_id, user_id, points)
    values (r.id, uid, r.reward_points)
    on conflict do nothing;
    if not found then
      continue;
    end if;

    if r.reward_points > 0 then
      insert into public.impact_logs (user_id, action, category, co2_saved_kg, points, status)
      values (uid, 'Completed challenge: ' || r.title, 'Challenge', 0, r.reward_points, 'unverified')
      returning id into logid;

      update public.challenge_completions
         set impact_log_id = logid
       where challenge_completions.challenge_id = r.id
         and challenge_completions.user_id = uid;
    end if;

    challenge_id := r.id;
    title        := r.title;
    points       := r.reward_points;
    return next;
  end loop;
end $$;

revoke all on function public.claim_challenge_rewards() from public, anon;
grant execute on function public.claim_challenge_rewards() to authenticated;
