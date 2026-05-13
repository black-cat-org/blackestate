-- 017b_anon_public_policies.sql
-- Applied: 2026-05-11 via Supabase MCP `apply_migration` as
--   "anon_public_policies_and_analytics_events_membership"
--
-- Completes the transition to strict RLS — zero bypass of postgres role
-- for public-facing queries. Companion to 017a (authenticated membership
-- check on domain tables).
--
-- WHAT:
-- 1. Add public.is_org_member() to analytics_events authenticated
--    policies (omitted from 017a because the table was not in that
--    initial set — analytics is technically a domain table from a
--    membership perspective).
-- 2. Add anon-role policies so the public landing /p/[id] flow can run
--    without bypassing RLS via postgres BYPASSRLS:
--    - properties_select_public: anon can read any active, non-deleted
--      property. Replaces findPublicById's reliance on db direct.
--    - analytics_events_insert_public_visit: anon can INSERT only with
--      event_type='property_visit'. Replaces trackVisit's reliance on db
--      direct.
--
-- WHY (zero-trust strict):
-- Every query against domain tables now passes through an explicit RLS
-- policy. Postgres BYPASSRLS is reserved for the `withRLS()` wrapper
-- alone (rls.ts:47), where it is necessary to open a transaction and
-- switch the role to authenticated via set_config. No other code path
-- bypasses RLS. This matches the industry standard B2B multi-tenant
-- model (Slack, GitHub, Linear, Notion).

-- ============================================================
-- analytics_events authenticated policies — add is_org_member
-- ============================================================

DROP POLICY IF EXISTS analytics_events_select_org ON public.analytics_events;
CREATE POLICY analytics_events_select_org ON public.analytics_events
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
    )
  );

DROP POLICY IF EXISTS analytics_events_insert_org ON public.analytics_events;
CREATE POLICY analytics_events_insert_org ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

-- ============================================================
-- properties_select_public — anon visitor reads active properties
-- ============================================================
--
-- Public landing pages (/p/[id]) render any active, non-deleted property
-- to anonymous visitors. Explicit, auditable contract: only active and
-- non-deleted rows visible to anon. No org/membership check (anon is not
-- a member).
--
-- Replaces the bypass via postgres BYPASSRLS that `findPublicById`
-- previously relied on (drizzle-property.repository.ts).

CREATE POLICY properties_select_public ON public.properties
  FOR SELECT TO anon
  USING (
    status = 'active'
    AND deleted_at IS NULL
  );

-- ============================================================
-- analytics_events_insert_public_visit — anon writes only property_visit
-- ============================================================
--
-- Public visitors trigger trackVisit from the landing page. Restricted
-- to event_type='property_visit' so anon cannot impersonate other event
-- types. organization_id is derived server-side from the property lookup
-- (subject to properties_select_public) — anon cannot fabricate scope
-- from the client.

CREATE POLICY analytics_events_insert_public_visit ON public.analytics_events
  FOR INSERT TO anon
  WITH CHECK (
    event_type = 'property_visit'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.organization_id = analytics_events.organization_id
        AND p.status = 'active'
        AND p.deleted_at IS NULL
    )
  );
