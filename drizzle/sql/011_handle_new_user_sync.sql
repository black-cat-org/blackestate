-- Sub-plan 2026-04-23 (Lote 1 QA gaps G11 + G12) — Slug consistency + trigger sync
--
-- MIRROR of two Supabase migrations applied 2026-04-23 via
-- `mcp__supabase__apply_migration`:
--   1. `handle_new_user_sync_with_slug_suffix` — initial canonical version
--   2. `handle_new_user_sync_review_fixes` — applied code-reviewer fixes
--      (atomicity M1 + anon grant M2 + member.name regression M3)
--
-- This file is the canonical source of truth in the repo from this point
-- forward. `005_org_creation_trigger.sql` is SUPERSEDED by this file.
--
-- WHY:
--   G11 (P1): drifted source of truth. `005_org_creation_trigger.sql` had a
--     different version than what was running in DB. This migration captures
--     the canonical version in both the Supabase migrations table and this
--     repo file.
--   G12 (P2): slug format was inconsistent — suffix added only on collision.
--     Canonical format is now `{base-slug}-{7char-random}` for every new org.
--
-- WHAT:
--   1. Helper `public.random_base62(len int)` — crypto-random via
--      `extensions.gen_random_bytes` (pgcrypto in Supabase default).
--      EXECUTE granted to `authenticated` + `supabase_auth_admin` only;
--      REVOKE from `anon` + `public` (least privilege).
--   2. Replaces `public.handle_new_user()` with a canonical version that:
--      - Derives `base_slug` from `display_name` (keeps emails out of URLs).
--      - ALWAYS appends a 7-char base62 random suffix (62^7 = 3.5T → safe).
--      - Wraps all three inserts (organization + member + user_active_org)
--        in a single savepoint block — all three commit together or the
--        partial state rolls back and retries with a 10-char suffix.
--      - `member.name` uses the coalesced `display_name` (no null regression
--        for email-only users with null full_name).
--      - SECURITY DEFINER + `search_path = ''` + outer exception handler
--        that never blocks sign-up.
--   3. Re-declares `on_auth_user_created` idempotently.
--
-- DOES NOT:
--   - Migrate existing slugs. The 4 orgs created pre-migration keep their
--     suffix-less slugs (test-a, test-b, gonzalo-pinell, test-e).

-- ─── Helper: random_base62 ─────────────────────────────────────────────────

create or replace function public.random_base62(len int)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  chars  constant text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  bytes  bytea;
begin
  if len is null or len <= 0 then
    raise exception 'random_base62: len must be a positive integer';
  end if;

  bytes := extensions.gen_random_bytes(len);
  for i in 1..len loop
    result := result || substr(chars, (get_byte(bytes, i - 1) % 62) + 1, 1);
  end loop;
  return result;
end;
$$;

comment on function public.random_base62(int) is
  'Returns a URL-safe base62 random string of N chars using crypto-random bytes (pgcrypto gen_random_bytes). Used for org slug suffixes to guarantee collision-free uniqueness without leaking timestamps or user ids.';

-- Least-privilege grants: only callers that legitimately need this are
-- `supabase_auth_admin` (the trigger runs as this role effectively) and
-- `authenticated` (reserved for future utility use; zero risk, pure fn).
grant execute on function public.random_base62(int) to authenticated, supabase_auth_admin;
revoke execute on function public.random_base62(int) from anon, public;


-- ─── Trigger function: handle_new_user (canonical) ─────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
  base_slug    text;
  final_slug   text;
  new_org_id   uuid;
begin
  -- Display name coalesce: OAuth `full_name` → `name` → email local-part →
  -- literal `User` for phone/anon auth edge cases.
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );

  -- Base slug: slugify display_name. Clamp at 30 chars so the final
  -- `{base}-{7}` stays under 38. Trim hyphen artifacts from clamping.
  base_slug := lower(regexp_replace(
    regexp_replace(display_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  base_slug := trim(both '-' from substr(base_slug, 1, 30));
  if base_slug = '' then
    base_slug := 'org';
  end if;

  -- G12: ALWAYS append a 7-char random suffix. 62^7 = 3.5T → collision-free.
  final_slug := base_slug || '-' || public.random_base62(7);

  -- Atomicity (review fix M1): wrap all three inserts in a single savepoint
  -- block. Any failure inside rolls back partial state (no orphan org rows).
  -- A unique_violation (realistically only on org.slug) triggers a retry
  -- with a 10-char suffix for bulletproof uniqueness.
  begin
    insert into public.organization (id, name, slug, plan, max_seats)
    values (gen_random_uuid(), display_name, final_slug, 'free', 1)
    returning id into new_org_id;

    -- Review fix M3: use coalesced `display_name` so member.name never
    -- diverges from organization.name (e.g., null for email-auth users
    -- with null full_name metadata).
    insert into public.member (user_id, organization_id, role, email, name, avatar_url)
    values (
      new.id,
      new_org_id,
      'owner',
      new.email,
      display_name,
      new.raw_user_meta_data->>'avatar_url'
    );

    insert into public.user_active_org (user_id, organization_id)
    values (new.id, new_org_id);
  exception
    when unique_violation then
      final_slug := base_slug || '-' || public.random_base62(10);

      insert into public.organization (id, name, slug, plan, max_seats)
      values (gen_random_uuid(), display_name, final_slug, 'free', 1)
      returning id into new_org_id;

      insert into public.member (user_id, organization_id, role, email, name, avatar_url)
      values (
        new.id,
        new_org_id,
        'owner',
        new.email,
        display_name,
        new.raw_user_meta_data->>'avatar_url'
      );

      insert into public.user_active_org (user_id, organization_id)
      values (new.id, new_org_id);
  end;

  return new;

exception
  when others then
    -- Outer handler: never block sign-up. Only fires on non-unique-violation
    -- errors (grants, connection issues, constraint bugs). User exists in
    -- auth.users without public.organization; JWT hook emits
    -- active_org_id=null; UI surfaces a recovery path.
    raise warning '[handle_new_user] failed for user % (email=%): SQLSTATE=% message=%',
      new.id, new.email, sqlstate, sqlerrm;
    return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT trigger on auth.users. Creates public.organization + public.member(owner) + public.user_active_org ATOMICALLY (all-or-nothing via inner savepoint). Slug = lower(slugify(display_name)) + ''-'' + random_base62(7).';

grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Belt-and-suspenders INSERT grants (from sub-plan 05, kept for drift protection).
grant insert on public.organization    to supabase_auth_admin;
grant insert on public.member          to supabase_auth_admin;
grant insert on public.user_active_org to supabase_auth_admin;

-- Revoke execute from everyone else.
revoke execute on function public.handle_new_user() from authenticated, anon, public;


-- ─── Trigger binding ───────────────────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
