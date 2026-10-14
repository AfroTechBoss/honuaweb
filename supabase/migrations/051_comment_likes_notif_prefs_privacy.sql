-- ============================================================================
-- 051 — Comment likes, notification preferences, privacy settings
-- ============================================================================
--
-- Three settings that until now only lived in React state:
--
--   1. Comment likes      — comment_likes + comments.likes_count.
--   2. Notification prefs — one row per user; a BEFORE INSERT trigger on
--                           notifications drops anything the recipient has
--                           switched off, so every writer (client, cron route,
--                           admin route, SQL broadcast) is covered at once.
--   3. Privacy            — private accounts with follow requests, hidden
--                           location, activity status, tips, and who may
--                           start a conversation with you.
--
-- Also closes a hole in notifications: the old insert policy accepted
-- `actor_id is null`, so any signed-in user could write themselves (or anyone)
-- an actorless "account verified" or admin-broadcast notification. Clients may
-- now only insert social notifications they are the actor of. Server writers
-- use the service role or security definer and are unaffected.
--
-- Idempotent. Run in Supabase Dashboard → SQL Editor.


-- ── 1. Comment likes ─────────────────────────────────────────────────────────

alter table public.comments add column if not exists likes_count integer not null default 0;

create table if not exists public.comment_likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

drop policy if exists comment_likes_public_read  on public.comment_likes;
drop policy if exists comment_likes_owner_insert on public.comment_likes;
drop policy if exists comment_likes_owner_delete on public.comment_likes;
create policy comment_likes_public_read  on public.comment_likes for select using (true);
create policy comment_likes_owner_insert on public.comment_likes for insert to authenticated with check (auth.uid() = user_id);
create policy comment_likes_owner_delete on public.comment_likes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.sync_comment_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set likes_count = likes_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments set likes_count = greatest(0, likes_count - 1) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comment_likes_count on public.comment_likes;
create trigger trg_comment_likes_count
after insert or delete on public.comment_likes
for each row execute function public.sync_comment_likes_count();

update public.comments c
   set likes_count = (select count(*) from public.comment_likes l where l.comment_id = c.id);


-- ── 2. Notification preferences ──────────────────────────────────────────────
--
-- No row means everything on. Account, verification, badge and admin
-- notifications have no column: they are always delivered.

create table if not exists public.notification_prefs (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  likes      boolean not null default true,   -- likes and reposts
  comments   boolean not null default true,   -- comments and replies
  mentions   boolean not null default true,
  follows    boolean not null default true,   -- new followers and follow requests
  messages   boolean not null default true,
  vouches    boolean not null default true,
  streaks    boolean not null default true,   -- streak reminders from the cron
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists notif_prefs_owner_select on public.notification_prefs;
drop policy if exists notif_prefs_owner_insert on public.notification_prefs;
drop policy if exists notif_prefs_owner_update on public.notification_prefs;
create policy notif_prefs_owner_select on public.notification_prefs for select to authenticated using (auth.uid() = user_id);
create policy notif_prefs_owner_insert on public.notification_prefs for insert to authenticated with check (auth.uid() = user_id);
create policy notif_prefs_owner_update on public.notification_prefs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.notification_allowed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p public.notification_prefs;
begin
  -- Nobody is notified about their own actions.
  if new.actor_id is not null and new.actor_id = new.user_id then
    return null;
  end if;

  select * into p from public.notification_prefs where user_id = new.user_id;
  if not found then
    return new;
  end if;

  if (new.type = 'like'                              and not p.likes)
  or (new.type in ('comment', 'reply')               and not p.comments)
  or (new.type = 'mention'                           and not p.mentions)
  or (new.type in ('follow', 'follow_request')       and not p.follows)
  or (new.type = 'message'                           and not p.messages)
  or (new.type = 'vouch'                             and not p.vouches)
  or (new.type in ('streak_risk', 'streak_ended')    and not p.streaks)
  then
    return null;  -- silently skipped; the insert reports success
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notification_allowed on public.notifications;
create trigger trg_notification_allowed
before insert on public.notifications
for each row execute function public.notification_allowed();

-- The insert policy fix described at the top.
drop policy if exists notifs_authed_insert on public.notifications;
drop policy if exists notifs_actor_insert  on public.notifications;
create policy notifs_actor_insert on public.notifications
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and user_id <> auth.uid()
    and type in ('like', 'follow', 'follow_request', 'comment', 'reply',
                 'mention', 'vouch', 'message', 'community_invite')
  );


-- ── 3. Privacy settings ──────────────────────────────────────────────────────

alter table public.profiles add column if not exists is_private         boolean not null default false;
alter table public.profiles add column if not exists show_location      boolean not null default true;
alter table public.profiles add column if not exists show_activity      boolean not null default true;
alter table public.profiles add column if not exists allow_tips         boolean not null default true;
alter table public.profiles add column if not exists message_permission text    not null default 'everyone';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_message_permission_check') then
    alter table public.profiles add constraint profiles_message_permission_check
      check (message_permission in ('everyone', 'following', 'nobody'));
  end if;
end $$;


-- 3a. Hidden location ---------------------------------------------------------
--
-- profiles is world-readable, so hiding location in the UI alone would leave
-- it one API call away. While show_location is off the value is moved into an
-- owner-only table and the public column is null. Turning it back on restores it.

create table if not exists public.profile_hidden_fields (
  user_id  uuid primary key references public.profiles(id) on delete cascade,
  location text
);

alter table public.profile_hidden_fields enable row level security;

drop policy if exists profile_hidden_owner_read on public.profile_hidden_fields;
create policy profile_hidden_owner_read on public.profile_hidden_fields
  for select to authenticated using (auth.uid() = user_id);
-- Writes happen only through the trigger below.

create or replace function public.stash_hidden_location()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not new.show_location then
    if new.location is not null then
      insert into public.profile_hidden_fields (user_id, location)
      values (new.id, new.location)
      on conflict (user_id) do update set location = excluded.location;
      new.location := null;
    end if;
  elsif tg_op = 'UPDATE' and not old.show_location then
    if new.location is null then
      select location into new.location from public.profile_hidden_fields where user_id = new.id;
    end if;
    delete from public.profile_hidden_fields where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stash_hidden_location on public.profiles;
create trigger trg_stash_hidden_location
before insert or update of location, show_location on public.profiles
for each row execute function public.stash_hidden_location();


-- 3b. Activity status ---------------------------------------------------------
--
-- Kept off profiles for the same reason: a last-seen column there would be
-- readable whatever show_activity said.

create table if not exists public.user_presence (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

drop policy if exists presence_visible_read on public.user_presence;
create policy presence_visible_read on public.user_presence
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = user_id and p.show_activity)
  );

create or replace function public.touch_presence()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.user_presence (user_id, last_seen_at)
  select auth.uid(), now()
  where auth.uid() is not null
  on conflict (user_id) do update set last_seen_at = now();
$$;

revoke all on function public.touch_presence() from public;
grant execute on function public.touch_presence() to authenticated;


-- 3c. Private accounts --------------------------------------------------------

create or replace function public.can_view_posts_of(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_author = auth.uid()
      or not coalesce((select is_private from public.profiles where id = p_author), false)
      or exists (select 1 from public.follows
                  where follower_id = auth.uid() and following_id = p_author);
$$;

grant execute on function public.can_view_posts_of(uuid) to authenticated, anon;

-- Restrictive, so it narrows whatever permissive read policies exist rather
-- than depending on their exact names.
drop policy if exists "private accounts hide posts" on public.posts;
create policy "private accounts hide posts" on public.posts
  as restrictive for select
  using (public.can_view_posts_of(user_id));

-- A comment is visible exactly when its post is. The subquery runs under the
-- caller's RLS, so it inherits the rule above.
drop policy if exists "private accounts hide comments" on public.comments;
create policy "private accounts hide comments" on public.comments
  as restrictive for select
  using (exists (select 1 from public.posts p where p.id = post_id));

do $$ begin
  if to_regclass('public.stories') is not null then
    execute 'drop policy if exists "private accounts hide stories" on public.stories';
    execute 'create policy "private accounts hide stories" on public.stories
               as restrictive for select using (public.can_view_posts_of(user_id))';
  end if;
end $$;

create table if not exists public.follow_requests (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id    uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (requester_id, target_id),
  check (requester_id <> target_id)
);
create index if not exists follow_requests_target_idx on public.follow_requests (target_id, created_at desc);

alter table public.follow_requests enable row level security;

drop policy if exists follow_requests_party_read     on public.follow_requests;
drop policy if exists follow_requests_request        on public.follow_requests;
drop policy if exists follow_requests_party_delete   on public.follow_requests;
create policy follow_requests_party_read on public.follow_requests
  for select to authenticated using (auth.uid() in (requester_id, target_id));
create policy follow_requests_request on public.follow_requests
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and exists (select 1 from public.profiles where id = target_id and is_private)
  );
-- Requester withdraws, or target declines.
create policy follow_requests_party_delete on public.follow_requests
  for delete to authenticated using (auth.uid() in (requester_id, target_id));

-- Following a private account directly is refused; it has to go through a request.
drop policy if exists "private accounts need a request" on public.follows;
create policy "private accounts need a request" on public.follows
  as restrictive for insert to authenticated
  with check (not coalesce((select is_private from public.profiles where id = following_id), false));

