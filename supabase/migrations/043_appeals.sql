-- ============================================================
-- Migration 043: Appeals
--
-- The console has had an Appeals screen since it shipped. It renders five
-- invented rows from a MOCK_APPEALS array, and Overturn / Uphold move a card
-- between columns in React state and write nothing anywhere. There is no table,
-- no intake, and no way for a member to file one — the queue reviews appeals
-- that nobody could have submitted.
--
-- This is the table, and the pair of entry points behind the buttons.
--
-- The design constraint that shapes everything below: an appeal is filed by
-- someone we have just punished. They are suspended or banned at the moment
-- they need this most, and migration 041 blocks a frozen account from writing
-- to twenty-eight tables. If `appeals` were an ordinary user-writable table it
-- would have to be carved out of that list by hand, and the carve-out would be
-- one edit away from being lost.
--
-- So it is sealed instead — RLS on, zero policies, exactly like support_tickets
-- and admin_audit_log. No browser can touch it in either direction. Intake goes
-- through /api/appeals with the service-role key, so RLS is never consulted and
-- the freeze cannot apply. Being locked out is the normal state of an appellant,
-- not an edge case.
-- ============================================================


create sequence if not exists public.appeal_ref_seq;

create table if not exists public.appeals (
  id      uuid primary key default gen_random_uuid(),

  -- Human-quotable, and generated here rather than in the route so two
  -- simultaneous submissions cannot land on the same one.
  ref     text not null unique default ('APL-' || lpad(nextval('public.appeal_ref_seq')::text, 5, '0')),

  kind    text not null check (kind in (
            'suspension', 'ban', 'post_removal', 'product_removal',
            'seller_rejection', 'other'
          )),

  -- The three the console already draws. An appeal is upheld when the original
  -- action stands and overturned when it is reversed — the outcome is about the
  -- *action*, not about the appellant, which is the way round moderators expect
  -- to read it and the opposite of how it is often misread.
  status  text not null default 'open' check (status in ('open', 'upheld', 'overturned')),

  -- `on delete set null`, not cascade: deleting an account must not erase the
  -- record of what was decided about it. Nullable throughout, because someone
  -- fully locked out may reach /appeal with no session at all.
  user_id uuid references auth.users(id) on delete set null,

  -- Snapshotted at submission. A handle can change, and an appeal that stops
  -- naming who filed it is not a record.
  handle  text,
  email   text,

  -- What is being appealed, when it is a specific thing: a post id, a product
  -- id, an order ref. Free text because the console shows it and the reviewer
  -- reads it — it is not dereferenced automatically, so a wrong id is a dead
  -- link rather than a broken query.
  target  text,

  -- The appellant's own account of it. The one field that cannot be empty:
  -- an appeal with no argument is not an appeal.
  reason  text not null,

  -- Filled by whoever closes it. Shown back to the appellant, so it is written
  -- as something a person will read about their own account.
  resolution   text,
  resolved_by  text,           -- Privy DID of the admin
  resolved_label text,         -- and their rendered name, stored at write time
  resolved_at  timestamptz,

  -- Drives the rail badge without a count query per render.
  seen    boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appeals_reason_present check (length(trim(reason)) > 0),
  -- A decision needs to say something. Closing an appeal with a blank
  -- resolution is how an appellant learns nothing from having appealed.
  constraint appeals_resolution_present check (
    status = 'open' or (resolution is not null and length(trim(resolution)) > 0)
  )
);

create index if not exists appeals_status_idx  on public.appeals (status, created_at desc);
create index if not exists appeals_open_idx    on public.appeals (created_at desc) where status = 'open';
create index if not exists appeals_user_idx    on public.appeals (user_id, created_at desc);

-- One open appeal per kind per person. Enforced here rather than in the route
-- because the route is one of several things that could insert, and because a
-- check-then-insert in application code races against a double submit.
--
-- Two indexes, because NULLs are distinct: the first covers people with an
-- account, the second covers the fully-locked-out who arrive with only an
-- email. Someone who is both suspended *and* had a post removed can still file
-- twice — those are different grievances, and the limit is per kind for that
-- reason.
create unique index if not exists appeals_one_open_per_user_idx
  on public.appeals (user_id, kind) where status = 'open' and user_id is not null;

create unique index if not exists appeals_one_open_per_email_idx
  on public.appeals (lower(email), kind) where status = 'open' and user_id is null and email is not null;

alter table public.appeals enable row level security;

-- Deliberately no policies. RLS with none denies every client role outright;
-- service_role bypasses RLS entirely. See the header: this is what makes the
-- table reachable by someone whose account is frozen.


-- ── The rail badge ──────────────────────────────────────────────────────────

create or replace function public.admin_appeal_counts()
returns table (open_count bigint, unseen_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where status = 'open'),
    count(*) filter (where status = 'open' and not seen)
  from public.appeals;
$$;


