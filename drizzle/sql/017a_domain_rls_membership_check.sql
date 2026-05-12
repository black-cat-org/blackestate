-- 017a_domain_rls_membership_check.sql
-- Applied: 2026-05-11 via Supabase MCP `apply_migration` as
--   "domain_rls_membership_check"
--
-- Adds public.is_org_member(<org_id>) to every domain-table policy for the
-- `authenticated` role. Without this, a user whose JWT still carries an
-- active_org_id claim for an org they have been removed from continues to
-- read/write that org's data until the JWT expires (~1h). Trusting the JWT
-- claim alone is a violation of zero-trust principles (NIST SP 800-207,
-- OWASP). The DB must verify membership at query time — defense-in-depth.
--
-- Pattern: super_admin branch is preserved without membership check
-- (intentional cross-org access for platform admins). The membership check
-- is added inside the OR's right-hand side, alongside the existing
-- organization_id match.
--
-- Tables modified (8 tables × 5 policies = 40 policies):
--   properties, leads, appointments, ai_contents,
--   lead_property_queue, bot_messages, bot_config, bot_conversations.
--
-- Policies that join across tables (bot_messages_*_trash via
-- bot_conversations, lead_property_queue_*_trash via leads) check
-- membership against the joined-row's organization_id, not the table's own.
--
-- Resolves T071 security gap (BLOQUE K Members — remove). Companion to
-- 017b (anon public policies) and the realtime broadcast layer (sub-plan
-- docs/plans/2026-05-11-realtime-membership-revocation.md).

-- ============================================================
-- properties (5 policies)
-- ============================================================

DROP POLICY IF EXISTS properties_select_org ON public.properties;
CREATE POLICY properties_select_org ON public.properties
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS properties_select_trash ON public.properties;
CREATE POLICY properties_select_trash ON public.properties
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

DROP POLICY IF EXISTS properties_insert_org ON public.properties;
CREATE POLICY properties_insert_org ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS properties_update_role_aware ON public.properties;
CREATE POLICY properties_update_role_aware ON public.properties
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

DROP POLICY IF EXISTS properties_update_restore ON public.properties;
CREATE POLICY properties_update_restore ON public.properties
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

-- ============================================================
-- leads (5 policies)
-- ============================================================

DROP POLICY IF EXISTS leads_select_org ON public.leads;
CREATE POLICY leads_select_org ON public.leads
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS leads_select_trash ON public.leads;
CREATE POLICY leads_select_trash ON public.leads
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

DROP POLICY IF EXISTS leads_insert_org ON public.leads;
CREATE POLICY leads_insert_org ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS leads_update_role_aware ON public.leads;
CREATE POLICY leads_update_role_aware ON public.leads
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

DROP POLICY IF EXISTS leads_update_restore ON public.leads;
CREATE POLICY leads_update_restore ON public.leads
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

-- ============================================================
-- appointments (5 policies)
-- ============================================================

DROP POLICY IF EXISTS appointments_select_org ON public.appointments;
CREATE POLICY appointments_select_org ON public.appointments
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS appointments_select_trash ON public.appointments;
CREATE POLICY appointments_select_trash ON public.appointments
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

DROP POLICY IF EXISTS appointments_insert_org ON public.appointments;
CREATE POLICY appointments_insert_org ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS appointments_update_role_aware ON public.appointments;
CREATE POLICY appointments_update_role_aware ON public.appointments
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

DROP POLICY IF EXISTS appointments_update_restore ON public.appointments;
CREATE POLICY appointments_update_restore ON public.appointments
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

-- ============================================================
-- ai_contents (5 policies)
-- ============================================================

DROP POLICY IF EXISTS ai_contents_select_org ON public.ai_contents;
CREATE POLICY ai_contents_select_org ON public.ai_contents
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS ai_contents_select_trash ON public.ai_contents;
CREATE POLICY ai_contents_select_trash ON public.ai_contents
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

DROP POLICY IF EXISTS ai_contents_insert_org ON public.ai_contents;
CREATE POLICY ai_contents_insert_org ON public.ai_contents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS ai_contents_update_role_aware ON public.ai_contents;
CREATE POLICY ai_contents_update_role_aware ON public.ai_contents
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

DROP POLICY IF EXISTS ai_contents_update_restore ON public.ai_contents;
CREATE POLICY ai_contents_update_restore ON public.ai_contents
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

