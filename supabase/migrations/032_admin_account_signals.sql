-- ============================================================
-- Migration 032: Count in the database, not in Node
--
-- The admin console decorates each account with four things: follower count,
-- post count, vouched-action count, and the email address. Every one of them
-- was being assembled the expensive way.
--
-- Counts were done by selecting the rows and calling .length in JavaScript:
--
--   db.from('follows').select('following_id').in('following_id', ids)
--
-- which transfers one row per follower, over the wire, to produce a number.
-- One verified account with 100k followers means 100k rows fetched to render
-- "100,000". It is correct at four users and falls over well before the
-- traffic levels that would justify any of the usual scaling machinery.
--
-- Emails were one auth.admin.getUserById() call per account — 500 concurrent
-- round trips into GoTrue to fill in a column, which rate-limits long before
-- it finishes.
--
-- Both become a single round trip here. The counting happens where the indexes
-- are, and only the totals cross the network.
-- ============================================================


-- ── Indexes the counts ride on ──────────────────────────────
--
-- A count still has to find the rows. Without these it's a sequential scan per
-- account and the function is no faster than what it replaced.
create index if not exists follows_following_id_idx on public.follows (following_id);
create index if not exists posts_user_id_idx        on public.posts (user_id);
create index if not exists impact_logs_user_status_idx on public.impact_logs (user_id, status);


-- ── Per-account signals, counted in Postgres ────────────────
--
-- Takes the whole id list at once and returns one row per account. Accounts
-- with no follows/posts/logs still come back, at zero, so the caller doesn't
-- have to distinguish "no rows" from "not asked for".
create or replace function public.admin_account_signals(ids uuid[])
returns table (user_id uuid, followers bigint, posts bigint, verified_actions bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    i.id as user_id,
    (select count(*) from public.follows f where f.following_id = i.id) as followers,
    (select count(*) from public.posts p where p.user_id = i.id) as posts,
    (select count(*) from public.impact_logs l
       where l.user_id = i.id and l.status = 'verified') as verified_actions
  from unnest(ids) as i(id);
$$;


-- ── Emails, without 500 round trips ─────────────────────────
--
-- auth.users is not exposed through PostgREST, and rightly so — this is the
-- narrow hole through it: ids in, addresses out, nothing else. SECURITY DEFINER
-- because the caller has no rights in the auth schema.
create or replace function public.admin_account_emails(ids uuid[])
returns table (id uuid, email text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select u.id, u.email::text
  from auth.users u
  where u.id = any(ids);
$$;


-- ── Only the server may call either ─────────────────────────
--
-- Postgres grants EXECUTE to PUBLIC on new functions, and both of these are
-- SECURITY DEFINER — admin_account_emails especially would hand every address
-- in the system to anyone holding the anon key. service_role is granted back
-- explicitly, because revoking from public also revokes it (service_role is a
-- member of public); it bypasses RLS, not privileges.
revoke all on function public.admin_account_signals(uuid[]) from public, anon, authenticated;
revoke all on function public.admin_account_emails(uuid[])  from public, anon, authenticated;
grant execute on function public.admin_account_signals(uuid[]) to service_role;
grant execute on function public.admin_account_emails(uuid[])  to service_role;
