-- 022_soft_delete_member_with_active_org_reset_v2.sql
-- Applied: 2026-05-12 via Supabase MCP `apply_migration` as
--   "soft_delete_member_with_active_org_reset_v2"
--
-- v2 of the RPC introduced in 021. Tightens locking after code review:
--
--   1. Locks the CALLER's own member row FOR SHARE before authorisation
--      check. Closes a TOCTOU window where a concurrent role change
--      against the caller (admin → agent) could commit between the
--      `is_org_admin` check and the soft-delete UPDATE.
--
--   2. Locks the target's `user_active_org` row FOR UPDATE before
--      reading. Closes a lost-update window where a concurrent
--      `switchActiveOrgAction` by the target user could be silently
--      overwritten by the RPC's reset.
--
--   3. Calls `is_org_admin` is replaced with an inline locked SELECT
--      against `public.member`. Functionally equivalent (`is_org_admin`
--      checks the same predicate), but lets the FOR SHARE lock be on
--      the row the predicate reads — required for serialisation.
--
-- The DELETE branch (when target has no remaining memberships) is
-- intentionally retained: the proxy (proxy.ts) detects null
-- `active_org_id` on the JWT claim and redirects to
-- `/sign-in?reason=removed`, so a missing `user_active_org` row no
-- longer produces a blank dashboard. This is defense-in-depth: the
-- removal RPC handles the data state, the proxy handles the UX state.
--
-- Sub-plan: docs/plans/2026-05-11-realtime-membership-revocation.md
-- (Layer 1 — DB membership defense; addresses code-review CRITICAL #1
-- and IMPORTANT #2/#3 from the v1 (021) review)

CREATE OR REPLACE FUNCTION public.soft_delete_member_with_active_org_reset(
  p_member_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid;
  v_target_user uuid;
  v_target_org uuid;
  v_target_role text;
  v_target_deleted_at timestamptz;
  v_caller_role text;
  v_active_org_current uuid;
  v_new_active_org uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Lock target row to serialise against concurrent role-change / remove.
  SELECT m.user_id, m.organization_id, m.role::text, m.deleted_at
    INTO v_target_user, v_target_org, v_target_role, v_target_deleted_at
    FROM public.member m
    WHERE m.id = p_member_id
    FOR UPDATE;

  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = '02000';
  END IF;
  IF v_target_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'member_already_removed' USING ERRCODE = '22023';
  END IF;
  IF v_target_role = 'owner' THEN
    -- DB invariant: every org keeps its owner. Removal of an owner is
    -- only allowed via an explicit ownership-transfer flow (not in scope).
    RAISE EXCEPTION 'cannot_remove_owner' USING ERRCODE = '22023';
  END IF;

  -- Lock the CALLER's membership row in the same org with FOR SHARE.
  -- This prevents a concurrent UPDATE that demotes the caller from
  -- admin/owner to agent from committing between the authz check below
  -- and the soft-delete UPDATE further down. FOR SHARE allows other
  -- readers but blocks any UPDATE on this row until our tx commits.
  SELECT m.role::text
    INTO v_caller_role
    FROM public.member m
    WHERE m.user_id = v_caller
      AND m.organization_id = v_target_org
      AND m.deleted_at IS NULL
    FOR SHARE;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;

  -- 1. Soft-delete the membership.
  UPDATE public.member
     SET deleted_at = now()
   WHERE id = p_member_id;

  -- 2. Active-org reset for the removed user.
  -- Lock the row first so any concurrent switchActiveOrgAction by the
  -- target user serialises behind us; otherwise their pick could be
  -- silently overwritten (lost update).
  SELECT uao.organization_id
    INTO v_active_org_current
    FROM public.user_active_org uao
    WHERE uao.user_id = v_target_user
    FOR UPDATE;

  IF v_active_org_current = v_target_org THEN
    SELECT m.organization_id
      INTO v_new_active_org
      FROM public.member m
     WHERE m.user_id = v_target_user
       AND m.deleted_at IS NULL
     ORDER BY m.created_at
     LIMIT 1;

    IF v_new_active_org IS NULL THEN
      -- No remaining membership. Drop the row; the proxy detects the
      -- null active_org_id claim on next request and redirects to
      -- sign-in with `reason=removed` so the user is not stranded on a
      -- blank dashboard.
      DELETE FROM public.user_active_org
       WHERE user_id = v_target_user;
    ELSE
      UPDATE public.user_active_org
         SET organization_id = v_new_active_org,
             updated_at = now()
       WHERE user_id = v_target_user;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'target_user_id', v_target_user,
    'new_active_org_id', v_new_active_org
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.soft_delete_member_with_active_org_reset(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_member_with_active_org_reset(uuid) TO authenticated;
