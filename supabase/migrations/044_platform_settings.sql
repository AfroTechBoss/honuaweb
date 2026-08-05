-- ============================================================
-- Migration 044: Platform settings, and broadcasts that actually send
--
-- The last two rows of the console's permission matrix said NOT ENFORCED, and
-- both said it for the same reason: the screen was the whole feature.
--
--   Settings      — four toggles in React state. Flipping one showed a toast
--                   and changed nothing. Reload the page and it flipped back.
--                   "Lock platform" asked you to type LOCK to confirm an
--                   action that did not exist.
--
--   Notifications — the composer pushed a row onto a MOCK_SENT_NOTIFICATIONS
--                   array and toasted "Notification sent". Nobody was sent
--                   anything, and the History tab was five invented rows.
--
-- This migration is the storage and the SQL behind both. Two things shape it:
--
-- 1. A setting is only worth persisting if something reads it. Every column in
--    platform_settings has a named enforcement point, written in the comment
--    above it. Two switches the old screen offered are absent, for the same
--    reason the screen was a problem in the first place — nothing could enforce
--    them, so persisting them would only have moved the decoration into a table:
--
--      seller_review_required — every verification application already requires
--        manual approval. There is no auto-approve path to switch off.
--
--      lock sign-ins — sign-in is supabase.auth.signInWithPassword() straight
--        from the browser to Supabase's own endpoint. It never passes through
--        this application, so nothing here can refuse it. Maintenance mode is
--        the enforceable version of the same intent, and a stronger one: it is
--        checked on every navigation and applies to sessions already held.
--
-- 2. A broadcast is the one admin action that reaches every member at once.
--    The audience is resolved in SQL and capped, the in-app rows are written in
--    one statement rather than a thousand round trips, and what actually
--    happened — how many were reached, how many emails failed and why — is
--    recorded in admin_broadcasts instead of being asserted by a toast.
--
-- Safe to re-run.
-- ============================================================


-- ── platform_settings ───────────────────────────────────────────────────────
--
-- One row, forever. `id boolean primary key default true check (id)` is the
-- narrowest way to say that in Postgres: the only value that satisfies the
-- check is true, and the primary key means there can only be one of those. A
-- second row is a constraint violation rather than a silently-ignored setting.

create table if not exists public.platform_settings (
  id boolean primary key default true check (id),

  -- Read by the BEFORE INSERT trigger on public.profiles at the bottom of this
  -- file, and by GET /api/platform so the sign-up form can say so before
  -- someone fills it in.
  registration_open  boolean not null default true,
  -- Shown on the closed sign-up form. Nullable: a closed door with no
  -- explanation is worse than one with a bad explanation, so the route
  -- substitutes a default rather than showing nothing.
  registration_note  text,

  -- Read by middleware.ts on every navigation. When true every path except
  -- /admin and /maintenance is rewritten to the maintenance page.
  maintenance_mode    boolean not null default false,
  maintenance_message text,

  -- Read by POST /api/support. When true, a new ticket or safety report emails
  -- alert_email. When alert_email is null nothing is sent, because a switch
  -- that says on while pointing nowhere is the same lie this migration exists
  -- to remove.
  admin_email_alerts boolean not null default true,
  alert_email        text,

  updated_at    timestamptz not null default now(),
  updated_by    text,
  updated_label text
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

-- Deliberately no policies — the sealed-table pattern used by support_tickets,
-- admin_audit_log and appeals. RLS with zero policies denies anon and
-- authenticated outright; service_role bypasses RLS entirely, so the admin
-- route and middleware are the only readers and the admin route is the only
-- writer. The public half (is registration open, are we in maintenance) is
-- exposed deliberately and narrowly by GET /api/platform, which returns the two
-- switches a visitor is about to run into and no audit columns.


-- ── admin_broadcasts ────────────────────────────────────────────────────────
--
-- What was sent, to whom, and what actually happened when it went out. The
-- counts are the point: `recipients` is how many the audience resolved to,
-- `emails_sent` is how many Resend accepted. When those two differ the History
-- tab shows both rather than rounding up to "sent".

create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),

  template_id text,
  subject     text not null,
  body        text not null,

  audience       text not null check (audience in ('all_users', 'all_sellers', 'user')),
  -- Rendered at send time and stored, not derived on read: "All sellers" meant
  -- a different set of people last month, and the history should say who it
  -- was aimed at rather than who that phrase would select today.
  audience_label text not null,
  target_user_id uuid references auth.users(id) on delete set null,

  channel text not null check (channel in ('both', 'email', 'in_app')),

  recipients     int not null default 0,
  in_app_created int not null default 0,
  emails_sent    int not null default 0,
  emails_failed  int not null default 0,
  -- The provider's own words, kept verbatim. "Email failed" sends an admin
  -- looking for a bug; "RESEND_API_KEY is not set" sends them to the fix.
  email_error    text,

  sent_by    text not null,
  sent_label text,
  created_at timestamptz not null default now(),

  constraint admin_broadcasts_subject_present check (length(trim(subject)) > 0),
  constraint admin_broadcasts_body_present    check (length(trim(body)) > 0)
);

