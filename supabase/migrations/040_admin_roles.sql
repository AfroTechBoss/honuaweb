-- ============================================================
-- Migration 040: Admin roles that mean something
--
-- The console has had a Roles page since it shipped. It listed four people who
-- do not exist (chidi@honua.co, amara@honua.co, lena@honua.co, kwame@honua.co),
-- stored role changes in React state that a refresh threw away, and drew a
-- twelve-row permissions matrix that nothing anywhere consulted.
--
-- That last part is the reason this migration exists. A matrix saying "analyst:
-- no refunds" next to a refund endpoint that accepts any allowlisted token is
-- worse than having no matrix at all — it answers the question "can I safely
-- give this contractor console access?" with a confident lie.
--
-- Today the only gate is the Privy allowlist: hold a valid Privy token and you
-- can do everything the console can do. This table adds a second axis under it.
-- Privy still decides who gets in; this decides what they can touch once in.
--
-- Shape notes:
--
--   * Keyed on the Privy DID, not email. verifyPrivyToken() returns the `sub`
--     claim and nothing else — no email, and there is no PRIVY_APP_SECRET
--     configured to go ask Privy for one. The DID is the only identifier the
--     server can prove. Email is carried alongside as a display label supplied
--     by the client, which means it is self-asserted and must never be what a
--     permission check reads. Roles hang off privy_user_id for that reason.
--
--   * The roster fills itself. There is no invite flow, because there is no way
--     to add someone to the Privy allowlist from here — that is a dashboard
--     action. So instead of an invite list that drifts from reality, every
--     admin who signs in gets a row on first sight. The page then shows who
--     actually has access rather than who was once meant to.
--
--   * The first person to sign in becomes owner; everyone after defaults to
--     admin. Both are chosen to avoid a lockout. Seeding an empty table with
--     'owner' means the person applying this migration ends up owning it, and
--     defaulting later arrivals to 'admin' means nobody who could do a thing
--     yesterday is locked out of it today — 'admin' withholds exactly two
--     things, platform settings and role management, and those are precisely
--     the ones that should need an owner.
--
-- Sealed like 034/037: RLS on, zero policies, service-role only. The console
-- reads and writes it through /api/admin/members behind a verified Privy token.
-- ============================================================


