-- ============================================================
-- Migration 041: Suspensions and bans that actually stop someone
--
-- The console has had Suspend and Ban buttons since it shipped. Pressing one
-- called setUsers(...) and nothing else: the badge turned orange, an audit line
-- appeared, and a refresh put the account straight back to active. There was no
-- column to persist to — `profiles` had no suspension state of any kind — so
-- the suspended user was never told, never blocked, and never actually
-- suspended. The Roles page listed "Temporary suspension" as a moderator
-- capability, which made it the second confident lie in the same console.
--
-- Adding a column would fix the amnesia and none of the rest. A `suspended`
-- flag that no policy reads is not a suspension, it is a note. Anyone holding a
-- valid JWT can talk to PostgREST directly without going near our UI, so the
-- only place a suspension can be made true is the database.
--
-- Hence the shape below:
--
--   * State lives on profiles, because every policy that needs to consult it
--     already has the actor's id from auth.uid() and a primary-key lookup is
--     the cheapest question we can ask.
--
--   * Enforcement is a set of RESTRICTIVE policies. That word is doing real
--     work. Postgres ORs permissive policies together, so adding one more
--     permissive policy could only ever grant access — a "not suspended" rule
--     written permissively would be satisfied by any other policy that already
--     passes, and would block nobody. Restrictive policies AND with everything
--     else, so this holds regardless of what the table already allows.
--
--     It also means we do not have to read, understand, or edit the existing
--     policies. `posts` and `comments` predate this migrations folder and their
--     rules live only in the dashboard; a restrictive policy layers on top
--     without touching them, which is the only safe way to do this blind.
--
--   * The check is on auth.uid() — the actor — never on the row's owner column.
--     A frozen account cannot write; everyone else's ability to write about
--     them, including replying to their posts, is untouched. It also means the
--     policy body is identical for all 28 tables and needs no knowledge of each
--     table's shape, which is why it can be a loop instead of 84 statements.
--
--   * SELECT is never restricted. A suspended user can still sign in and read.
--     That is deliberate: they need to be able to see the notice explaining
--     what happened and when it lifts, and locking someone out of their own
--     account entirely is what a ban is for.
--
-- Scope was chosen by the platform owner: a suspension freezes everything
-- except reading, including buying and listing. A suspended seller's existing
-- listings stay live and their in-flight orders still fulfil — those are other
-- people's purchases, and cancelling them would punish the wrong party.
--
-- service_role bypasses RLS entirely, so every admin route is unaffected by all
-- of this, and the Stripe webhook keeps working on a frozen buyer's order.
-- ============================================================


-- ── 1. State ────────────────────────────────────────────────────────────────
--
-- Two independent facts, not one status enum. A ban is not "a suspension with a
-- longer timer" — it is a different decision with a different authority behind
-- it (users.ban sits with owner and admin; users.suspend reaches down to
-- moderator). Keeping them separate means lifting a suspension cannot silently
-- lift a ban, and the audit trail reads correctly either way.

alter table public.profiles
  add column if not exists suspended_until  timestamptz,
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists suspended_by     text,
  add column if not exists banned_at        timestamptz,
  add column if not exists banned_reason    text,
  add column if not exists banned_by        text;

comment on column public.profiles.suspended_until is
  'When the suspension lifts. Past or null means not suspended — expiry needs no job to run.';
comment on column public.profiles.banned_by is
  'Privy DID of the admin who acted. Not a uuid: the console authenticates with Privy, so auth.uid() is null there.';

-- Partial: the overwhelming majority of rows are null in both columns and never
-- need to be visited.
create index if not exists profiles_frozen_idx
  on public.profiles (id)
  where suspended_until is not null or banned_at is not null;


-- ── 2. The question every policy asks ───────────────────────────────────────
--
-- security definer so it can read profiles from inside a policy on another
-- table without that read being subject to profiles' own RLS (which would
-- recurse). stable so Postgres evaluates it once per statement rather than once
-- per row — the difference between one index hit and one per inserted row.

