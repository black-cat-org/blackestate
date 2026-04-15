-- =============================================================================
-- RLS Policies for Black Estate
-- =============================================================================
-- Architecture:
--   - Drizzle connects as postgres (superuser) but uses SET LOCAL role = 'authenticated'
--   - Claims passed via SET LOCAL request.jwt.claims = '{"sub":"...","org_id":"...","org_role":"...","is_super_admin":false}'
--   - Trash/restore via SET LOCAL app.include_deleted = 'true'
--   - No hard DELETE — soft delete only (UPDATE SET deleted_at)
--   - Performance: all current_setting() calls wrapped in (SELECT ...) for caching
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Grant permissions to authenticated role
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_contents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lead_property_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bot_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bot_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bot_messages TO authenticated;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agent_profiles TO authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.property_transfers TO authenticated;

-- No DELETE granted on any table

-- ---------------------------------------------------------------------------
-- 2. Enable + Force RLS on all domain tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties FORCE ROW LEVEL SECURITY;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ai_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_contents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.lead_property_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_property_queue FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_config FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins FORCE ROW LEVEL SECURITY;

ALTER TABLE public.property_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_transfers FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. SELECT Policies — owner-managed tables (properties, leads, appointments,
--    ai_contents, lead_property_queue)
--    Agent sees all in org. Trash: owner/admin see all deleted, agent sees own deleted.
-- ---------------------------------------------------------------------------

-- Properties
CREATE POLICY "properties_select" ON public.properties
FOR SELECT TO authenticated
USING (
  (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean = true
  OR (
    organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
    AND (
      deleted_at IS NULL
      OR (
        (SELECT current_setting('app.include_deleted', true)) = 'true'
        AND (
          (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
          OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
        )
      )
    )
  )
);

-- Leads
CREATE POLICY "leads_select" ON public.leads
FOR SELECT TO authenticated
USING (
  (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean = true
  OR (
    organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
    AND (
      deleted_at IS NULL
      OR (
        (SELECT current_setting('app.include_deleted', true)) = 'true'
        AND (
          (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
          OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
        )
      )
    )
  )
);

-- Appointments
CREATE POLICY "appointments_select" ON public.appointments
FOR SELECT TO authenticated
USING (
  (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean = true
  OR (
    organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
    AND (
      deleted_at IS NULL
      OR (
        (SELECT current_setting('app.include_deleted', true)) = 'true'
        AND (
          (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
          OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
        )
      )
    )
  )
);

-- AI Contents
CREATE POLICY "ai_contents_select" ON public.ai_contents
FOR SELECT TO authenticated
USING (
  (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean = true
  OR (
    organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
    AND (
      deleted_at IS NULL
      OR (
        (SELECT current_setting('app.include_deleted', true)) = 'true'
        AND (
          (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
          OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
        )
      )
    )
  )
);

-- Lead Property Queue
CREATE POLICY "lpq_select" ON public.lead_property_queue
FOR SELECT TO authenticated
USING (
  (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean = true
  OR (
    organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
    AND (
      deleted_at IS NULL
      OR (
        (SELECT current_setting('app.include_deleted', true)) = 'true'
        AND (
          (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
          OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
        )
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- 3b. SELECT Policies — system-managed tables (bot, analytics, config)
--     No trash for these tables, simpler policies.
-- ---------------------------------------------------------------------------

-- Bot Config (one per org)
CREATE POLICY "bot_config_select" ON public.bot_config
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
);

-- Bot Conversations
CREATE POLICY "bot_conversations_select" ON public.bot_conversations
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
);

-- Bot Messages
CREATE POLICY "bot_messages_select" ON public.bot_messages
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
);

-- Analytics Events (no soft delete)
CREATE POLICY "analytics_events_select" ON public.analytics_events
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

-- Agent Profiles
CREATE POLICY "agent_profiles_select" ON public.agent_profiles
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
);

-- Platform Admins (only super admins can see the list)
CREATE POLICY "platform_admins_select" ON public.platform_admins
FOR SELECT TO authenticated
USING (
  user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  OR (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean = true
);

-- Property Transfers
CREATE POLICY "property_transfers_select" ON public.property_transfers
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND (
    (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
    OR from_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    OR to_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

-- ---------------------------------------------------------------------------
-- 4. INSERT Policies — can only insert into own org
-- ---------------------------------------------------------------------------

CREATE POLICY "properties_insert" ON public.properties
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "leads_insert" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "appointments_insert" ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "ai_contents_insert" ON public.ai_contents
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "lpq_insert" ON public.lead_property_queue
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "bot_config_insert" ON public.bot_config
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "bot_conversations_insert" ON public.bot_conversations
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "bot_messages_insert" ON public.bot_messages
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "analytics_events_insert" ON public.analytics_events
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "agent_profiles_insert" ON public.agent_profiles
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
);

CREATE POLICY "property_transfers_insert" ON public.property_transfers
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
);

-- ---------------------------------------------------------------------------
-- 5. UPDATE Policies — role-based write access
-- ---------------------------------------------------------------------------

-- Owner/admin: any record in org. Agent: only own records.
CREATE POLICY "properties_update" ON public.properties
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND (
    (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
    OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

CREATE POLICY "leads_update" ON public.leads
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND (
    (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
    OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

CREATE POLICY "appointments_update" ON public.appointments
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND (
    (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
    OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

CREATE POLICY "ai_contents_update" ON public.ai_contents
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND (
    (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
    OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

CREATE POLICY "lpq_update" ON public.lead_property_queue
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND (
    (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
    OR created_by_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

-- System-managed tables: only owner/admin can update
CREATE POLICY "bot_config_update" ON public.bot_config
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
);

CREATE POLICY "bot_conversations_update" ON public.bot_conversations
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
);

CREATE POLICY "bot_messages_update" ON public.bot_messages
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
);

-- Analytics events: no UPDATE (append-only)

-- Agent profiles: only own profile
CREATE POLICY "agent_profiles_update" ON public.agent_profiles
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND deleted_at IS NULL
  AND user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
);

-- Property transfers: only acknowledge (to_user) or owner/admin
CREATE POLICY "property_transfers_update" ON public.property_transfers
FOR UPDATE TO authenticated
USING (
  organization_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')
  AND (
    (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'org_role') IN ('owner', 'admin')
    OR to_user_id = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

-- ---------------------------------------------------------------------------
-- 6. DELETE Policies — NONE
--    No hard delete allowed. Soft delete = UPDATE SET deleted_at = now().
--    The UPDATE policies above control who can soft-delete.
-- ---------------------------------------------------------------------------
-- Intentionally empty. No DELETE policies = no DELETE operations possible.