-- ── The queue ───────────────────────────────────────────────────────────────
--
-- Dropped before creation: `create or replace` cannot change a return type, and
-- creates a second overload rather than replacing when the arguments differ.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('admin_appeal_queue', 'admin_resolve_appeal')
  loop
    execute format('drop function if exists %s', fn.sig);
    raise notice 'dropped previous %', fn.sig;
  end loop;
end $$;

create function public.admin_appeal_queue(p_status text default null, p_limit int default 200)
returns table (
  id             uuid,
  ref            text,
  kind           text,
  status         text,
  target         text,
  reason         text,
  resolution     text,
  resolved_label text,
  resolved_at    timestamptz,
  seen           boolean,
  created_at     timestamptz,
  user_id        uuid,
  handle         text,
  email          text,
  full_name      text,
  avatar_url     text,
  -- Live account standing, so a reviewer can see whether the thing being
  -- appealed is still in force before deciding.
  suspended_until timestamptz,
  banned_at       timestamptz,
  -- The original action, read from the moderation record rather than retyped by
  -- the appellant. The console drew an "ORIGINAL ACTION" block from a mock
  -- string; this is where that text can honestly come from.
  action_kind    text,
  action_reason  text,
  action_at      timestamptz,
  action_by      text
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  select
    a.id, a.ref, a.kind, a.status, a.target, a.reason,
    a.resolution, a.resolved_label, a.resolved_at, a.seen, a.created_at,
    a.user_id,
    coalesce(p.handle, a.handle),
    a.email,
    p.full_name,
    p.avatar_url,
    p.suspended_until,
    p.banned_at,
    ma.action, ma.reason, ma.acted_at, ma.acted_by
  from public.appeals a
  left join public.profiles p on p.id = a.user_id
  -- Only for the two kinds a moderation_actions row can correspond to. Joining
  -- it onto a post-removal appeal would attach an unrelated suspension to it.
  left join lateral (
    select m.action, m.reason, m.acted_at, m.acted_by
      from public.moderation_actions m
     where a.kind in ('suspension', 'ban')
       and m.target_id = a.user_id
       and m.action = case a.kind when 'ban' then 'ban' else 'suspend' end
     order by m.acted_at desc
     limit 1
  ) ma on true
  where p_status is null or a.status = p_status
  order by
    -- Open first: this is a work queue.
    case a.status when 'open' then 0 else 1 end,
    a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end $$;


-- ── The decision ────────────────────────────────────────────────────────────
--
-- Records the outcome. Deliberately does *not* lift a suspension when an appeal
-- is overturned — reinstating an account is admin_set_account_status in 041,
-- and it is gated on users.suspend / users.ban, which a moderator holding only
-- appeals.resolve does not have. Folding the two together here would let the
-- appeals screen quietly become a way around that gate.
--
-- The route returns the overturned appeal's user so the console can offer
-- "reinstate this account" as an explicit next step, which will then be checked
-- against the caller's real permissions.

create function public.admin_resolve_appeal(
  p_actor      text,
  p_label      text,
  p_appeal     uuid,
  p_status     text,
  p_resolution text
)
returns public.appeals
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  rec public.appeals;
  v_res text := nullif(trim(coalesce(p_resolution, '')), '');
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Missing actor' using errcode = '22023';
  end if;
  if p_status not in ('upheld', 'overturned') then
    raise exception 'An appeal is either upheld or overturned, not %', p_status using errcode = '22023';
  end if;
  if v_res is null then
    raise exception 'A decision needs a reason the appellant can read' using errcode = '22023';
  end if;

  select * into rec from public.appeals where id = p_appeal for update;
  if not found then
    raise exception 'No such appeal' using errcode = 'P0002';
  end if;
  if rec.status <> 'open' then
    raise exception 'That appeal was already % on %',
      rec.status, to_char(rec.resolved_at, 'FMDD Mon YYYY') using errcode = '22023';
  end if;

  update public.appeals a
     set status         = p_status,
         resolution     = v_res,
         resolved_by    = p_actor,
         resolved_label = coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
         resolved_at    = now(),
         seen           = true,
         updated_at     = now()
   where a.id = p_appeal
  returning * into rec;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
  values (
    p_actor,
    coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    case p_status when 'overturned' then 'overturned on appeal' else 'upheld on appeal' end,
    rec.ref || ' · ' || rec.kind,
    case p_status when 'overturned' then 'check' else 'lock' end,
    jsonb_build_object('appeal', rec.id, 'kind', rec.kind, 'user', rec.user_id)
  );

  return rec;
end $$;


-- ── Reachable only from the server ──────────────────────────────────────────

do $$
declare
  sig text;
  sigs text[] := array[
    'public.admin_appeal_counts()',
    'public.admin_appeal_queue(text, int)',
    'public.admin_resolve_appeal(text, text, uuid, text, text)'
  ];
begin
  foreach sig in array sigs loop
    execute format('revoke all on function %s from public, anon, authenticated', sig);
    execute format('grant execute on function %s to service_role', sig);
  end loop;
end $$;
