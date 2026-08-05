-- ============================================================
-- Migration 038: Support counts, split by kind
--
-- 037 shipped admin_support_counts() as a single flat row across every ticket,
-- written when only /support wrote to the table. /report now files into it too,
-- with kind = 'report', and those are a different queue answered by different
-- people: a billing question and an allegation of fraud should never share a
-- number that someone reads as "how much is waiting".
--
-- This replaces the function with one row per kind plus an 'all' rollup, so the
-- console gets both queue's figures and the rail badge's total from the same
-- round trip. Adding a kind *parameter* instead would have meant one call per
-- tab, and the tabs are shown side by side with their counts on them.
-- ============================================================


-- The return type changes, so the old signature has to go first — CREATE OR
-- REPLACE cannot alter a function's OUT columns.
drop function if exists public.admin_support_counts();

create function public.admin_support_counts()
returns table (
  kind      text,
  total     bigint,
  open      bigint,
  pending   bigint,
  resolved  bigint,
  closed    bigint,
  unseen    bigint,
  last_24h  bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  -- 'all' is computed here rather than summed by the caller so the rollup can
  -- never drift from its parts, and so it still exists when a kind has no rows
  -- at all.
  select
    'all'::text,
    count(*)::bigint,
    count(*) filter (where t.status = 'open')::bigint,
    count(*) filter (where t.status = 'pending')::bigint,
    count(*) filter (where t.status = 'resolved')::bigint,
    count(*) filter (where t.status = 'closed')::bigint,
    count(*) filter (where not t.seen)::bigint,
    count(*) filter (where t.created_at >= now() - interval '24 hours')::bigint
  from public.support_tickets t

  union all

  -- A kind with zero tickets is absent from this half rather than present as a
  -- zero row. The caller fills the gap; the alternative is hardcoding the list
  -- of kinds in two places and having them disagree the day a third is added.
  select
    t.kind,
    count(*)::bigint,
    count(*) filter (where t.status = 'open')::bigint,
    count(*) filter (where t.status = 'pending')::bigint,
    count(*) filter (where t.status = 'resolved')::bigint,
    count(*) filter (where t.status = 'closed')::bigint,
    count(*) filter (where not t.seen)::bigint,
    count(*) filter (where t.created_at >= now() - interval '24 hours')::bigint
  from public.support_tickets t
  group by t.kind;
$$;


-- ── Only the server may call it ─────────────────────────────
--
-- Re-applied because DROP took the old grants with it. SECURITY DEFINER
-- functions are EXECUTE-to-PUBLIC by default, so without this the anon key
-- could ask an RLS-sealed table how many safety reports it holds.
do $$
begin
  execute 'revoke all on function public.admin_support_counts() from public, anon, authenticated';
  execute 'grant execute on function public.admin_support_counts() to service_role';
end $$;


-- The queue is now filtered by kind before status, so the composite index leads
-- with it. 037's status index stays for the rollup views.
create index if not exists support_tickets_kind_idx
  on public.support_tickets (kind, status, created_at desc);
