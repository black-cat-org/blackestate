-- ⚠️ SUPERSEDED BY drizzle/sql/012_custom_access_token_hook_nullif_trim.sql (2026-04-23)
--
-- Sub-plan 2026-04-23 (QA Lote 1 gap G13) replaced the `display_name`
-- coalesce chain in this hook with the same `nullif(trim(...), '')` pattern
-- that `handle_new_user` already uses in sub-plan 011. Without that wrapper
-- a whitespace-only `full_name` metadata value would land verbatim in the
-- `user_name` JWT claim and render as a blank display name in the UI.
--
-- This file is retained for historical context of the original sub-plan 03
-- design. Do NOT re-run it — it will overwrite the canonical hook from 012
-- with the older coalesce pattern.
--
-- ─── Original header (historical) ──────────────────────────────────────────
-- Sub-plan 03 — Custom Access Token Hook
--
-- Enriches every JWT issued by Supabase Auth with multitenancy claims.
-- Runs on every token emission (sign-in, token_refresh, etc.).
--
-- Claims added (top-level of the JWT, accessible via auth.jwt() ->> 'x'):
--   active_org_id  uuid  — organization the user is currently acting under
--   org_role       text  — user's role in that organization (owner/admin/agent)
--   is_super_admin bool  — global flag for cross-tenant admin access
--   user_name      text  — display name (for UI header only — NEVER use for auth)
--
-- Reads from:
--   public.user_active_org  (PK user_id → one row per user)
--   public.member           (user_id + organization_id → role)
--   public.platform_admins  (PK user_id → presence = super admin)
--   auth.users              (raw_user_meta_data ->> 'full_name')
--
-- Security posture:
--   - language plpgsql
--   - marker STABLE (read-only; accurate metadata even though Supabase Auth
--     invokes the hook as a single call per token emission, not in a context
--     where the planner can amortize repeated calls — no observable speedup,
--     but the marker correctly describes the function's nature)
--   - search_path = '' forces explicit schema prefixes, preventing takeover
--     attacks via user-owned schemas in the search_path (supabase skill rule)
--   - No SECURITY DEFINER — supabase_auth_admin already bypasses RLS; using
--     invoker rights keeps the attack surface minimal
--   - Grants narrowly to supabase_auth_admin; revoked from authenticated/
--     anon/public
--
-- Enabled via Dashboard → Authentication → Hooks → Custom Access Token →
-- select public.custom_access_token_hook → Save.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  target_user_id uuid;
  claims jsonb;
  active_org uuid;
  member_role text;
  super_admin boolean;
  display_name text;
begin
  target_user_id := (event ->> 'user_id')::uuid;
  claims := event -> 'claims';

  -- 1. Active organization (may be null for brand-new users before trigger runs)
  select uao.organization_id
    into active_org
    from public.user_active_org uao
    where uao.user_id = target_user_id
    limit 1;

  -- 2. Role within that organization
  if active_org is not null then
    select m.role::text
      into member_role
      from public.member m
      where m.user_id = target_user_id
        and m.organization_id = active_org
        and m.deleted_at is null
      limit 1;

    -- Orphan defense: user_active_org points to an org the user is no longer
    -- a member of (soft-deleted, removed, data drift). Clearing active_org
    -- here forces both active_org_id and org_role claims to emit as null so
    -- downstream RLS policies cannot match the dangling org_id.
    if member_role is null then
      active_org := null;
    end if;
  end if;

  -- 3. Super admin flag
  select exists(
    select 1 from public.platform_admins pa
    where pa.user_id = target_user_id
  ) into super_admin;

  -- 4. Display name (UI-only — never used for authorization decisions).
  -- Three-level fallback: Supabase standard `full_name` → OAuth providers
  -- like Google populate `name` → email as last resort. Matches the same
  -- coalesce pattern used by the org-creation trigger in sub-plan 05.
  select coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    u.email
  )
    into display_name
    from auth.users u
    where u.id = target_user_id
    limit 1;

  -- Inject claims. jsonb_set overwrites if present, creates if missing.
  -- Explicit null values make downstream reads predictable (auth.jwt() ->> 'x' returns NULL vs missing-key behavior).
  claims := jsonb_set(
    claims,
    '{active_org_id}',
    case when active_org is null then 'null'::jsonb else to_jsonb(active_org::text) end
  );
  claims := jsonb_set(
    claims,
    '{org_role}',
    case when member_role is null then 'null'::jsonb else to_jsonb(member_role) end
  );
  claims := jsonb_set(
    claims,
    '{is_super_admin}',
    to_jsonb(coalesce(super_admin, false))
  );

  if display_name is not null then
    claims := jsonb_set(claims, '{user_name}', to_jsonb(display_name));
  end if;

  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;


-- Grants — supabase_auth_admin executes the hook on behalf of the Auth service.
grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;

-- Tables the hook reads. Least-privilege: only SELECT on the exact columns needed.
grant select on public.user_active_org to supabase_auth_admin;
grant select on public.member to supabase_auth_admin;
grant select on public.platform_admins to supabase_auth_admin;

-- Lockdown: prevent any other role from executing the hook directly.
revoke execute
  on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;