create or replace function public.is_frozen(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user
      and (
        banned_at is not null
        or (suspended_until is not null and suspended_until > now())
      )
  );
$$;

comment on function public.is_frozen(uuid) is
  'True while the account is banned or inside an unexpired suspension. Null input returns false, so anonymous writers are unaffected and their own policies still govern them.';

revoke all on function public.is_frozen(uuid) from public;
grant execute on function public.is_frozen(uuid) to authenticated, anon, service_role;


-- ── 3. Enforcement ──────────────────────────────────────────────────────────
--
-- Three policies per table rather than one FOR ALL. A restrictive FOR ALL
-- policy applies its USING clause to SELECT too, which would stop a suspended
-- user reading — the one thing this is not supposed to do.
--
--   insert → WITH CHECK   (may they create this row)
--   update → USING + WITH CHECK   (may they touch this row, and the result)
--   delete → USING        (may they remove this row)
--
-- Not in the list, deliberately:
--
--   blocked_users, muted_users — self-protection. Someone who has been
--     suspended for a fight may still be receiving harassment, and taking away
--     their block button while they serve the timeout would be indefensible.
--   notifications, achievements, analytics_events, impact_streak_notices,
--     handle_history — written by triggers and service-role routes, never by a
--     user acting directly.
--   admin_*, error_log, support_tickets — sealed already, service-role only.
--     A frozen user can still open a support ticket through /support, which is
--     how they appeal; that route runs server-side.

do $$
declare
  t text;
  v_rls boolean;
  v_policies int;
  inert text[] := '{}';
  frozen_tables text[] := array[
    -- social
    'posts', 'comments', 'stories', 'story_likes', 'post_likes', 'post_reposts',
    'follows', 'bookmarks', 'collections',
    -- messaging
    'conversations', 'messages',
    -- communities & challenges
    'communities', 'community_members', 'community_reports',
    'challenges', 'challenge_participants',
    -- marketplace
    'products', 'product_reviews', 'orders', 'order_items',
    'carbon_purchases', 'payout_requests',
    -- impact & projects
    'impact_logs', 'impact_vouches', 'projects', 'project_rsvps',
    -- applications
    'seller_applications', 'verification_requests'
  ];
begin
  foreach t in array frozen_tables loop
    -- Skip anything not present rather than failing the whole migration. The
    -- list spans features added over many months and this file should stay
    -- applicable to a database missing one of them.
    if to_regclass('public.' || t) is null then
      raise notice 'skipping %: table not found', t;
      continue;
    end if;

    execute format('drop policy if exists "frozen accounts cannot insert" on public.%I', t);
    execute format('drop policy if exists "frozen accounts cannot update" on public.%I', t);
    execute format('drop policy if exists "frozen accounts cannot delete" on public.%I', t);

    execute format($f$
      create policy "frozen accounts cannot insert" on public.%I
        as restrictive for insert to authenticated
        with check (not public.is_frozen(auth.uid()))
    $f$, t);

    execute format($f$
      create policy "frozen accounts cannot update" on public.%I
        as restrictive for update to authenticated
        using (not public.is_frozen(auth.uid()))
        with check (not public.is_frozen(auth.uid()))
    $f$, t);

    execute format($f$
      create policy "frozen accounts cannot delete" on public.%I
        as restrictive for delete to authenticated
        using (not public.is_frozen(auth.uid()))
    $f$, t);

    -- A restrictive policy on a table with RLS switched off does nothing at
    -- all, so the state has to be checked rather than assumed. But switching
    -- RLS on is not a safe blind fix either: on a table with no permissive
    -- policies it denies everything, SELECT included, and the feature goes dark
    -- with no error that points here. So:
    --
    --   RLS on                    → nothing to do.
    --   RLS off, has policies     → someone wrote rules that were never in
    --                               force. Turn it on; those rules take effect
    --                               and reads keep working.
    --   RLS off, no policies      → the table is deliberately or accidentally
    --                               wide open. Report it and leave it. Turning
    --                               it on here would break the app, and doing
    --                               that inside a migration about suspensions
    --                               would be an unpleasant way to find out.
    select c.relrowsecurity into v_rls
      from pg_class c where c.oid = to_regclass('public.' || t);
    select count(*) into v_policies
      from pg_policies p where p.schemaname = 'public' and p.tablename = t;

    if not v_rls then
      if v_policies > 3 then   -- the three just created don't count
        execute format('alter table public.%I enable row level security', t);
        raise notice '% had policies but RLS was off — enabled it', t;
      else
        inert := inert || t;
      end if;
    end if;
  end loop;

  if array_length(inert, 1) > 0 then
    raise warning
      'RLS is OFF and unpoliced on: %. The freeze policies exist there but cannot bite, and those tables are writable by anyone with the anon key regardless of this migration. Worth fixing, separately.',
      array_to_string(inert, ', ');
  end if;
