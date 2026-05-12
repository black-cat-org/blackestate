-- 020_member_select_active_org_guard.sql
-- Applied: 2026-05-11 via Supabase MCP `apply_migration` as
--   "member_select_active_org_guard"
--
-- Tightens the admin branch of `member_select_same_org_or_superadmin`
-- (introduced in 019) so it requires the row's `organization_id` to
-- match the caller's `active_org_id` JWT claim, in addition to the
-- caller being an admin of that org.
--
-- Why: 019 widened SELECT visibility to let admins see soft-deleted
-- (tombstone) member rows from their own org — required so the
-- post-UPDATE visibility check Postgres runs after a soft-delete passes
-- and the UPDATE is not rejected with the misleading "WITH CHECK"
-- error.
--
-- The 019 policy as written allowed that admin branch to fire for any
-- org the caller was admin in, ignoring `active_org_id`. A multi-org
-- admin (admin in both org A and org B) who is currently active in org
-- B could SELECT soft-deleted member rows from org A. Tombstone rows
-- only carry membership metadata (no domain data), but their existence
-- and identity should remain bounded by the caller's active session —
-- consistent with how 017a gates every domain table policy.
--
-- The `is_org_member` branch is intentionally NOT gated by
-- `active_org_id`: it preserves the existing 006 semantics that members
-- of any org a user belongs to can see each other regardless of active
-- session (used by org-switcher / multi-org navigation UI).
--
-- The super_admin branch is intentionally unchanged.
--
-- Sub-plan: docs/plans/2026-05-11-realtime-membership-revocation.md
-- (Layer 1 — DB membership defense; tightens the 019 fix per reviewer
-- IMPORTANT-1)

DROP POLICY IF EXISTS member_select_same_org_or_superadmin ON public.member;

CREATE POLICY member_select_same_org_or_superadmin ON public.member
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_admin(organization_id)
    )
    OR (deleted_at IS NULL AND public.is_org_member(organization_id))
  );
