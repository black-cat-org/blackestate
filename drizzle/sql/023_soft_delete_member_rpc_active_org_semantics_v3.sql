-- 023_soft_delete_member_rpc_active_org_semantics_v3.sql
-- Applied: 2026-05-12 via Supabase MCP `apply_migration` as
--   "soft_delete_member_rpc_active_org_semantics_v3"
--
-- v3 of soft_delete_member_with_active_org_reset.
--
-- Fixes a return-value semantic ambiguity reported by code review of v2
-- (drizzle/sql/022): `v_new_active_org` was left uninitialized in the
-- branches where the target user's `user_active_org` already pointed
-- elsewhere (or did not exist at all). The function then returned
-- `new_active_org_id: null`, which the v2 header documented as meaning
-- "no remaining membership and the row was deleted" — but in those
-- branches the row was untouched, so the null was wrong.
--
-- Today the action layer ignores `new_active_org_id` (the broadcast
-- payload only signals "removed" + org name). The fix is preventative:
-- any future audit, logging, or background job that branches on
-- `new_active_org_id` should be able to trust the contract.
--
-- New contract:
--   * `new_active_org_id = <uuid>` — the target user's
--     `user_active_org` row now points at this org (either because we
--     just flipped it, or because it was already pointing at a still-
--     valid org).
--   * `new_active_org_id = null` — the target user has no
--     `user_active_org` row. Either we just deleted it (because they
--     ran out of memberships), or they never had one to begin with.
--
-- Everything else (locking, authorisation, owner invariant, idempotency)
-- is identical to v2. The function body is reproduced in full because
-- CREATE OR REPLACE FUNCTION must replace the entire body.
--
-- Sub-plan: docs/plans/2026-05-11-realtime-membership-revocation.md
-- (Layer 1 — DB membership defense; addresses code-review CRITICAL #1
-- from the v2 (022) review)

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
      -- null active_org_id claim on next request and redirects through
      -- /auth/sign-out-removed so the user is not stranded with an
      -- active-but-unusable session.
      DELETE FROM public.user_active_org
       WHERE user_id = v_target_user;
    ELSE
      UPDATE public.user_active_org
         SET organization_id = v_new_active_org,
             updated_at = now()
       WHERE user_id = v_target_user;
    END IF;
  ELSE
    -- Either the target's active org already pointed at a different
    -- (still valid) org, or they never had a `user_active_org` row.
    -- Forward the current value so the return contract is unambiguous
    -- regardless of which branch fired.
    v_new_active_org := v_active_org_current;
  END IF;

  RETURN jsonb_build_object(
    'target_user_id', v_target_user,
    'new_active_org_id', v_new_active_org
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.soft_delete_member_with_active_org_reset(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_member_with_active_org_reset(uuid) TO authenticated;