end $$;


-- profiles is handled on its own, and not through is_frozen().
--
-- Calling a function that reads profiles from inside a policy on profiles is
-- the one place that shape could bite: it only avoids recursion because
-- SECURITY DEFINER makes the read run as the table owner, and betting the
-- ability to edit any profile on that holding is a poor trade when the
-- condition can simply be written inline. The row being updated is the actor's
-- own — profiles_owner_update (036 §1) already pins auth.uid() = id — so the
-- columns are right there.
--
-- The reason profiles is frozen at all: a display name is public text. Someone
-- serving a suspension for harassment should not be able to keep writing to
-- the one field of theirs that everyone can still see.
--
-- Note this is belt and braces on one specific point — clearing your own
-- suspension was never possible. 036 §2 rebuilds the row from an allow-list of
-- editable columns, and suspended_until was not on a list written before it
-- existed, so a browser PATCH of it is discarded silently by construction.
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'profiles is missing';
  end if;

  drop policy if exists "frozen accounts cannot update" on public.profiles;
  create policy "frozen accounts cannot update" on public.profiles
    as restrictive for update to authenticated
    using (
      banned_at is null
      and (suspended_until is null or suspended_until <= now())
    )
    with check (
      banned_at is null
      and (suspended_until is null or suspended_until <= now())
    );
end $$;


-- ── 4. The record ───────────────────────────────────────────────────────────
--
-- Separate from admin_audit_log, which is the console's activity feed and gets
-- trimmed and read casually. This is the answer to "why is this account
-- suspended, who decided, and on what grounds" months later, so it keeps its
-- own table and no FK to profiles: the record must outlive a deleted account.

create table if not exists public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  target_id    uuid not null,
  target_handle text,
  action       text not null check (action in ('suspend', 'ban', 'reinstate')),
  until        timestamptz,
  reason       text,
  -- Privy DID. See the note on profiles.banned_by.
  acted_by     text not null,
  acted_at     timestamptz not null default now()
);

create index if not exists moderation_actions_target_idx on public.moderation_actions (target_id, acted_at desc);
create index if not exists moderation_actions_recent_idx on public.moderation_actions (acted_at desc);

alter table public.moderation_actions enable row level security;
-- No policies: sealed. Reachable only through the service-role routes.


-- ── 5. The admin entry points ───────────────────────────────────────────────
--
-- Dropped before they are created, because `create or replace function` cannot
-- do the two things re-running this file needs. It refuses outright to change
-- the return type of an existing function ("cannot change return type of
-- existing function"), which is what happens the moment a column is added to
-- one of the RETURNS TABLE lists below. And when the *arguments* differ it does
-- not replace at all — it defines a second overload alongside the first, so an
-- older signature would linger with its grants intact and PostgREST would be
-- free to resolve a call to it.
--
-- Neither is hypothetical: this file was applied once from an earlier draft, and
-- both the roster's columns and two of the argument lists have changed since.
-- Dropping by oid::regprocedure handles every overload without this migration
-- having to know which draft it is replacing.
--
-- is_frozen is deliberately not in the list. Eighty-four policies depend on it,
-- so the drop would be refused; its signature has not changed, and `create or
-- replace` above is enough.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'admin_set_account_status',
         'admin_member_roster',
         'admin_community_reports',
         'admin_resolve_report'
       )
  loop
    execute format('drop function if exists %s', fn.sig);
    raise notice 'dropped previous %', fn.sig;
  end loop;
