-- ============================================================
-- Migration 036: an owner may edit their profile, not their standing
--
-- schema.sql:180 grants the update:
--
--   create policy "profiles_owner_update" on public.profiles
--     for update using (auth.uid() = id);
--
-- With no WITH CHECK, Postgres reuses the USING expression as the check. That
-- is worth being precise about, because it reads like a hole and isn't the one
-- that matters: the reused expression does stop a row being handed to another
-- account, so ownership is safe. What neither clause can express is *which
-- columns* the owner may touch — RLS decides rows, never fields. So the policy
-- is doing its whole job correctly and the account still ends up able to PATCH
-- itself verified. Writing the WITH CHECK out by hand (§1) changes nothing; it
-- is there so the next person to read that line doesn't have to work out what
-- the omission meant.
--
-- 030 already faced this and answered it with a BEFORE UPDATE trigger that
-- resets `verified`, `verified_at` and `role` for browser roles. That is the
-- right mechanism and this keeps it. The problem is the shape of the list:
-- profiles has 22 columns, 030 named 3, and `impact_score`, `green_points`,
-- `co2_avoided_kg` and `total_co2_kg` — the numbers the leaderboard and the
-- impact panels are built on — were never in it. A deny-list protects exactly
-- what someone remembered on the day they wrote it, and the next trust-bearing
-- column arrives unprotected and silent.
--
-- §2 turns it around: name the fields a person may edit, and let everything
-- else keep its stored value. A column added later is covered before it exists.
-- The cost is that a genuinely user-editable column added later won't save
-- until it is added to the list — a bug you find the first time you test the
-- feature, rather than one you find in a security review.
--
-- Why not column GRANTs (the other usual answer): a revoked column makes
-- PostgREST reject the whole PATCH, including when the value being sent is the
-- one already stored. Clients here send object literals — modals.tsx builds
-- `updates` field by field, but lib/profile.ts spreads whatever it is handed —
-- so that failure surfaces as profile edits breaking for reasons the error
-- message doesn't explain. And GRANTs would sit alongside 030's trigger rather
-- than replacing it, leaving two mechanisms to keep in agreement.
--
-- §3 is the part this migration would be dishonest without; its reasoning is
-- at the section itself.
--
-- Not addressed here, deliberately: `impact_logs` accepts any `co2_saved_kg`
-- and any `points` its owner sends (018's insert policy checks only
-- `auth.uid() = user_id`), and those still accumulate into impact_score and
-- total_co2_kg through the trigger in §3. After this migration those numbers
-- are no longer reachable by PATCHing profiles, but they are still inflatable
-- by logging a fictional action. Fixing that needs a bound on what a single
-- log may claim, which is a product decision, not a schema one.
--
-- Safe to re-run.
-- ============================================================


-- ── 1. The policy, with nothing left implied ────────────────

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles
  for update
  using      (auth.uid() = id)
  with check (auth.uid() = id);


-- ── 2. Owners may write the presentational fields, and those only ──

-- Still SECURITY INVOKER, for the reason 030 gives: the check below reads the
-- role the statement is actually running as, and a definer function would
-- report its own owner instead. anon and authenticated are the two roles a
-- browser can reach PostgREST as; service_role (the admin routes) and postgres
-- (the SQL editor, and anything running inside a SECURITY DEFINER function)
-- fall through untouched.
--
-- search_path is pinned to match 031 — CREATE OR REPLACE resets a function's
-- configuration, so leaving it off here would quietly undo that migration's fix
-- and put this function back on the linter's list.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  -- Everything a person may change about their own profile.
  --
  -- ADDING A COLUMN TO profiles THAT USERS EDIT MEANS ADDING IT HERE. Until it
  -- is listed, writes to it from the browser are discarded without an error —
  -- the field simply doesn't save.
  --
  -- Not listed, and each for its own reason:
  --   verified, verified_at   granted only by /api/admin/verification, after a
  --                           human reads the application queue 030 created
  --   role                    admin access control (011)
  --   impact_score, green_points, co2_avoided_kg, total_co2_kg
  --                           written by the impact trigger in §3, never by a
  --                           client claiming a total
  --   id, created_at          identity; the policy above already pins id, this
  --                           makes it true regardless of what the policy says
  --
  -- updated_at IS listed: lib/profile.ts sets it on every write and nothing
  -- else maintains it, so dropping it would freeze the column. A client
  -- misreporting when it edited its own bio costs nothing.
  editable constant text[] := array[
    'full_name', 'handle', 'bio', 'avatar_url', 'cover_url', 'location',
    'website', 'dob', 'interests', 'marketing_emails', 'timezone',
    'onboarding_complete', 'updated_at'
  ];
  patch jsonb;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Keep only the editable keys out of the incoming row, then lay them over
  -- the stored one. Every other column comes back from OLD by construction,
  -- which is what makes this hold for columns that don't exist yet.
  select jsonb_object_agg(key, value)
    into patch
    from jsonb_each(to_jsonb(new))
   where key = any (editable);

  -- coalesce, not because the aggregate can be empty in practice — to_jsonb
  -- always yields every column — but because a null patch would produce a null
  -- record, and a BEFORE trigger returning null cancels the update outright.
  -- A silently dropped write is a worse failure than anything this prevents.
  new := jsonb_populate_record(
           null::public.profiles,
           to_jsonb(old) || coalesce(patch, '{}'::jsonb)
         );

  return new;