create index if not exists admin_broadcasts_recent_idx on public.admin_broadcasts (created_at desc);

alter table public.admin_broadcasts enable row level security;
-- Sealed, as above.


-- ── notifications.title ─────────────────────────────────────────────────────
--
-- Every notification until now was one sentence, so `body` alone was enough.
-- A broadcast has a subject and a message and loses its shape if they are
-- concatenated, so the headline gets its own column. Nullable, and every
-- existing row leaves it null — the notifications screen falls back to the old
-- single-line rendering when it is absent.

alter table public.notifications add column if not exists title text;


-- ── Who a broadcast reaches ─────────────────────────────────────────────────
--
-- Resolved here rather than in the route because two of the three audiences
-- need auth.users, which PostgREST does not expose, and because "all sellers"
-- is a join the route would otherwise have to reimplement.
--
-- A seller is someone who has listed a product, or is marked as one on their
-- profile. The union rather than either alone: role is set by hand and drifts,
-- and a seller whose only listing is currently a draft is still a seller.

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'admin_broadcast_audience', 'admin_broadcast_notify', 'admin_record_broadcast',
         'admin_settings_get', 'admin_settings_set', 'admin_clear_reports', 'admin_broadcast_history',
         'render_broadcast_slots'
       )
  loop
    execute format('drop function if exists %s', fn.sig);
    raise notice 'dropped previous %', fn.sig;
  end loop;
end $$;