end $$;

create or replace function public.admin_set_account_status(
  p_actor  text,
  p_label  text,
  p_target uuid,
  p_action text,
  p_days   int  default null,
  p_reason text default null
)
returns table (
  id              uuid,
  handle          text,
  suspended_until timestamptz,
  banned_at       timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
-- The RETURNS TABLE names above are also plpgsql variables in here, and three
-- of them (id, suspended_until, banned_at) are column names this body reads.
-- Without this the ambiguity is resolved in favour of the variable, and the
-- final SELECT would return four nulls.
#variable_conflict use_column
declare
  v_until  timestamptz;
  v_handle text;
begin
  if p_action not in ('suspend', 'ban', 'reinstate') then
    raise exception 'Unknown action: %', p_action using errcode = '22023';
  end if;

  select p.handle into v_handle from public.profiles p where p.id = p_target;
  if not found then
    raise exception 'No such account' using errcode = 'P0002';
  end if;

  -- A console member cannot be frozen through the console. Without this a
  -- moderator could suspend the owner's own account and, since the freeze bites
  -- at the database, there would be no in-product way to undo it. Console
  -- access is removed on the Roles page; this is the customer account.
  if exists (
    select 1 from public.admin_members m
    where m.profile_id = p_target
  ) then
    raise exception 'That account belongs to a console member. Remove their role on the Roles page first.'
      using errcode = '42501';
  end if;

  if p_action = 'suspend' then
    -- Default matches the console's own copy. Bounded at a year: past that the
    -- honest word is ban, and an accidental 9999-day suspension should not be
    -- indistinguishable from one.
    if coalesce(p_days, 7) < 1 or coalesce(p_days, 7) > 365 then
      raise exception 'Suspension length must be between 1 and 365 days' using errcode = '23514';
    end if;
    v_until := now() + make_interval(days => coalesce(p_days, 7));

    update public.profiles p set
      suspended_until  = v_until,
      suspended_at     = now(),
      suspended_reason = nullif(trim(coalesce(p_reason, '')), ''),
      suspended_by     = p_actor
    where p.id = p_target;

  elsif p_action = 'ban' then
    update public.profiles p set
      banned_at     = now(),
      banned_reason = nullif(trim(coalesce(p_reason, '')), ''),
      banned_by     = p_actor
    where p.id = p_target;

  else
    -- Reinstate clears both. Someone who is banned *and* suspended and gets
    -- reinstated expects to be able to use their account, not to discover a
    -- second lock behind the first.
    update public.profiles p set
      suspended_until  = null,
      suspended_at     = null,
      suspended_reason = null,
      suspended_by     = null,
      banned_at        = null,
      banned_reason    = null,
      banned_by        = null
    where p.id = p_target;
  end if;

  insert into public.moderation_actions (target_id, target_handle, action, until, reason, acted_by)
  values (p_target, v_handle, p_action, v_until, nullif(trim(coalesce(p_reason, '')), ''), p_actor);

  -- Also to the console's own feed, in the same transaction as the change. A
  -- suspension that lands but whose audit line fails to POST separately is how
  -- the log stops being the record of what happened.
  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind)
  values (
    p_actor,
    coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    case p_action
      when 'suspend'   then 'suspended account'
      when 'ban'       then 'banned account'
      else                  'reinstated account'
    end,
    '@' || coalesce(v_handle, 'unknown'),
    case when p_action = 'reinstate' then 'check' else 'lock' end
  );

  return query
    select p.id, p.handle, p.suspended_until, p.banned_at
    from public.profiles p
    where p.id = p_target;
end $$;


