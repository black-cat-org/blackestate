-- Sub-plan 05 (Block A) — Org creation lifecycle trigger + index optimization
--
-- Replaces the Better Auth `hooks.after` org-creation pattern with a single
-- DB trigger on `auth.users`. When Supabase Auth inserts a new user (via
-- admin.inviteUserByEmail, email signup, OAuth callback, etc.) the trigger:
--
--   1. Generates a unique organization slug from the email local part.
--   2. Creates public.organization (plan='free', max_seats=1).
--   3. Creates public.member row granting the user OWNER role.
--   4. Sets public.user_active_org so the JWT hook (sub-plan 03) can emit
--      active_org_id/org_role claims on the very first token.
--
-- Design notes:
--   - SECURITY DEFINER + set search_path = '': canonical Supabase-safe pattern.
--     Runs with owner privs so it can INSERT into public.* (RLS for member/
--     organization/user_active_org lands in sub-plan 07; this trigger needs
--     elevation to bootstrap the tenancy before any policies apply).
--   - EXCEPTION WHEN OTHERS RETURN NEW: critical defensive behavior. An
--     unhandled exception would roll back the INSERT on auth.users — signup
--     would fail for the user. Instead we swallow the error, RAISE WARNING
--     for ops visibility, and let the user exist. The custom_access_token
--     hook (sub-plan 03) already handles "user without org" gracefully
--     (active_org_id: null), so the UI can recover by showing a "create
--     organization" prompt.
--   - RETURN NEW is required for AFTER INSERT triggers in PL/pgSQL.
--
-- Also included (deferred from sub-plan 01 review):
--   - Drop member_deleted_at_idx (full index, not useful for the hot path).
--   - Create member_active_user_org_idx as a partial index covering queries
--     with deleted_at IS NULL (which is every read the hook/RLS does).


-- ─── Partial index for member hot path ─────────────────────────────────────

drop index if exists public.member_deleted_at_idx;

create index if not exists member_active_user_org_idx
  on public.member (user_id, organization_id)
  where deleted_at is null;


-- ─── Trigger function ──────────────────────────────────────────────────────
--
-- SECURITY DEFINER runs with the function OWNER's privileges. In Supabase the
-- standard migration executor is the `postgres` superuser, which owns public.*
-- tables by default — INSERTs succeed without explicit grants.
--
-- Belt-and-suspenders: we also explicitly grant INSERT on the three target
-- tables to `supabase_auth_admin` below. If ownership ever drifts (function
-- recreated by a restricted role, tables ownership changes), the grants
-- prevent silent failures that would leave users without orgs.
--
-- Verify ownership at any time with:
--   SELECT proowner::regrole FROM pg_proc WHERE proname = 'handle_new_user';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
  base_slug text;
  final_slug text;
  user_email text;
  display_name text;
  timestamp_suffix text;
begin
  -- `auth.users.email` is nullable (phone auth, anonymous auth — future-proof).
  -- All downstream derivations tolerate NULL via explicit fallbacks.
  user_email := new.email;

  -- Display name coalesce — prefer Supabase standard `full_name`, fall back to
  -- OAuth `name` (Google), then full email (matches JWT hook sub-plan 03's
  -- three-level fallback exactly), then literal 'User' for the NULL-email edge
  -- (phone/anon auth). Keeps the trigger and the hook aligned so the org name
  -- and the JWT user_name claim stay consistent.
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    user_email,
    'User'
  );

  -- Slug from email local part. `[^a-z0-9]+` with `+` collapses runs of
  -- non-alphanumeric chars into a single hyphen in one pass. Guard against
  -- NULL email by falling back to user id fragment.
  base_slug := lower(regexp_replace(
    coalesce(split_part(user_email, '@', 1), substr(new.id::text, 1, 8)),
    '[^a-z0-9]+', '-', 'g'
  ));
  base_slug := trim(both '-' from substr(base_slug, 1, 30));
  if base_slug = '' then
    base_slug := 'user';
  end if;

  -- Append ms timestamp as hex suffix for high-entropy uniqueness.
  timestamp_suffix := lower(to_hex((extract(epoch from now()) * 1000)::bigint));
  final_slug := base_slug || '-' || timestamp_suffix;

  -- Race-safe insertion: try the computed slug first. If a concurrent trigger
  -- grabbed the same slug (same email local part + same millisecond — vanish-
  -- ingly rare), the inner EXCEPTION handler retries once with an md5-of-
  -- user-id suffix guaranteed unique per sign-up.
  begin
    insert into public.organization (id, name, slug, plan, max_seats)
    values (gen_random_uuid(), display_name, final_slug, 'free', 1)
    returning id into new_org_id;
  exception
    when unique_violation then
      final_slug := final_slug || '-' || substr(md5(new.id::text), 1, 6);
      insert into public.organization (id, name, slug, plan, max_seats)
      values (gen_random_uuid(), display_name, final_slug, 'free', 1)
      returning id into new_org_id;
  end;

  insert into public.member (user_id, organization_id, role, email, name, avatar_url)
  values (
    new.id,
    new_org_id,
    'owner',
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.user_active_org (user_id, organization_id)
  values (new.id, new_org_id);

  return new;

exception
  when others then
    -- Outer handler: any other failure (grants, constraints not covered above,
    -- connection issues). Never block sign-up — log for ops visibility, return
    -- NEW so the auth.users INSERT commits. User lands without an org; JWT
    -- hook (sub-plan 03) emits active_org_id=null and UI recovers.
    raise warning 'handle_new_user failed for user % (email=%): SQLSTATE=% message=%',
      new.id, user_email, sqlstate, sqlerrm;
    return new;
end;
$$;


-- Execution grant for the Auth service.
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Belt-and-suspenders INSERT grants (see SECURITY DEFINER note above).
-- Safe redundancy: if the function runs as `postgres` these are no-ops;
-- if ownership ever drifts, these prevent silent org-creation failures.
grant insert on public.organization    to supabase_auth_admin;
grant insert on public.member          to supabase_auth_admin;
grant insert on public.user_active_org to supabase_auth_admin;

-- Revoke execute from everyone else — no legitimate caller outside the trigger.
revoke execute on function public.handle_new_user() from authenticated, anon, public;


-- ─── Trigger definition ────────────────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
