-- ============================================================
-- Migration 046: Content reports, and content removal
--
-- Two gaps close here, and they are two halves of the same hole.
--
-- 1. Reporting a post, a comment, a profile or a listing wrote nothing.
--    Three separate modals — components/screens/home.tsx (post),
--    components/post-card.tsx (comment) and the profile menu — each set a
--    local flag, showed a green tick and a "Thanks for keeping Honua safe"
--    toast, and dropped the report on the floor. The only report flow that
--    ever reached the database is community_reports (009), which covers
--    communities and the comments inside them and nothing else.
--
-- 2. The console's Moderation screen reviewed MOCK_ADMIN.reports, and its
--    "Remove content" button was a setState over that array. There was no
--    queue to review and no way to take anything down.
--
-- `content_reports` is the missing table. The removal columns on posts and
-- comments are the missing action.
--
--
-- Why the reports table is user-writable and community_reports' sibling is not
-- ---------------------------------------------------------------------------
-- Intake stays in the browser. A member filing a report *does* have a Supabase
-- session, so `auth.uid()` is a real value and RLS can do its job — this is
-- the opposite of the console's situation, where a Privy session leaves
-- auth.uid() null and every admin route needs the service-role key.
--
-- So: insert your own, read your own, and nothing else. No update, no delete,
-- no reading anyone else's. The console reads the whole table through
-- /api/admin/content-reports, which bypasses RLS entirely.
--
--
-- Why removal is a column and not a delete
-- ----------------------------------------
-- Migration 043 gave appeals a `post_removal` kind. An appeal that is
-- overturned has to be able to put the post back, and a row that was deleted
-- cannot be put back. A hard delete would also destroy the thread every reply
-- hangs off.
--
-- The hiding is done by a RESTRICTIVE select policy rather than by adding
-- `.is('removed_at', null)` to the twenty-odd read paths that query posts.
-- Restrictive policies AND with whatever the table already allows, so this
-- needs no knowledge of the rules `posts` and `comments` already carry — those
-- two tables predate this migrations folder and their policies live only in
-- the dashboard. Migration 041 made the same argument for the freeze policies
-- and for the same reason: layering is the only safe way to do this blind.
--
-- The author still sees their own removed content. That is deliberate — they
-- need to be able to point at it when they appeal, and a post that silently
-- evaporates teaches them nothing. Everyone else stops seeing it, which is
-- what a takedown is.
-- ============================================================


-- ── 1. The reports ──────────────────────────────────────────────────────────

create table if not exists public.content_reports (
  id           uuid primary key default gen_random_uuid(),

  -- Polymorphic on purpose. A foreign key per kind would mean four nullable
  -- columns and a check constraint holding exactly one of them non-null, and
  -- the queue would still have to fan out to four tables to render a card.
  -- The cost is that a deleted target leaves a dangling id, which the route
  -- renders as "content no longer exists" rather than as a broken join.
  target_type  text not null check (target_type in ('post', 'comment', 'profile', 'product')),
  target_id    uuid not null,

  -- Snapshotted at report time so the queue can name who is being reported
  -- even after the target row is gone. Not trusted for authorisation — the
  -- route re-reads the real owner before acting on anything.
  target_owner uuid references public.profiles(id) on delete set null,

  -- `on delete cascade`: a member who deletes their account takes their
  -- reports with them. Unlike a moderation decision, an unreviewed report is
  -- not a record of anything we did.
  reporter_id  uuid not null references public.profiles(id) on delete cascade,

  -- One of the fixed lists the modals offer. Free text rather than an enum
  -- because the three modals do not offer identical lists and never have.
  reason       text not null,
  -- Whatever they typed in addition. Usually empty.
  note         text,

  status       text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),

  -- Filled when a moderator closes it. `admin_actor` is a Privy DID, which is
  -- why it is text and not a uuid — see the note on profiles.banned_by in 041.
  admin_note   text,
  admin_actor  text,
  admin_label  text,
  admin_actioned_at timestamptz,

  created_at   timestamptz not null default now(),

  constraint content_reports_reason_present check (length(trim(reason)) > 0)
);

create index if not exists content_reports_queue_idx
  on public.content_reports (status, created_at desc);

-- The queue groups by target, so this is the index it actually reads on.
create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id, created_at desc);

create index if not exists content_reports_reporter_idx
  on public.content_reports (reporter_id, created_at desc);

-- One report per person per thing. Without this, a double-click on Submit
-- files two, and the queue counts one annoyed member as two complaints —
-- which is the number a moderator uses to decide how seriously to take it.
-- Enforced here rather than in the modal because a check-then-insert in the
-- client races against itself.
create unique index if not exists content_reports_one_per_reporter_idx
  on public.content_reports (reporter_id, target_type, target_id);

alter table public.content_reports enable row level security;

drop policy if exists content_reports_insert_own on public.content_reports;
create policy content_reports_insert_own on public.content_reports
  for insert to authenticated
  -- Filing under someone else's name would let one account manufacture a
  -- report count against a target it wanted taken down.
  with check (reporter_id = auth.uid());

drop policy if exists content_reports_select_own on public.content_reports;
create policy content_reports_select_own on public.content_reports
  for select to authenticated
  -- So the modal can tell you that you have already reported this, rather
  -- than failing on the unique index with a message nobody can read.
  using (reporter_id = auth.uid());

-- No update and no delete policy, for anyone. A report is a statement about
-- a moment; letting the reporter edit it after a moderator has read it, or
-- withdraw it after action was taken on it, would make the queue a record of
-- nothing. Moderators go through the service role.

-- Migration 041 freezes writes on 28 tables for a suspended account. This one
-- is deliberately not added to that list and does not need to be: filing a
-- report is not a way to abuse anyone, and a suspended member who witnesses
-- harassment should still be able to say so.


-- ── 2. Removal ──────────────────────────────────────────────────────────────
--
-- `if not exists` throughout: these two tables are older than this folder and
-- may already carry some of this from an earlier hand-edit in the dashboard.

alter table public.posts    add column if not exists removed_at     timestamptz;
alter table public.posts    add column if not exists removed_reason text;
alter table public.posts    add column if not exists removed_by     text;

alter table public.comments add column if not exists removed_at     timestamptz;
alter table public.comments add column if not exists removed_reason text;
alter table public.comments add column if not exists removed_by     text;

-- Partial indexes: the overwhelming majority of rows have removed_at null, and
-- the only queries that care are the console's ("what has been taken down")
-- and the policy below, which is satisfied by the null check alone.
create index if not exists posts_removed_idx    on public.posts    (removed_at desc) where removed_at is not null;
create index if not exists comments_removed_idx on public.comments (removed_at desc) where removed_at is not null;

do $$
declare
  t text;
begin
  foreach t in array array['posts', 'comments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_hide_removed', t);
    -- AS RESTRICTIVE: this ANDs with the existing permissive policies instead
    -- of adding a fourth way to be allowed through. Nothing that was visible
    -- becomes more visible; removed rows become less.
    --
    -- service_role is not listed, and does not need to be — it bypasses RLS
    -- outright, which is how the console still sees what it took down.
    execute format($p$
      create policy %I on public.%I
        as restrictive
        for select
        to anon, authenticated
        using (removed_at is null or user_id = auth.uid())
    $p$, t || '_hide_removed', t);
    raise notice 'restrictive select policy applied to public.%', t;
  end loop;
end $$;


-- ── 3. The console's counts ─────────────────────────────────────────────────
--
-- One round trip for the rail badge instead of four head counts. Everything
-- else the Moderation screen needs is a plain select through the service role;
-- this is here only because it runs on every console render.

create or replace function public.admin_content_report_counts()
returns table (
  pending_count   bigint,
  actioned_count  bigint,
  dismissed_count bigint,
  -- Distinct targets still awaiting a decision, which is the number the queue
  -- actually shows: five people reporting one post is one card, not five.
  open_targets    bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'actioned'),
    count(*) filter (where status = 'dismissed'),
    count(distinct (target_type, target_id)) filter (where status = 'pending')
  from public.content_reports;
$$;

revoke all on function public.admin_content_report_counts() from public, anon, authenticated;
grant execute on function public.admin_content_report_counts() to service_role;