create table if not exists public.admin_members (
  -- The Privy DID ("did:privy:cm..."). Primary key because it is the only
  -- thing about the caller the server can verify.
  privy_user_id text primary key,

  -- Display only. Sent by the console from the Privy session it already holds,
  -- so it is the caller's own claim about themselves. Nothing authorises off it.
  email         text,
  display_name  text,

  role          text        not null default 'admin'
                  check (role in ('owner', 'admin', 'moderator', 'analyst')),

  -- Set when the email matches a Honua account, so the roster can show a real
  -- face instead of an initial. Nullable: an admin need not be a Honua user.
  profile_id    uuid        references public.profiles(id) on delete set null,

  -- 'bootstrap' for the seeded owner, 'auto' for self-enrolment, otherwise the
  -- DID of the admin who last changed this row's role.
  added_by      text,

  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists admin_members_role_idx  on public.admin_members (role);
create index if not exists admin_members_seen_idx  on public.admin_members (last_seen_at desc);
create index if not exists admin_members_email_idx on public.admin_members (lower(email)) where email is not null;

alter table public.admin_members enable row level security;
-- No policies. Same posture as support_tickets and error_log: the browser holds
-- no Supabase session in the console, so a policy here would protect nothing
-- and read as though it protected something.


-- ── Role change audit ───────────────────────────────────────
--
-- Separate from admin_activity (033) because this is the log you read when
-- something has gone wrong and the question is who granted whom what, and
-- when. It must not be interleaved with several thousand routine actions, and
-- it must survive the member row being deleted — which is exactly the event
-- worth having a record of. Hence no foreign key to admin_members.
create table if not exists public.admin_role_changes (
  id         uuid        primary key default gen_random_uuid(),
  member_id  text        not null,
  member_email text,
  from_role  text,
  to_role    text        not null,
  changed_by text        not null,
  reason     text,
  changed_at timestamptz not null default now()
);

create index if not exists admin_role_changes_member_idx on public.admin_role_changes (member_id, changed_at desc);
create index if not exists admin_role_changes_at_idx     on public.admin_role_changes (changed_at desc);

alter table public.admin_role_changes enable row level security;


-- ── Enrolment ───────────────────────────────────────────────
--
-- Called on every admin page load. Upserts the caller, seeds the first one as
-- owner, and returns the row so the console knows its own role.
--
-- The advisory lock covers a genuine race: two admins opening the console for
-- the very first time in the same instant would both see an empty table and
-- both be seeded as owner. It is a narrow window and a once-in-a-lifetime one,
-- which is precisely the kind that gets discovered in production instead.
create or replace function public.admin_enrol(
  p_did   text,
  p_email text default null,
  p_name  text default null
)
returns public.admin_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m       public.admin_members;
  is_first boolean;
  pid     uuid;
begin
  if p_did is null or length(trim(p_did)) = 0 then
    raise exception 'admin_enrol: missing privy user id';
  end if;

  perform pg_advisory_xact_lock(hashtext('admin_members:seed'));

  select not exists (select 1 from public.admin_members) into is_first;

  -- Best-effort link to a Honua account for the avatar. profiles has no email
  -- column, so this goes through auth.users — readable here only because the
  -- function is SECURITY DEFINER.
  if nullif(trim(coalesce(p_email, '')), '') is not null then
    select u.id into pid
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
    limit 1;
  end if;

  insert into public.admin_members (privy_user_id, email, display_name, role, profile_id, added_by)
  values (
    trim(p_did),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_name, '')), ''),
    case when is_first then 'owner' else 'admin' end,
    pid,
    case when is_first then 'bootstrap' else 'auto' end
  )
  on conflict (privy_user_id) do update set
    -- Never overwrite a known label with a null one: a client that omits the
    -- email on one request must not erase what an earlier request recorded.
    email        = coalesce(nullif(trim(coalesce(excluded.email, '')), ''), public.admin_members.email),
    display_name = coalesce(nullif(trim(coalesce(excluded.display_name, '')), ''), public.admin_members.display_name),
    profile_id   = coalesce(excluded.profile_id, public.admin_members.profile_id),
    last_seen_at = now(),
    updated_at   = now()
    -- role is deliberately absent. Enrolment must never be a way to change one.
  returning * into m;

  return m;
end
$$;