end $$;

-- Explicit rather than inherited: jsonb_populate_record is pinned to
-- public.profiles rather than being handed OLD directly, because the function's
-- return type is polymorphic and plpgsql only knows a trigger's rowtype at run
-- time. `null::public.profiles` settles it at parse time; `to_jsonb(old)`
-- carries the values.

-- Unchanged from 030, restated because the trigger is what actually installs
-- the function. The name still has to sort before profiles_stamp_verified_at
-- so a reverted `verified` never gets stamped with a date — and now it has to
-- sort before *every* BEFORE UPDATE trigger on this table, because rebuilding
-- NEW from OLD discards whatever an earlier one had already changed. Postgres
-- fires them in name order, so a new trigger here needs a name that sorts after
-- "profiles_guard_privileges".
drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();


-- ── 3. The badge is not an achievement ──────────────────────
--
-- Everything above is decorative without this. 002's impact trigger contains:
--
--   verified = case when total_co2_kg + coalesce(NEW.co2_saved_kg, 0) >= 500
--                   then true else verified end
--
-- and it is SECURITY DEFINER, so it runs as its owner and the guard in §2 sees
-- `postgres`, not `authenticated`, and lets it through — correctly, since the
-- guard's job is to distinguish a browser from the server. The result is that
-- an account cannot PATCH itself verified but can still insert one impact_logs
-- row claiming 500 kg and be verified a moment later, with no review and
-- nothing in the queue to show for it.
--
-- Removing the clause isn't a product change so much as finishing 030's. That
-- migration opens by saying the badge "stops being something an account can end
-- up with by accident", and built a review queue to make it true; this clause
-- is precisely that accident, written in 002 when the badge had no other
-- meaning. It has one now — MVerification in components/screens/modals.tsx
-- tells the reader "Honua confirmed this is a genuine account", which is a
-- claim about identity. A CO₂ total cannot support it. Those are two different
-- statements and one column was answering for both.
--
-- The accrual stays: impact_score and total_co2_kg still accumulate, so the
-- achievement is intact and everything reading those numbers is unaffected.
-- Only the badge grant is removed.
--
-- Existing badges are left alone. There is no way to tell which were reviewed
-- and which were awarded by this clause, and revoking one that was earned is
-- worse than leaving one that wasn't. Worth an eye over the accounts already
-- carrying it, though — anything with total_co2_kg >= 500 and no approved row
-- in verification_requests got there this way.
--
-- security definer is kept: profiles is not writable by the log's author, which
-- is the entire point of this migration. search_path pinned for the same reason
-- as §2.
create or replace function public.handle_impact_log_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set impact_score = impact_score + coalesce(new.points, 0),
      total_co2_kg = total_co2_kg + coalesce(new.co2_saved_kg, 0)
  where id = new.user_id;
  return new;
end $$;


-- ── 4. Neither function is callable by name ─────────────────
--
-- CREATE OR REPLACE preserves a function's ACL, so 031's revoke still stands
-- and these two lines are a no-op today. They are here so that stays true if
-- either function is ever dropped and recreated instead of replaced — the
-- default on a new function is EXECUTE to PUBLIC, and a SECURITY DEFINER
-- trigger function callable over PostgREST with a hand-built record is the
-- exact thing 031 was written to close.
revoke all on function public.guard_profile_privileges() from public, anon, authenticated;
revoke all on function public.handle_impact_log_insert() from public, anon, authenticated;
