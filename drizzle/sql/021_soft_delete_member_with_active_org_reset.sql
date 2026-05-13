-- 021_soft_delete_member_with_active_org_reset.sql
-- Applied: 2026-05-12 via Supabase MCP `apply_migration` as
--   "soft_delete_member_with_active_org_reset"
--
-- Atomically soft-deletes a member and resets that user's active_org if
-- it pointed at the removed org. SECURITY DEFINER because the active-org
-- reset writes to another user's `user_active_org` row, which RLS blocks
-- from any caller (the row's `update` policy requires `user_id = auth.uid()`).
--
-- Callers must be owner or admin of the target's org. The function
-- re-checks this internally via `public.is_org_admin` (which uses
-- `auth.uid()`), so SECURITY DEFINER does not widen authorisation —
-- only the cross-row write capability.
--
-- Why the active-org reset is mandatory at the DB layer:
--   When a user's active org is soft-deleted, the JWT hook
--   (drizzle/sql/003) nulls their `active_org_id` claim via the orphan
--   defense, but that leaves the `user_active_org` row in a stale state
--   referencing the dead org. The next time the user signs in, the
--   claim is null again → `getSessionContext()` throws → blank
--   dashboard. Realtime push from the membership-change broadcast does
--   eventually correct this on the client (switchActiveOrgAction or
--   signOut), but only if the client is online when the event fires.
--   This RPC closes the gap deterministically server-side.
--
-- Discovered during Lote 21 E2E test 2 REMOVE: target user signed out
-- between the first remove broadcast and the next sign-in, leaving
-- `user_active_org` pointing at the soft-deleted org → dashboard blank
-- after re-login. Server-side reset closes the window.
--
-- Returns: { target_user_id: uuid, new_active_org_id: uuid | null }
--   - target_user_id is what the action layer broadcasts.
--   - new_active_org_id is the org the target was flipped to (or null
--     if no remaining membership and the row was deleted).
--
-- Sub-plan: docs/plans/2026-05-11-realtime-membership-revocation.md
-- (Layer 1 — DB membership defense; closes orphan-state gap exposed in
-- E2E test 2)

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

  -- Caller authorisation: owner or admin of the target's org. This uses
  -- auth.uid() (i.e. evaluated as the original caller, not the function
  -- owner) so SECURITY DEFINER does not widen authorisation.
  IF NOT public.is_org_admin(v_target_org) THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE = '42501';
  END IF;

  -- 1. Soft-delete the membership.
  UPDATE public.member
     SET deleted_at = now()
   WHERE id = p_member_id;

  -- 2. Active-org reset for the removed user.
  IF EXISTS (
    SELECT 1 FROM public.user_active_org uao
     WHERE uao.user_id = v_target_user
       AND uao.organization_id = v_target_org
  ) THEN
    SELECT m.organization_id
      INTO v_new_active_org
      FROM public.member m
     WHERE m.user_id = v_target_user
       AND m.deleted_at IS NULL
     ORDER BY m.created_at
     LIMIT 1;

    IF v_new_active_org IS NULL THEN
      -- No remaining membership. Drop the row so the next sign-in
      -- re-creates it deterministically (or signs out if there is no
      -- recoverable org).
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