-- The Users screen's roster. Reads through the service role, so it sees every
-- member rather than the subset a browser's RLS would allow.
--
-- report_count is reports filed *against* the person — the reported comment is
-- theirs — not reports they filed. The screen colours that number red and
-- filters on it under "Has reports", both of which only make sense pointing at
-- the reported. Community-level reports are excluded: they are against a space,
-- and holding its owner personally accountable for one is a different judgement
-- than this number implies.
create or replace function public.admin_member_roster(p_limit int default 200)
returns table (
  id               uuid,
  handle           text,
  full_name        text,
  avatar_url       text,
  location         text,
  role             text,
  impact_score     int,
  created_at       timestamptz,
  suspended_until  timestamptz,
  suspended_at     timestamptz,
  suspended_reason text,
  banned_at        timestamptz,
  banned_reason    text,
  report_count     bigint,
  post_count       bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id, p.handle, p.full_name, p.avatar_url, p.location, p.role,
    p.impact_score, p.created_at,
    p.suspended_until, p.suspended_at, p.suspended_reason,
    p.banned_at, p.banned_reason,
    (select count(*)
       from public.community_reports cr
       join public.comments cm on cm.id = cr.comment_id
      where cm.user_id = p.id) as report_count,
    (select count(*) from public.posts po where po.user_id = p.id) as post_count
  from public.profiles p
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;


-- The moderation queue, with the reported thing resolved into readable text.
-- Doing this here rather than through PostgREST's embedding syntax means the
-- route stays a thin pass-through and the joins are visible in one place.
create or replace function public.admin_community_reports(p_status text default null, p_limit int default 200)
returns table (
  id               uuid,
  type             text,
  reason           text,
  note             text,
  status           text,
  community_id     uuid,
  community_name   text,
  comment_id       uuid,
  comment_body     text,
  comment_author   text,
  reporter_id      uuid,
  reporter_handle  text,
  reporter_name    text,
  reporter_avatar  text,
  owner_action     text,
  owner_note       text,
  owner_actioned_at timestamptz,
  admin_note       text,
  admin_actioned_at timestamptz,
  created_at       timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    cr.id, cr.type, cr.reason, cr.note, cr.status,
    cr.community_id, c.name as community_name,
    cr.comment_id, cm.content as comment_body, ca.handle as comment_author,
    cr.reporter_id, rp.handle as reporter_handle, rp.full_name as reporter_name, rp.avatar_url as reporter_avatar,
    cr.owner_action, cr.owner_note, cr.owner_actioned_at,
    cr.admin_note, cr.admin_actioned_at, cr.created_at
  from public.community_reports cr
  left join public.communities c  on c.id  = cr.community_id
  left join public.comments     cm on cm.id = cr.comment_id
  left join public.profiles     ca on ca.id = cm.user_id
  left join public.profiles     rp on rp.id = cr.reporter_id
  where p_status is null or p_status = 'all' or cr.status = p_status
  order by cr.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;


create or replace function public.admin_resolve_report(
  p_actor  text,
  p_label  text,
  p_report uuid,
  p_status text,
  p_note   text default null
)
returns public.community_reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
-- `row` would be the obvious name and is a reserved word.
declare
  rec public.community_reports;
begin
  if p_status not in ('pending', 'owner_actioned', 'escalated', 'admin_resolved', 'dismissed') then
    raise exception 'Unknown status: %', p_status using errcode = '22023';
  end if;

  update public.community_reports cr set
    status            = p_status,
    admin_note        = coalesce(nullif(trim(coalesce(p_note, '')), ''), cr.admin_note),
    admin_actioned_at = now()
  where cr.id = p_report
  returning * into rec;

  if not found then
    raise exception 'No such report' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind)
  values (
    p_actor,
    coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    case p_status when 'dismissed' then 'dismissed report' else 'resolved report' end,
    coalesce(rec.reason, 'report'),
    case p_status when 'dismissed' then 'close' else 'check' end
  );

  return rec;
end $$;


-- Same posture as 040: these run as the table owner, so nothing but the server
-- may call them. Without this any anon key could suspend anybody.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.admin_set_account_status(text, text, uuid, text, int, text)',
    'public.admin_member_roster(int)',
    'public.admin_community_reports(text, int)',
    'public.admin_resolve_report(text, text, uuid, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