-- ============================================================
-- lead_property_queue (5 policies)
-- Trash policies join leads via EXISTS — membership check applies to the
-- joined leads.organization_id (which equals lead_property_queue.organization_id
-- by domain invariant; we keep the table's own org_id check too).
-- ============================================================

DROP POLICY IF EXISTS lpq_select_org ON public.lead_property_queue;
CREATE POLICY lpq_select_org ON public.lead_property_queue
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS lpq_select_trash ON public.lead_property_queue;
CREATE POLICY lpq_select_trash ON public.lead_property_queue
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      deleted_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_property_queue.lead_id
          AND l.organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
          AND public.is_org_member(l.organization_id)
          AND (
            ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
            OR l.created_by_user_id = (SELECT auth.uid())
          )
      )
    )
  );

DROP POLICY IF EXISTS lpq_insert_org ON public.lead_property_queue;
CREATE POLICY lpq_insert_org ON public.lead_property_queue
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS lpq_update_role_aware ON public.lead_property_queue;
CREATE POLICY lpq_update_role_aware ON public.lead_property_queue
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

DROP POLICY IF EXISTS lpq_update_restore ON public.lead_property_queue;
CREATE POLICY lpq_update_restore ON public.lead_property_queue
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      deleted_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_property_queue.lead_id
          AND l.organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
          AND public.is_org_member(l.organization_id)
          AND (
            ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
            OR l.created_by_user_id = (SELECT auth.uid())
          )
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_property_queue.lead_id
        AND l.organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    )
  );

-- ============================================================
-- bot_messages (5 policies)
-- Trash policies use bot_conversations EXISTS for membership context.
-- ============================================================

DROP POLICY IF EXISTS bot_messages_select_org ON public.bot_messages;
CREATE POLICY bot_messages_select_org ON public.bot_messages
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS bot_messages_select_trash ON public.bot_messages;
CREATE POLICY bot_messages_select_trash ON public.bot_messages
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      deleted_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.bot_conversations c
        WHERE c.id = bot_messages.conversation_id
          AND c.organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
          AND public.is_org_member(c.organization_id)
          AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
      )
    )
  );

DROP POLICY IF EXISTS bot_messages_insert_org ON public.bot_messages;
CREATE POLICY bot_messages_insert_org ON public.bot_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS bot_messages_update_owner_admin ON public.bot_messages;
CREATE POLICY bot_messages_update_owner_admin ON public.bot_messages
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
    AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS bot_messages_update_restore ON public.bot_messages;
CREATE POLICY bot_messages_update_restore ON public.bot_messages
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      deleted_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.bot_conversations c
        WHERE c.id = bot_messages.conversation_id
          AND c.organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
          AND public.is_org_member(c.organization_id)
          AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.bot_conversations c
      WHERE c.id = bot_messages.conversation_id
        AND c.organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    )
  );

-- ============================================================
-- bot_config (5 policies — owner/admin only writes)
-- ============================================================

DROP POLICY IF EXISTS bot_config_select_org ON public.bot_config;
CREATE POLICY bot_config_select_org ON public.bot_config
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS bot_config_select_trash ON public.bot_config;
CREATE POLICY bot_config_select_trash ON public.bot_config
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
    )
  );

DROP POLICY IF EXISTS bot_config_insert_owner_admin ON public.bot_config;
CREATE POLICY bot_config_insert_owner_admin ON public.bot_config
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS bot_config_update_owner_admin ON public.bot_config;
CREATE POLICY bot_config_update_owner_admin ON public.bot_config
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
    AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS bot_config_update_restore ON public.bot_config;
CREATE POLICY bot_config_update_restore ON public.bot_config
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

-- ============================================================
-- bot_conversations (5 policies)
-- ============================================================

DROP POLICY IF EXISTS bot_conversations_select_org ON public.bot_conversations;
CREATE POLICY bot_conversations_select_org ON public.bot_conversations
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS bot_conversations_select_trash ON public.bot_conversations;
CREATE POLICY bot_conversations_select_trash ON public.bot_conversations
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
    )
  );

DROP POLICY IF EXISTS bot_conversations_insert_org ON public.bot_conversations;
CREATE POLICY bot_conversations_insert_org ON public.bot_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS bot_conversations_update_owner_admin ON public.bot_conversations;
CREATE POLICY bot_conversations_update_owner_admin ON public.bot_conversations
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
    AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS bot_conversations_update_restore ON public.bot_conversations;
CREATE POLICY bot_conversations_update_restore ON public.bot_conversations
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );
