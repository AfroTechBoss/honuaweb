-- ============================================================
-- Honua Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run: drops everything and recreates cleanly
-- ============================================================

-- ── Drop existing tables (reverse dependency order) ──────────
drop table if exists public.impact_logs  cascade;
drop table if exists public.achievements cascade;
drop table if exists public.projects     cascade;
drop table if exists public.likes        cascade;
drop table if exists public.follows      cascade;
drop table if exists public.comments     cascade;
drop table if exists public.posts        cascade;
drop table if exists public.profiles     cascade;

-- ── Drop existing trigger & function ─────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ── Drop existing storage policies ───────────────────────────
drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_owner_upload"  on storage.objects;
drop policy if exists "avatars_owner_update"  on storage.objects;
drop policy if exists "avatars_owner_delete"  on storage.objects;
drop policy if exists "covers_public_read"    on storage.objects;
drop policy if exists "covers_owner_upload"   on storage.objects;
drop policy if exists "posts_public_read"     on storage.objects;
drop policy if exists "posts_owner_upload"    on storage.objects;
drop policy if exists "projects_public_read"  on storage.objects;
drop policy if exists "projects_owner_upload" on storage.objects;

-- ============================================================
-- Tables
-- ============================================================

-- ── Profiles (extends auth.users) ───────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  handle           text unique not null,
  full_name        text,
  bio              text,
  avatar_url       text,
  cover_url        text,
  location         text,
  website          text,
  dob              date,
  interests        text[]   default '{}',
  impact_score     integer  default 0,
  co2_avoided_kg   numeric  default 0,
  green_points     integer  default 0,
  verified         boolean  default false,
  marketing_emails boolean  default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Posts ────────────────────────────────────────────────────
create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  content          text,
  image_url        text,
  post_type        text    default 'post',
  is_repost        boolean default false,
  original_post_id uuid    references public.posts(id) on delete set null,
  likes_count      integer default 0,
  reposts_count    integer default 0,
  comments_count   integer default 0,
  co2_saved_kg     numeric default 0,
  created_at       timestamptz default now()
);

-- ── Comments ─────────────────────────────────────────────────
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz default now()
);

-- ── Likes ────────────────────────────────────────────────────
create table public.likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ── Follows ──────────────────────────────────────────────────
create table public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ── Achievements ─────────────────────────────────────────────
create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  icon        text,
  earned_at   timestamptz default now()
);

-- ── Impact logs ──────────────────────────────────────────────
create table public.impact_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  action       text not null,
  category     text,
  co2_saved_kg numeric default 0,
  points       integer default 0,
  verified     boolean default false,
  logged_at    timestamptz default now()
);

-- ── Projects ─────────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  cover_url   text,
  status      text    default 'active',
  members     integer default 1,
  impact_kg   numeric default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, full_name, avatar_url, bio, location, interests, marketing_emails)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'bio',
    new.raw_user_meta_data->>'location',
    case
      when new.raw_user_meta_data->'interests' is not null
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'interests'))
      else '{}'
    end,
    coalesce((new.raw_user_meta_data->>'marketing_emails')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.posts        enable row level security;
alter table public.comments     enable row level security;
alter table public.likes        enable row level security;
alter table public.follows      enable row level security;
alter table public.achievements enable row level security;
alter table public.impact_logs  enable row level security;
alter table public.projects     enable row level security;

-- Profiles
create policy "profiles_public_read"  on public.profiles for select using (true);
create policy "profiles_owner_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_owner_update" on public.profiles for update using (auth.uid() = id);

-- Posts
create policy "posts_public_read"   on public.posts for select using (true);
create policy "posts_owner_insert"  on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_owner_update"  on public.posts for update using (auth.uid() = user_id);
create policy "posts_owner_delete"  on public.posts for delete using (auth.uid() = user_id);

-- Comments
create policy "comments_public_read"  on public.comments for select using (true);
create policy "comments_owner_insert" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_owner_delete" on public.comments for delete using (auth.uid() = user_id);

-- Likes
create policy "likes_public_read"   on public.likes for select using (true);
create policy "likes_owner_insert"  on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_owner_delete"  on public.likes for delete using (auth.uid() = user_id);

-- Follows
create policy "follows_public_read"   on public.follows for select using (true);
create policy "follows_owner_insert"  on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_owner_delete"  on public.follows for delete using (auth.uid() = follower_id);

-- Achievements
create policy "achievements_public_read"   on public.achievements for select using (true);
create policy "achievements_owner_insert"  on public.achievements for insert with check (auth.uid() = user_id);

-- Impact logs
create policy "impact_logs_public_read"   on public.impact_logs for select using (true);
create policy "impact_logs_owner_insert"  on public.impact_logs for insert with check (auth.uid() = user_id);

-- Projects
create policy "projects_public_read"   on public.projects for select using (true);
create policy "projects_owner_insert"  on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_owner_update"  on public.projects for update using (auth.uid() = user_id);

-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars',  'avatars',  true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('covers',   'covers',   true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('posts',    'posts',    true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('projects', 'projects', true) on conflict (id) do nothing;

-- Storage RLS: public read, authenticated users write to their own folder
create policy "avatars_public_read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_owner_upload"  on storage.objects for insert with check (bucket_id = 'avatars'  and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_owner_update"  on storage.objects for update using  (bucket_id = 'avatars'  and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_owner_delete"  on storage.objects for delete using  (bucket_id = 'avatars'  and auth.uid()::text = (storage.foldername(name))[1]);

create policy "covers_public_read"    on storage.objects for select using (bucket_id = 'covers');
create policy "covers_owner_upload"   on storage.objects for insert with check (bucket_id = 'covers'   and auth.uid()::text = (storage.foldername(name))[1]);

create policy "posts_public_read"     on storage.objects for select using (bucket_id = 'posts');
create policy "posts_owner_upload"    on storage.objects for insert with check (bucket_id = 'posts'    and auth.uid()::text = (storage.foldername(name))[1]);

create policy "projects_public_read"  on storage.objects for select using (bucket_id = 'projects');
create policy "projects_owner_upload" on storage.objects for insert with check (bucket_id = 'projects' and auth.uid()::text = (storage.foldername(name))[1]);