-- ── Roster ──────────────────────────────────────────────────
--
-- The Roles page in one round trip, with the profile joined for the avatar.
create or replace function public.admin_member_list()
returns table (
  privy_user_id text,
  email         text,
  display_name  text,
  role          text,
  profile_id    uuid,
  handle        text,
  full_name     text,
  avatar_url    text,
  added_by      text,
  first_seen_at timestamptz,
  last_seen_at  timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    m.privy_user_id, m.email, m.display_name, m.role, m.profile_id,
    p.handle, p.full_name, p.avatar_url,
    m.added_by, m.first_seen_at, m.last_seen_at
  from public.admin_members m
  left join public.profiles p on p.id = m.profile_id
  order by
    case m.role when 'owner' then 0 when 'admin' then 1 when 'moderator' then 2 else 3 end,
    m.first_seen_at;
$$;


-- ── Role assignment ─────────────────────────────────────────
--
-- One function rather than an UPDATE from the route, because three invariants
-- have to hold together and a check-then-write from Node cannot hold any of
-- them against a concurrent second admin:
--
--   1. The last owner cannot be demoted. Otherwise the platform reaches a state
--      where nobody can assign roles or change settings, and the only repair is
--      a hand-written UPDATE in the SQL editor.
--   2. Nobody can change their own role. Self-promotion is the whole attack.
--   3. Only an owner may create or demote an owner; an admin is limited to the
--      two junior roles. Enforced here as well as in the route so it holds even
--      if a future caller forgets.
--
-- Returns the updated row. Raises with a readable message otherwise — the route
-- maps these onto 400/403.
create or replace function public.admin_set_role(
  p_actor  text,
  p_target text,
  p_role   text,
  p_reason text default null
)
returns public.admin_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  target      public.admin_members;
  was_role    text;
  owner_count int;
begin
  if p_role not in ('owner', 'admin', 'moderator', 'analyst') then
    raise exception 'unknown role %', p_role using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('admin_members:roles'));

  select role into actor_role from public.admin_members where privy_user_id = p_actor;
  if actor_role is null then
    raise exception 'actor is not an admin member' using errcode = '42501';
  end if;

  select * into target from public.admin_members where privy_user_id = p_target;
  if target.privy_user_id is null then
    raise exception 'no such member' using errcode = 'P0002';
  end if;

  if p_actor = p_target then
    raise exception 'you cannot change your own role' using errcode = '42501';
  end if;

  if actor_role = 'admin' and (p_role in ('owner', 'admin') or target.role in ('owner', 'admin')) then
    raise exception 'admins may only assign moderator or analyst' using errcode = '42501';
  end if;

  if actor_role not in ('owner', 'admin') then
    raise exception 'your role cannot assign roles' using errcode = '42501';
  end if;

  if target.role = 'owner' and p_role <> 'owner' then
    select count(*) into owner_count from public.admin_members where role = 'owner';
    if owner_count <= 1 then
      raise exception 'this is the last owner' using errcode = '23514';
    end if;
  end if;

  if target.role = p_role then
    return target;
  end if;

  -- Captured before the UPDATE overwrites `target` with the new row.
  was_role := target.role;

  update public.admin_members
     set role = p_role, added_by = p_actor, updated_at = now()
   where privy_user_id = p_target
  returning * into target;

  insert into public.admin_role_changes (member_id, member_email, from_role, to_role, changed_by, reason)
  values (p_target, target.email, was_role, p_role, p_actor, nullif(trim(coalesce(p_reason, '')), ''));

  return target;
end
$$;


-- ── Removal ─────────────────────────────────────────────────
--
-- Deleting the row does not revoke console access — the Privy allowlist does
-- that, and it is not reachable from here. What removal means is "this person
-- is no longer staff": their row goes, and if they sign in again they re-enrol
-- from scratch at the default role rather than keeping whatever they had.
--
-- The route says as much in the confirm dialog. Recording it as a role change
-- to 'removed' keeps the audit trail honest about what happened.
create or replace function public.admin_remove_member(
  p_actor  text,
  p_target text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  target      public.admin_members;
  owner_count int;
begin
  perform pg_advisory_xact_lock(hashtext('admin_members:roles'));

  select role into actor_role from public.admin_members where privy_user_id = p_actor;
  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'your role cannot remove members' using errcode = '42501';
  end if;

  select * into target from public.admin_members where privy_user_id = p_target;
  if target.privy_user_id is null then
    return false;
  end if;

  if p_actor = p_target then
    raise exception 'you cannot remove yourself' using errcode = '42501';
  end if;

  if actor_role = 'admin' and target.role in ('owner', 'admin') then
    raise exception 'admins may only remove moderators and analysts' using errcode = '42501';
  end if;

  if target.role = 'owner' then
    select count(*) into owner_count from public.admin_members where role = 'owner';
    if owner_count <= 1 then
      raise exception 'this is the last owner' using errcode = '23514';
    end if;
  end if;

  insert into public.admin_role_changes (member_id, member_email, from_role, to_role, changed_by, reason)
  values (p_target, target.email, target.role, 'removed', p_actor, 'member removed from the console roster');

  delete from public.admin_members where privy_user_id = p_target;
  return true;
end
$$;


-- ── Only the server may call any of it ──────────────────────
--
-- SECURITY DEFINER grants EXECUTE to PUBLIC by default. Without these revokes
-- the anon key could enrol itself as owner of an empty table.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.admin_enrol(text, text, text)',
    'public.admin_member_list()',
    'public.admin_set_role(text, text, text, text)',
    'public.admin_remove_member(text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
