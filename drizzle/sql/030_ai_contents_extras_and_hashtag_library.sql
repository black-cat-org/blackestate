-- 030_ai_contents_extras_and_hashtag_library.sql
-- Sub-plan: docs/plans/2026-05-13-contact-inquiry-refactor.md ticket R38d
--
-- Two-part migration:
--
--   1. ai_contents: ADD COLUMN analytics jsonb (nullable, no default). The
--      column holds engagement metrics published by the source platform
--      (views/likes/comments/shares/clicks) — loose schema kept as JSONB
--      because the shape evolves per platform and we never query against
--      individual metric values. Existing rows get NULL, mapper converts
--      to `undefined` at the entity boundary.
--
--   2. hashtag_library: new per-org curated tag library. Replaces the
--      in-memory `hashtags.store.ts` from pre-R38d. RLS policies mirror
--      `ai_contents` exactly (role-aware update/restore + trash split).
--
-- Idempotent: every statement uses IF NOT EXISTS / IF EXISTS so a
-- re-run is safe. Wrapped in a transaction so partial failure leaves
-- the database untouched.

BEGIN;

-- ============================================================================
-- SECTION 1 — ai_contents: ADD COLUMN analytics
-- ============================================================================

ALTER TABLE public.ai_contents
  ADD COLUMN IF NOT EXISTS analytics jsonb;

-- ============================================================================
-- SECTION 2 — hashtag_library: CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hashtag_library (
  id text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  organization_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,

  tag text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  deleted_by_user_name text,
  deleted_by_user_email text
);

-- Standard indexes mirror ai_contents pattern.
CREATE INDEX IF NOT EXISTS hashtag_library_org_id_idx
  ON public.hashtag_library (organization_id);
CREATE INDEX IF NOT EXISTS hashtag_library_org_tag_idx
  ON public.hashtag_library (organization_id, tag);

-- Partial UNIQUE: each org may keep at most one active row per tag.
-- After soft-delete the row stays but no longer conflicts, so an admin
-- can restore + re-add cleanly. Drizzle Kit cannot model partial UNIQUE
-- so this lives only in SQL — mirror of `inquiry` / `deal` pattern.
DROP INDEX IF EXISTS public.hashtag_library_org_tag_active_uniq;
CREATE UNIQUE INDEX hashtag_library_org_tag_active_uniq
  ON public.hashtag_library (organization_id, tag)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 3 — hashtag_library: RLS policies
-- Mirror `ai_contents` exactly (5 policies: select_org, select_trash,
-- insert_org, update_role_aware, update_restore). Same membership check
-- defense-in-depth as `017a_domain_rls_membership_check.sql`.
-- ============================================================================

ALTER TABLE public.hashtag_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtag_library FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hashtag_library_select_org ON public.hashtag_library;
CREATE POLICY hashtag_library_select_org ON public.hashtag_library
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS hashtag_library_select_trash ON public.hashtag_library;
CREATE POLICY hashtag_library_select_trash ON public.hashtag_library
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS hashtag_library_insert_org ON public.hashtag_library;
CREATE POLICY hashtag_library_insert_org ON public.hashtag_library
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS hashtag_library_update_role_aware ON public.hashtag_library;
CREATE POLICY hashtag_library_update_role_aware ON public.hashtag_library
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
    AND (
      ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
      OR created_by_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS hashtag_library_update_restore ON public.hashtag_library;
CREATE POLICY hashtag_library_update_restore ON public.hashtag_library
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

-- ============================================================================
-- SECTION 4 — GRANTs
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.hashtag_library TO authenticated;

COMMIT;
