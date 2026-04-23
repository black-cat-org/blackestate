-- Sub-plan 2026-04-23 (Lote 1 QA gap G13) — custom_access_token_hook consistency
--
-- MIRROR of two Supabase migrations applied 2026-04-23 via
-- `mcp__supabase__apply_migration`:
--   1. `custom_access_token_hook_nullif_trim` — initial fix (display_name coalesce)
--   2. `custom_access_token_hook_review_fixes` — code-reviewer M2 + m2 applied
--
-- This file is the canonical source of truth in the repo from this point
-- forward. `003_custom_access_token_hook.sql` is SUPERSEDED.
--
-- WHY:
--   Code review during sub-plan 011 (G11 + G12) surfaced an inconsistency
--   between the JWT hook in 003 and the canonical `handle_new_user` in 011.
--   The trigger applies `nullif(trim(...), '')` when reading `full_name` /
--   `name` from `raw_user_meta_data`, so whitespace-only metadata gracefully
--   falls through to the next fallback. The JWT hook did a raw coalesce,
--   meaning a value like `"   "` would land in the `user_name` JWT claim
--   verbatim and show up as a visibly blank display name in the UI.
--
-- WHAT:
--   Replace the display_name coalesce chain with the same four-level fallback
--   used in 011: full_name → name → email local part → literal 'User',
--   each wrapped in `nullif(trim(...), '')` so whitespace/empty values fall
--   through. Always inject `user_name` (never silently omit it) — if the
--   auth.users SELECT returned zero rows in a rare ordering edge case,
--   fall through to 'User' instead of dropping the claim.
--
--   Inline the grants + revokes + table-grants block from sub-plan 03 so
--   applying this file to a fresh database (new staging, DR restore) still
--   ends up with correctly-permissioned hook. All grant statements are
--   idempotent.

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
  -- Four-level fallback matching `handle_new_user` in sub-plan 011:
  -- full_name → name → email local part → literal 'User'. The `nullif(trim(...), '')`
  -- wrappers ensure whitespace-only metadata falls through instead of producing
  -- a visibly blank `user_name` claim in the JWT.
  select coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  )
    into display_name
    from auth.users u
    where u.id = target_user_id
    limit 1;

  -- Inject claims. jsonb_set overwrites if present, creates if missing.
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

  -- Review fix (m2): always inject `user_name`. If auth.users SELECT
  -- returned zero rows (edge case: hook fires before the row is visible),
  -- fall through to the literal 'User' instead of silently omitting the
  -- claim.
  claims := jsonb_set(claims, '{user_name}', to_jsonb(coalesce(display_name, 'User')));

  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;


-- ─── Grants — inlined from sub-plan 03 for drift protection (review fix M2) ──
--
-- Applying this file to a fresh DB (new staging, DR restore) without sub-plan
-- 03 would otherwise leave the hook with the wrong execute permissions.
-- All statements are idempotent.

grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;

-- Tables the hook reads. Least-privilege — only SELECT on what's needed.
grant select on public.user_active_org to supabase_auth_admin;
grant select on public.member          to supabase_auth_admin;
grant select on public.platform_admins to supabase_auth_admin;

-- Lockdown: prevent any other role from executing the hook directly.
revoke execute
  on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;
