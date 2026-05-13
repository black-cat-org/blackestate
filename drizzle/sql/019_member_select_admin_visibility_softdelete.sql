-- 019_member_select_admin_visibility_softdelete.sql
-- Applied: 2026-05-11 via Supabase MCP `apply_migration` as
--   "member_select_admin_visibility_for_softdelete"
--
-- Fixes a chain of three Postgres RLS subtleties that combined to block
-- every soft-delete UPDATE on `public.member`:
--
--  1. The repository soft-deletes by setting `deleted_at = now()` and
--     `is_active = false` via a normal UPDATE (no DELETE — see CLAUDE.md
--     "No hard DELETE" rule).
--  2. Postgres re-evaluates the SELECT policy USING clause against the
--     NEW row immediately after an UPDATE to confirm the row is still
--     visible to the caller. If the new row fails SELECT visibility,
--     the UPDATE is rejected with the misleading
--     `new row violates row-level security policy` error (it surfaces
--     against whichever WITH CHECK / USING the planner picked, not
--     necessarily the one that actually blocked the row).
--  3. The previous SELECT policy
--     `member_select_same_org_or_superadmin` only matched rows with
--     `deleted_at IS NULL` (filtering out tombstones from the team
--     listing was the original goal). After step 1 the new row has
--     `deleted_at = now()`, so SELECT visibility evaluates to FALSE for
--     everyone except a super_admin → UPDATE blocked.
--
-- Fix: allow admins/owners to see soft-deleted member rows from their
-- own org while keeping the active-only filter for everyone else. The
-- filter for non-admin reads is enforced by the additional clause
-- `deleted_at IS NULL AND public.is_org_member(organization_id)`.
--
-- The repository layer continues to filter by `deleted_at IS NULL` in
-- its query for the team listing, so admins still see only active
-- members in the UI; the policy widening only affects the post-UPDATE
-- visibility check that Postgres runs internally.
--
-- Sub-plan: docs/plans/2026-05-11-realtime-membership-revocation.md
-- (Layer 1 — DB membership defense; bug discovered during E2E test 2)

DROP POLICY IF EXISTS member_select_same_org_or_superadmin ON public.member;

CREATE POLICY member_select_same_org_or_superadmin ON public.member
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR public.is_org_admin(organization_id)
    OR (deleted_at IS NULL AND public.is_org_member(organization_id))
  );