create function public.admin_broadcast_audience(p_audience text, p_target uuid default null)
returns table (
  user_id          uuid,
  email            text,
  handle           text,
  full_name        text,
  marketing_emails boolean,
  suspended_until  timestamptz,
  banned_at        timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_audience not in ('all_users', 'all_sellers', 'user') then
    raise exception 'Unknown audience %', p_audience using errcode = '22023';
  end if;
  if p_audience = 'user' and p_target is null then
    raise exception 'A message to one person needs to say which person' using errcode = '22023';
  end if;

  return query
  select p.id, u.email::text, p.handle, p.full_name, coalesce(p.marketing_emails, false),
         p.suspended_until, p.banned_at
    from public.profiles p
    left join auth.users u on u.id = p.id
   where case p_audience
           when 'user'        then p.id = p_target
           when 'all_sellers' then p.role = 'seller'
                                   or exists (select 1 from public.products pr where pr.seller_id = p.id)
           else true
         end
   order by p.created_at;
end $$;


-- ── The two slots the server can fill ───────────────────────────────────────
--
-- Shared by the in-app insert below and, in its TypeScript twin
-- (renderTemplate in lib/broadcast.ts), by the email. Any other slot in a
-- template — {{suspension_reason}}, {{post_title}} — belongs to the admin
-- composing the message, and the route refuses to send while one is still
-- unfilled rather than delivering it literally.

create function public.render_broadcast_slots(p_text text, p_name text, p_handle text)
returns text
language sql
immutable
as $$
  select replace(
           replace(coalesce(p_text, ''), '{{user.name}}',
                   coalesce(nullif(trim(coalesce(p_name, '')), ''), nullif(trim(coalesce(p_handle, '')), ''), 'there')),
           '{{user.handle}}',
           case when coalesce(trim(p_handle), '') = '' then '' else '@' || p_handle end);
$$;


-- ── The in-app half ─────────────────────────────────────────────────────────
--
-- One insert…select for the whole audience. Written this way rather than as N
-- inserts from the route because a broadcast to every member is the one place
-- where the difference between one statement and a thousand round trips is the
-- difference between a send and a timeout.
--
-- The audience is re-resolved here rather than passed in as a list of ids: the
-- route already has the list, but trusting it would mean the route could
-- notify anyone it named. It cannot.
--
-- The two name slots are filled here as well as in the email, so the same
-- message does not arrive personalised in one place and holding a literal
-- "{{user.name}}" in the other. Plain replace() rather than a regex because
-- replace() has no escape syntax at all in either argument — a member called
-- "A\1" is a name, not a backreference. The route canonicalises the spelling
-- ({{ User.Name }} → {{user.name}}) before calling, which is what makes two
-- literal replacements sufficient.

create function public.admin_broadcast_notify(
  p_audience text,
  p_target   uuid,
  p_title    text,
  p_body     text
)
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare n bigint;
begin
  if coalesce(trim(p_body), '') = '' then
    raise exception 'A notification with no message is not a notification' using errcode = '22023';
  end if;

  insert into public.notifications (user_id, actor_id, type, title, body)
  select a.user_id, null, 'admin_broadcast',
         nullif(trim(public.render_broadcast_slots(coalesce(p_title, ''), a.full_name, a.handle)), ''),
         public.render_broadcast_slots(p_body, a.full_name, a.handle)
    from public.admin_broadcast_audience(p_audience, p_target) a;

  get diagnostics n = row_count;
  return n;
end $$;


-- ── The record ──────────────────────────────────────────────────────────────

create function public.admin_record_broadcast(
  p_actor      text,
  p_label      text,
  p_template   text,
  p_subject    text,
  p_body       text,
  p_audience   text,
  p_audience_label text,
  p_target     uuid,
  p_channel    text,
  p_recipients int,
  p_in_app     int,
  p_sent       int,
  p_failed     int,
  p_error      text
)
returns public.admin_broadcasts
language plpgsql
volatile
security definer
set search_path = public
as $$
declare rec public.admin_broadcasts;
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Missing actor' using errcode = '22023';
  end if;

  insert into public.admin_broadcasts (
    template_id, subject, body, audience, audience_label, target_user_id, channel,
    recipients, in_app_created, emails_sent, emails_failed, email_error, sent_by, sent_label
  ) values (
    nullif(trim(coalesce(p_template, '')), ''), p_subject, p_body,
    p_audience, p_audience_label, p_target, p_channel,
    greatest(coalesce(p_recipients, 0), 0), greatest(coalesce(p_in_app, 0), 0),
    greatest(coalesce(p_sent, 0), 0), greatest(coalesce(p_failed, 0), 0),
    nullif(trim(coalesce(p_error, '')), ''),
    p_actor, coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin')
  )
  returning * into rec;

  insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
  values (
    p_actor,
    coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin'),
    'sent a notification',
    p_audience_label || ' · ' || rec.recipients || ' recipient' || case when rec.recipients = 1 then '' else 's' end,
    'bell',
    jsonb_build_object(
      'broadcast', rec.id, 'audience', p_audience, 'channel', p_channel,
      'recipients', rec.recipients, 'emails_sent', rec.emails_sent, 'emails_failed', rec.emails_failed
    )
  );

  return rec;
end $$;


create function public.admin_broadcast_history(p_limit int default 50)
returns setof public.admin_broadcasts
language sql
stable
security definer
set search_path = public
as $$
  select * from public.admin_broadcasts
   order by created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;


-- ── Settings, read and written ──────────────────────────────────────────────

create function public.admin_settings_get()
returns public.platform_settings
language plpgsql
volatile
security definer
set search_path = public
as $$
declare rec public.platform_settings;
begin
  -- Volatile, not stable, because of this line: the row is seeded at the top of
  -- this file, but a database restored from a dump taken before 044 would have
  -- the table and no row, and a settings screen that renders nothing at all is
  -- a worse failure than one extra write on first read.
  insert into public.platform_settings (id) values (true) on conflict (id) do nothing;
  select * into rec from public.platform_settings where id;
  return rec;
end $$;


-- Only the keys present in p_patch are applied, so the route can send one
-- toggle rather than the whole row and two admins on the screen at once do not
-- overwrite each other's other switches.
create function public.admin_settings_set(p_actor text, p_label text, p_patch jsonb)
returns public.platform_settings
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  rec     public.platform_settings;
  before  public.platform_settings;
  changed text[] := '{}';
  actor   text := coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin');
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Missing actor' using errcode = '22023';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Nothing to change' using errcode = '22023';
  end if;

  insert into public.platform_settings (id) values (true) on conflict (id) do nothing;
  select * into before from public.platform_settings where id for update;

  update public.platform_settings s set
    registration_open  = coalesce((p_patch->>'registration_open')::boolean,  s.registration_open),
    registration_note  = case when p_patch ? 'registration_note'
                              then nullif(trim(coalesce(p_patch->>'registration_note', '')), '')
                              else s.registration_note end,
    maintenance_mode    = coalesce((p_patch->>'maintenance_mode')::boolean, s.maintenance_mode),
    maintenance_message = case when p_patch ? 'maintenance_message'
                               then nullif(trim(coalesce(p_patch->>'maintenance_message', '')), '')
                               else s.maintenance_message end,
    admin_email_alerts = coalesce((p_patch->>'admin_email_alerts')::boolean, s.admin_email_alerts),
    alert_email        = case when p_patch ? 'alert_email'
                              then nullif(trim(coalesce(p_patch->>'alert_email', '')), '')
                              else s.alert_email end,
    updated_at    = now(),
    updated_by    = p_actor,
    updated_label = actor
  where s.id
  returning * into rec;

  -- One audit line per switch that actually moved. A settings save that changed
  -- nothing writes nothing: an audit log padded with no-ops is one nobody reads.
  if before.registration_open  is distinct from rec.registration_open  then
    changed := changed || (case when rec.registration_open then 'opened registration' else 'closed registration' end);
  end if;
  if before.maintenance_mode   is distinct from rec.maintenance_mode   then
    changed := changed || (case when rec.maintenance_mode then 'turned on maintenance mode' else 'turned off maintenance mode' end);
  end if;
  if before.admin_email_alerts is distinct from rec.admin_email_alerts then
    changed := changed || (case when rec.admin_email_alerts then 'turned on admin email alerts' else 'turned off admin email alerts' end);
  end if;
  if before.alert_email        is distinct from rec.alert_email        then
    changed := changed || 'changed the alert address';
  end if;
  if before.maintenance_message is distinct from rec.maintenance_message
     or before.registration_note is distinct from rec.registration_note then
    changed := changed || 'edited the notice shown to visitors';
  end if;

  if array_length(changed, 1) is not null then
    insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
    select p_actor, actor, t.c, 'Platform settings',
           case when t.c like '%maintenance%' or t.c like '%closed%'
                then 'lock' else 'settings' end,
           jsonb_build_object('setting', t.c)
      from unnest(changed) as t(c);
  end if;

  return rec;
end $$;


-- ── Danger zone: clear the moderation queue ─────────────────────────────────
--
-- The button existed and did nothing but toast. What it does now is dismiss
-- every open community report — 'dismissed' rather than a delete, because the
-- reports are the record of what members raised and destroying them to clear a
-- badge is not housekeeping. Reversible in the sense that the rows are still
-- there; not reversible in the sense that the queue's state is gone, which is
-- why the console still asks twice.

create function public.admin_clear_reports(p_actor text, p_label text, p_note text default null)
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  n     bigint;
  actor text := coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Admin');
begin
  if p_actor is null or trim(p_actor) = '' then
    raise exception 'Missing actor' using errcode = '22023';
  end if;

  update public.community_reports
     set status = 'dismissed',
         admin_note = coalesce(
           nullif(trim(coalesce(p_note, '')), ''),
           'Cleared in bulk from the console on ' || to_char(now(), 'FMDD Mon YYYY')
         ),
         admin_actioned_at = now()
   where status in ('pending', 'escalated');
  get diagnostics n = row_count;

  if n > 0 then
    insert into public.admin_audit_log (actor_id, actor_label, action, target, kind, meta)
    values (p_actor, actor, 'cleared the moderation queue',
            n || ' open report' || case when n = 1 then '' else 's' end || ' dismissed',
            'trash', jsonb_build_object('dismissed', n));
  end if;

  return n;
end $$;


-- ── Registration, enforced where an account is actually created ─────────────
--
-- Sign-up is supabase.auth.signUp() straight from the browser, which this
-- database cannot intercept. The row it cannot avoid is the profile: a person
-- with an auth record and no public.profiles row is not a member of Honua —
-- they have no handle, no feed, and every screen treats them as absent.
--
-- So the gate sits there. It is a real gate, not a UI courtesy: closing
-- registration in the console stops the next profile insert even if it arrives
-- straight from PostgREST with the anon key and no application code involved.
--
-- service_role passes through. Every server route holds it, and a switch aimed
-- at the public sign-up form must not also be able to lock an admin out of
-- fixing an account.
--
-- Two consequences worth knowing before turning this on:
--
--  · The usual path into public.profiles is handle_new_user(), the AFTER INSERT
--    trigger on auth.users in schema.sql. Raising here aborts that trigger,
--    which aborts the auth.users insert with it — so a closed sign-up leaves no
--    orphaned auth record behind. That is the outcome we want.
--
--  · What the browser sees is Supabase's own "Database error saving new user",
--    not the sentence below; GoTrue does not forward a trigger's message. The
--    sentence is still the right one for anyone reading the logs, and the
--    person filling in the form is told properly and earlier — the sign-up
--    screen reads GET /api/platform and refuses to start. This is the backstop
--    for everything that skips the screen.

create or replace function public.enforce_registration_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- The caller is identified from the request's JWT claims, which PostgREST
  -- publishes as a GUC. current_user would be the obvious thing to test and is
  -- useless here: SECURITY DEFINER rewrites it to this function's owner for
  -- every caller alike, so `current_user = 'service_role'` would be false for
  -- the service role and `current_user = 'postgres'` would be true for the
  -- browser — the check would either never fire or never not fire.
  --
  -- SECURITY DEFINER is still required, because platform_settings is a sealed
  -- table and an invoker-rights trigger would read zero rows as `anon` and fall
  -- through to the permissive default on every sign-up.
  begin
    v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  exception when others then
    v_role := null;
  end;
  v_role := coalesce(v_role, nullif(current_setting('request.jwt.claim.role', true), ''), '');

  if v_role = 'service_role' then
    return new;
  end if;

  -- coalesce, not a bare select: a settings row that has somehow gone missing
  -- must not close the door on everybody.
  if coalesce((select registration_open from public.platform_settings where id), true) then
    return new;
  end if;

  raise exception 'Sign-ups are closed on Honua right now.' using errcode = '22023';
end $$;

drop trigger if exists profiles_registration_gate on public.profiles;
create trigger profiles_registration_gate
  before insert on public.profiles
  for each row execute function public.enforce_registration_open();


-- ── Reachable only from the server ──────────────────────────────────────────

do $$
declare
  sig  text;
  sigs text[] := array[
    'public.admin_broadcast_audience(text, uuid)',
    'public.admin_broadcast_notify(text, uuid, text, text)',
    'public.admin_record_broadcast(text, text, text, text, text, text, text, uuid, text, int, int, int, int, text)',
    'public.admin_broadcast_history(int)',
    'public.admin_settings_get()',
    'public.admin_settings_set(text, text, jsonb)',
    'public.admin_clear_reports(text, text, text)',
    'public.render_broadcast_slots(text, text, text)'
  ];
begin
  foreach sig in array sigs loop
    execute format('revoke all on function %s from public, anon, authenticated', sig);
    execute format('grant execute on function %s to service_role', sig);
  end loop;
end $$;

-- enforce_registration_open is deliberately not revoked: it is a trigger
-- function and Postgres calls it as the table owner regardless of who holds
-- EXECUTE. Revoking from public would not add a boundary, and a trigger that
-- cannot be called is a table that cannot be inserted into.
