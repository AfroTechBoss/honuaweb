-- ============================================================
-- Migration 031: Database linter hardening
--
-- Closes everything the Supabase linter flagged that can be closed in SQL:
--
--   1. function_search_path_mutable  (11 functions)
--   2. anon_security_definer_function_executable      (11)
--   3. authenticated_security_definer_function_executable (11)
--   4. public_bucket_allows_listing  (avatars, covers, posts, projects, stories)
--
-- The fifth finding, auth_leaked_password_protection, is a dashboard setting
-- and has no SQL equivalent — see the note at the bottom.
--
-- Nothing here rewrites a function body. Everything is either an ALTER on an
-- existing function or a policy swap, so it is safe to re-run and it can't
-- silently revert logic added by a later migration.
-- ============================================================


-- ── 1. Pin search_path on every function in public ──────────
--
-- A SECURITY DEFINER function with an unpinned search_path runs its body with
-- whatever schema list the *caller* set. Anyone who can create a schema can
-- then put their own `posts` table in front of the real one and have a trigger
-- running as the table owner write to it instead.
--
-- Done as a loop over pg_proc rather than eleven hand-written ALTERs: the list
-- came from a linter run, and hard-coding it means the next function someone
-- adds is flagged all over again. This fixes whatever is actually there.
--
-- pg_temp is listed *last* on purpose. If it isn't named at all, Postgres
-- searches the temp schema first, which is the same shadowing problem wearing
-- a different hat.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
        where cfg like 'search\_path=%'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn.sig);
    raise notice 'pinned search_path on %', fn.sig;
  end loop;
end $$;


-- ── 2 & 3. Take EXECUTE away from browser roles ─────────────
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, so every
-- trigger function in this schema is callable by name over PostgREST. They
-- are all SECURITY DEFINER, which is the combination the linter is pointing
-- at: a hand-built trigger record aimed at, say, handle_impact_vouch() would
-- run with the owner's rights.
--
-- Scoped to functions that return `trigger`. Those are only ever invoked by
-- the trigger machinery, which does not check EXECUTE, so revoking costs
-- nothing. Ordinary functions are deliberately left alone — the app has no
-- .rpc() calls today, but a blanket revoke would break the first one someone
-- writes, in a way that is very hard to trace back to here.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
    raise notice 'revoked execute on %', fn.sig;
  end loop;
end $$;


-- ── 4. Stop anonymous listing of the public buckets ─────────
--
-- All five buckets are marked `public`, and each had a SELECT policy of the
-- form `using (bucket_id = 'avatars')` — no owner check. That policy is not
-- what makes an <img src> work: for a public bucket the storage API serves
-- /object/public/<bucket>/<path> without consulting RLS at all. What it does
-- do is authorise the *list* endpoint, so anyone holding the anon key can
-- enumerate every file every user has ever uploaded, including the ones no
-- profile links to any more.
--
-- Replaced with an owner-scoped policy. Verified against the app first:
--   · lib/storage.ts uses upload / getPublicUrl / remove — none read via RLS
--     (getPublicUrl builds a string client-side and never calls the server)
--   · the only .list() calls are in app/api/delete-account/route.ts, which
--     runs on the service-role client and bypasses RLS entirely
-- so nothing in the app loses a read it was using.
do $$
declare
  b text;
begin
  foreach b in array array['avatars', 'covers', 'posts', 'projects', 'stories'] loop
    -- Old names differ per bucket: schema.sql used <bucket>_public_read,
    -- migrate_stories.sql used stories_media_read.
    execute format('drop policy if exists %I on storage.objects', b || '_public_read');
    execute format('drop policy if exists %I on storage.objects', b || '_media_read');
    execute format('drop policy if exists %I on storage.objects', b || '_owner_read');

    execute format($f$
      create policy %I on storage.objects
        for select to authenticated
        using (bucket_id = %L and auth.uid()::text = (storage.foldername(name))[1])
    $f$, b || '_owner_read', b);
  end loop;
end $$;


-- ── 5. Not fixable here: auth_leaked_password_protection ────
--
-- Supabase can check new passwords against the HaveIBeenPwned corpus before
-- accepting them. It lives in GoTrue's config, not in this database, so it
-- has to be switched on in the dashboard:
--
--   Authentication → Providers → Email → "Prevent use of leaked passwords"
--
-- Worth doing. Every account here signs in with a password, and a credential
-- stuffed from someone else's breach is the likeliest way one gets taken.