create or replace function public.approve_follow_request(p_requester uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.follow_requests
   where requester_id = p_requester and target_id = auth.uid();
  if not found then
    return false;
  end if;

  insert into public.follows (follower_id, following_id)
  values (p_requester, auth.uid())
  on conflict do nothing;

  insert into public.notifications (user_id, actor_id, type, body)
  values (p_requester, auth.uid(), 'follow', 'accepted your follow request');

  return true;
end;
$$;

revoke all on function public.approve_follow_request(uuid) from public;
grant execute on function public.approve_follow_request(uuid) to authenticated;

-- Going public lets everyone who was waiting in.
create or replace function public.release_follow_requests()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.is_private and not new.is_private then
    insert into public.follows (follower_id, following_id)
    select requester_id, target_id from public.follow_requests where target_id = new.id
    on conflict do nothing;
    delete from public.follow_requests where target_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_release_follow_requests on public.profiles;
create trigger trg_release_follow_requests
after update of is_private on public.profiles
for each row execute function public.release_follow_requests();


-- 3d. Who can message me ------------------------------------------------------
--
-- 'everyone'  — anyone may open a conversation (it lands in Requests as before)
-- 'following' — only people this user follows
-- 'nobody'    — no new conversations
--
-- Existing accepted conversations keep working: the recipient already chose to
-- talk. Shop conversations to an approved seller are exempt, so a seller's
-- personal setting can't cut buyers off from asking about an order.

create or replace function public.can_message(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case coalesce((select message_permission from public.profiles where id = p_target), 'everyone')
           when 'everyone'  then true
           when 'following' then exists (select 1 from public.follows
                                          where follower_id = p_target and following_id = auth.uid())
           else false
         end;
$$;

grant execute on function public.can_message(uuid) to authenticated;

create or replace function public.is_approved_seller(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.seller_applications
                  where user_id = p_user and status = 'approved');
$$;

grant execute on function public.is_approved_seller(uuid) to authenticated;

create or replace function public.is_mutual_follow(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.follows where follower_id = a and following_id = b)
     and exists (select 1 from public.follows where follower_id = b and following_id = a);
$$;

grant execute on function public.is_mutual_follow(uuid, uuid) to authenticated;

drop policy if exists "message permission on new conversations" on public.conversations;
create policy "message permission on new conversations" on public.conversations
  as restrictive for insert to authenticated
  with check (
    (
      public.can_message(case when user1_id = auth.uid() then user2_id else user1_id end)
      or (shop_owner_id is not null
          and shop_owner_id = (case when user1_id = auth.uid() then user2_id else user1_id end)
          and public.is_approved_seller(shop_owner_id))
    )
    -- Skipping the request inbox needs a mutual follow, as the client assumes.
    and (status = 'pending' or public.is_mutual_follow(user1_id, user2_id))
  );

drop policy if exists "message permission on pending conversations" on public.messages;
create policy "message permission on pending conversations" on public.messages
  as restrictive for insert to authenticated
  with check (
    exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and (
           c.status = 'accepted'
           or (c.shop_owner_id is not null and public.is_approved_seller(c.shop_owner_id))
           or public.can_message(case when c.user1_id = auth.uid() then c.user2_id else c.user1_id end)
         )
    )
  );

-- The initiator (user1) can't accept their own request to get around the above.
create or replace function public.guard_conversation_accept()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status = 'pending' and new.status = 'accepted'
     and auth.uid() is not null and auth.uid() = old.user1_id
     and not public.is_mutual_follow(old.user1_id, old.user2_id) then
    raise exception 'Only the recipient can accept a message request';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_conversation_accept on public.conversations;
create trigger trg_guard_conversation_accept
before update of status on public.conversations
for each row execute function public.guard_conversation_accept();


-- ── 4. Account freeze on the new user-writable tables (see 041) ─────────────

do $$
declare t text;
begin
  foreach t in array array['comment_likes', 'follow_requests', 'notification_prefs'] loop
    execute format('drop policy if exists "frozen accounts cannot insert" on public.%I', t);
    execute format('drop policy if exists "frozen accounts cannot update" on public.%I', t);
    execute format('drop policy if exists "frozen accounts cannot delete" on public.%I', t);
    execute format($f$create policy "frozen accounts cannot insert" on public.%I
      as restrictive for insert to authenticated with check (not public.is_frozen(auth.uid()))$f$, t);
    execute format($f$create policy "frozen accounts cannot update" on public.%I
      as restrictive for update to authenticated using (not public.is_frozen(auth.uid())) with check (not public.is_frozen(auth.uid()))$f$, t);
    execute format($f$create policy "frozen accounts cannot delete" on public.%I
      as restrictive for delete to authenticated using (not public.is_frozen(auth.uid()))$f$, t);
  end loop;
end $$;
