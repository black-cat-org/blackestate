-- Sub-plan 04 — RBAC seed + authorize() function
--
-- Populates public.role_permissions (created empty in sub-plan 01) with the
-- canonical role→permission mapping mirrored from lib/auth-permissions.ts,
-- then defines public.authorize(permission) for RLS policies and server-side
-- authorization checks.
--
-- Seed counts (total 57 rows):
--   owner: 23 permissions (full access, including billing.manage)
--   admin: 22 permissions (owner minus billing.manage)
--   agent: 12 permissions — read_all across all scopes; create in property/lead;
--            edit_own/delete_own on PROPERTY; edit_own on LEAD (NO delete_own);
--            no assign / configure / manage anywhere.
--
-- Idempotent via INSERT ... ON CONFLICT DO NOTHING on the unique
-- (role, permission) index. Safe to re-run.

-- ─── Seed ────────────────────────────────────────────────────────────────

insert into public.role_permissions (role, permission) values
  -- Owner (23)
  ('owner', 'property.create'),
  ('owner', 'property.read_own'),
  ('owner', 'property.read_all'),
  ('owner', 'property.edit_own'),
  ('owner', 'property.edit_all'),
  ('owner', 'property.delete_own'),
  ('owner', 'property.delete_all'),
  ('owner', 'property.assign'),
  ('owner', 'lead.create'),
  ('owner', 'lead.read_own'),
  ('owner', 'lead.read_all'),
  ('owner', 'lead.edit_own'),
  ('owner', 'lead.edit_all'),
  ('owner', 'lead.delete_own'),
  ('owner', 'lead.delete_all'),
  ('owner', 'lead.assign'),
  ('owner', 'analytics.read_own'),
  ('owner', 'analytics.read_all'),
  ('owner', 'bot.read'),
  ('owner', 'bot.configure'),
  ('owner', 'settings.read'),
  ('owner', 'settings.manage'),
  ('owner', 'billing.manage'),

  -- Admin (22) — owner minus billing.manage; retains property.assign / lead.assign
  ('admin', 'property.create'),
  ('admin', 'property.read_own'),
  ('admin', 'property.read_all'),
  ('admin', 'property.edit_own'),
  ('admin', 'property.edit_all'),
  ('admin', 'property.delete_own'),
  ('admin', 'property.delete_all'),
  ('admin', 'property.assign'),
  ('admin', 'lead.create'),
  ('admin', 'lead.read_own'),
  ('admin', 'lead.read_all'),
  ('admin', 'lead.edit_own'),
  ('admin', 'lead.edit_all'),
  ('admin', 'lead.delete_own'),
  ('admin', 'lead.delete_all'),
  ('admin', 'lead.assign'),
  ('admin', 'analytics.read_own'),
  ('admin', 'analytics.read_all'),
  ('admin', 'bot.read'),
  ('admin', 'bot.configure'),
  ('admin', 'settings.read'),
  ('admin', 'settings.manage'),

  -- Agent (12) — read_all + create + own-only edit/delete; no assign/configure/manage
  ('agent', 'property.create'),
  ('agent', 'property.read_own'),
  ('agent', 'property.read_all'),
  ('agent', 'property.edit_own'),
  ('agent', 'property.delete_own'),
  ('agent', 'lead.create'),
  ('agent', 'lead.read_own'),
  ('agent', 'lead.read_all'),
  ('agent', 'lead.edit_own'),
  ('agent', 'analytics.read_own'),
  ('agent', 'bot.read'),
  ('agent', 'settings.read')
on conflict (role, permission) do nothing;


-- ─── authorize() function ───────────────────────────────────────────────
--
-- Reads auth.jwt() ->> 'org_role' (populated by custom_access_token_hook
-- from sub-plan 03) and checks public.role_permissions.
--
-- Returns false if the JWT is missing org_role (user without active org,
-- anon, or claim not yet refreshed after role change).
--
-- Security posture:
--   - SECURITY DEFINER: runs with the function owner's privileges so it
--     can read role_permissions regardless of the caller's RLS state.
--     Necessary because role_permissions will have RLS enabled in sub-plan
--     07 and the caller (`authenticated` role) should not be able to
--     enumerate the whole table — only perform scoped permission checks.
--   - STABLE: read-only; Postgres can cache the result within a query.
--   - set search_path = '': forces explicit schema prefixes.
--   - grant execute to authenticated only; revoke from anon/public.

create or replace function public.authorize(requested_permission public.app_permission)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  user_role text;
begin
  user_role := auth.jwt() ->> 'org_role';

  if user_role is null or user_role = '' then
    return false;
  end if;

  -- Deliberate choice: cast the ENUM column to text for the comparison instead
  -- of casting `user_role` to `public.member_role`. Trade-off:
  --   - `rp.role::text = user_role` — silently returns false for any unknown
  --     role string (typo, tampered JWT hypothetical, stale claim). Safer
  --     default for an auth primitive: never leak an error path that reveals
  --     internals.
  --   - `rp.role = user_role::public.member_role` — would use the index
  --     directly and catch typos via `invalid_text_representation`, but leaks
  --     slightly more info and changes the failure surface.
  -- At 57 rows the index-use difference is sub-ms; silent-false wins.
  return exists(
    select 1
    from public.role_permissions rp
    where rp.role::text = user_role
      and rp.permission = requested_permission
  );
end;
$$;


-- Grants — only authenticated users can call authorize.
grant execute
  on function public.authorize(public.app_permission)
  to authenticated;

revoke execute
  on function public.authorize(public.app_permission)
  from anon, public;
