# Sub-plan 07 — RLS Policies Rewrite

> **Depends on:** 01, 03, 04
> **Unlocks:** 08, 09

## Goal

Reescribir TODAS las RLS policies que hoy leen claims vía `current_setting('request.jwt.claims')::jsonb ->> 'org_id'` (pattern de `withRLS()`) para que usen `auth.jwt() ->> 'active_org_id'` y `auth.uid()` (pattern nativo Supabase Auth).

Habilitar RLS también en las tablas nuevas de multitenancy (organization, member, invitation, user_active_org, role_permissions).

Aplicar el mismo semántico a `storage.objects` (simplifica sub-plan 08).

## Estrategia

1. **Preservar semántica exacta** de las policies actuales (org isolation + soft delete + role-aware trash + super admin).
2. **Cambio solo de sintaxis de claims**: `request.jwt.claims` → `auth.jwt()`; `org_id` → `active_org_id`; `org_role` → `org_role`; `sub` → `auth.uid()::text` o directo.
3. **RLS en tablas multitenancy nuevas**: policies específicas per tabla.
4. **RLS en storage.objects**: reescribir (sub-plan 08 usa estas policies ya listas).

## Archivos

### Crear

- `drizzle/sql/006_rls_policies_supabase_auth.sql` — SQL completo con DROP + CREATE de todas las policies migradas.

### Modificar

- `drizzle/0002_rls_policies.sql` — no tocar (histórico). Documentar en comentario que queda obsoleta.

## SQL

### `drizzle/sql/006_rls_policies_supabase_auth.sql`

Estructura del archivo:

```sql
-- =========================================================
-- Sub-plan 07 — RLS rewrite for Supabase Auth
-- Replaces drizzle/0002_rls_policies.sql (Better Auth era)
-- =========================================================

-- Helper: auth.uid() ya existe (returns uuid).
-- Helper: auth.jwt() ya existe (returns jsonb).
-- Convenience: (auth.jwt() ->> 'active_org_id')::uuid
-- Convenience: (auth.jwt() ->> 'org_role')::text
-- Convenience: (auth.jwt() ->> 'is_super_admin')::boolean

-- ---------- DROP old policies ----------
-- (ejecutar para cada tabla dominio + storage + multitenancy)
-- Para ahorrar espacio aquí: loop por tabla con DROP POLICY IF EXISTS ...

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'properties', 'leads', 'appointments', 'ai_contents',
        'lead_property_queue', 'bot_config', 'bot_conversations',
        'bot_messages', 'analytics_events', 'agent_profiles',
        'platform_admins', 'property_transfers',
        'organization', 'member', 'invitation',
        'user_active_org', 'role_permissions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$$;

-- ---------- ENABLE + FORCE RLS en multitenancy tables ----------
ALTER TABLE public.organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization FORCE ROW LEVEL SECURITY;
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_org ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_org FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;

-- RLS on domain tables already enabled in drizzle/0002_*.sql — re-enforce:
ALTER TABLE public.properties FORCE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
-- ... etc.

-- ========================================================
-- Multitenancy tables policies
-- ========================================================

-- organization: user can SELECT orgs they're member of OR super admin sees all
CREATE POLICY "organization_select_own" ON public.organization
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'is_super_admin')::boolean = true
    OR EXISTS (
      SELECT 1 FROM public.member m
      WHERE m.organization_id = public.organization.id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

-- organization: INSERT via Server Action (creator becomes owner). Allow authenticated users.
CREATE POLICY "organization_insert_any" ON public.organization
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- organization: UPDATE only by owner/admin of that org
CREATE POLICY "organization_update_owner_admin" ON public.organization
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.member m
      WHERE m.organization_id = public.organization.id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
        AND m.deleted_at IS NULL
    )
  );

-- organization: NO DELETE (soft delete only via UPDATE deleted_at)

-- member: SELECT members of orgs user is in
CREATE POLICY "member_select_same_org" ON public.member
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'is_super_admin')::boolean = true
    OR EXISTS (
      SELECT 1 FROM public.member self_m
      WHERE self_m.organization_id = public.member.organization_id
        AND self_m.user_id = auth.uid()
        AND self_m.deleted_at IS NULL
    )
  );

-- member: INSERT via trigger (on_auth_user_created) uses security definer — bypasses RLS.
-- For app-layer invites: allow INSERT if auth.uid() is owner/admin of the target org.
CREATE POLICY "member_insert_by_admin" ON public.member
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.member admin_m
      WHERE admin_m.organization_id = public.member.organization_id
        AND admin_m.user_id = auth.uid()
        AND admin_m.role IN ('owner', 'admin')
        AND admin_m.deleted_at IS NULL
    )
    -- OR allow self-insert if user has pending invitation for this email+org (checked at app layer)
  );

-- member: UPDATE only owner/admin can change roles; user can update their own title
CREATE POLICY "member_update_admin_or_self" ON public.member
  FOR UPDATE TO authenticated
  USING (
    public.member.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.member admin_m
      WHERE admin_m.organization_id = public.member.organization_id
        AND admin_m.user_id = auth.uid()
        AND admin_m.role IN ('owner', 'admin')
        AND admin_m.deleted_at IS NULL
    )
  );

-- member: NO DELETE

-- invitation: SELECT only owner/admin of the org or the invited email owner
CREATE POLICY "invitation_select_admin_or_invitee" ON public.invitation
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.member admin_m
      WHERE admin_m.organization_id = public.invitation.organization_id
        AND admin_m.user_id = auth.uid()
        AND admin_m.role IN ('owner', 'admin')
        AND admin_m.deleted_at IS NULL
    )
    OR lower(public.invitation.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- invitation: INSERT by owner/admin
CREATE POLICY "invitation_insert_admin" ON public.invitation
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.member admin_m
      WHERE admin_m.organization_id = public.invitation.organization_id
        AND admin_m.user_id = auth.uid()
        AND admin_m.role IN ('owner', 'admin')
        AND admin_m.deleted_at IS NULL
    )
  );

-- invitation: UPDATE by owner/admin (cancel) or invited email (accept)
CREATE POLICY "invitation_update_admin_or_invitee" ON public.invitation
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.member admin_m
      WHERE admin_m.organization_id = public.invitation.organization_id
        AND admin_m.user_id = auth.uid()
        AND admin_m.role IN ('owner', 'admin')
        AND admin_m.deleted_at IS NULL
    )
    OR lower(public.invitation.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- user_active_org: user manages own only
CREATE POLICY "user_active_org_select_own" ON public.user_active_org
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_active_org_insert_own" ON public.user_active_org
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_active_org_update_own" ON public.user_active_org
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- role_permissions: read-only for authenticated (audit transparency)
CREATE POLICY "role_permissions_select_any" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);
-- No INSERT/UPDATE/DELETE policies — managed via migrations only.

-- ========================================================
-- Domain tables policies (rewrite)
-- ========================================================

-- Helper: create a macro for org-scoped SELECT with soft-delete + trash role-aware
-- Pattern para tablas con 'created_by_user_id':

-- properties
CREATE POLICY "properties_select_org" ON public.properties
  FOR SELECT TO authenticated
  USING (
    -- Super admin sees all
    (auth.jwt() ->> 'is_super_admin')::boolean = true

    OR (
      -- Regular: own org
      organization_id = (auth.jwt() ->> 'active_org_id')::uuid
      AND (
        -- Default: not deleted
        deleted_at IS NULL

        -- Trash mode: opt-in via app.include_deleted session setting
        OR (
          current_setting('app.include_deleted', true) = 'true'
          AND (
            -- Owner/admin see all trash
            (auth.jwt() ->> 'org_role') IN ('owner', 'admin')
            OR
            -- Agent sees only their own trash
            ((auth.jwt() ->> 'org_role') = 'agent' AND created_by_user_id = auth.uid())
          )
        )
      )
    )
  );

CREATE POLICY "properties_insert_org" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'active_org_id')::uuid
    AND created_by_user_id = auth.uid()
  );

CREATE POLICY "properties_update_role_aware" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    organization_id = (auth.jwt() ->> 'active_org_id')::uuid
    AND (
      (auth.jwt() ->> 'org_role') IN ('owner', 'admin')
      OR ((auth.jwt() ->> 'org_role') = 'agent' AND created_by_user_id = auth.uid())
    )
  );

-- No DELETE policy.

-- ---------- Replicate same pattern for: leads, appointments, ai_contents, lead_property_queue ----------
-- Same 3 policies (SELECT, INSERT, UPDATE) with same role-aware logic.
-- [full SQL omitted for brevity in plan — en ejecución, expandir cada tabla siguiendo este patrón]

-- ---------- bot_config, bot_conversations, bot_messages ----------
-- SELECT: org isolation + soft delete
-- INSERT: own org only
-- UPDATE: only owner/admin (no agent edits on bot)

-- ---------- analytics_events ----------
-- SELECT: own org
-- INSERT: own org
-- UPDATE: nadie (append-only)

-- ---------- agent_profiles ----------
-- SELECT: own org (agents see other agents' profiles as read-only)
-- INSERT: own org + auth.uid() matches
-- UPDATE: auth.uid() matches (own profile only)

-- ---------- platform_admins ----------
-- SELECT: solo super_admin o service_role
CREATE POLICY "platform_admins_select_super_only" ON public.platform_admins
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'is_super_admin')::boolean = true);
-- INSERT/UPDATE/DELETE: solo service_role (bypass).

-- ---------- property_transfers ----------
-- SELECT: involved users (from/to) + owner/admin of org
-- INSERT: owner/admin only
-- No UPDATE (audit trail immutable)

-- ========================================================
-- storage.objects policies (sub-plan 08 simplification)
-- ========================================================

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
DROP POLICY IF EXISTS "property_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "property_media_select" ON storage.objects;
DROP POLICY IF EXISTS "property_media_update" ON storage.objects;
DROP POLICY IF EXISTS "property_media_delete" ON storage.objects;
DROP POLICY IF EXISTS "brochures_insert" ON storage.objects;
DROP POLICY IF EXISTS "brochures_select" ON storage.objects;
DROP POLICY IF EXISTS "brochures_update" ON storage.objects;
DROP POLICY IF EXISTS "brochures_delete" ON storage.objects;

-- avatars (public bucket, org-scoped writes)
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own_org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

CREATE POLICY "avatars_update_own_org" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

CREATE POLICY "avatars_delete_own_org" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

-- property-media (public bucket, org-scoped writes)
CREATE POLICY "property_media_select_public" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'property-media');

CREATE POLICY "property_media_insert_own_org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

CREATE POLICY "property_media_update_own_org" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

CREATE POLICY "property_media_delete_own_org" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

-- brochures (private bucket, org-scoped everything)
CREATE POLICY "brochures_select_own_org" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'brochures'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

CREATE POLICY "brochures_insert_own_org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brochures'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

CREATE POLICY "brochures_update_own_org" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'brochures'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

CREATE POLICY "brochures_delete_own_org" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'brochures'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'active_org_id')
  );

-- Partial indexes for soft-delete tables (perf, sub-plan 07 folded in)
CREATE INDEX IF NOT EXISTS properties_active_idx ON public.properties(organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS leads_active_idx ON public.leads(organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS appointments_active_idx ON public.appointments(organization_id, starts_at)
  WHERE deleted_at IS NULL;
```

## Pasos

- [ ] **1.** Crear `drizzle/sql/006_rls_policies_supabase_auth.sql` con el SQL completo (expandir el stub de domain tables para todas: properties, leads, appointments, ai_contents, lead_property_queue, bot_config, bot_conversations, bot_messages, analytics_events, agent_profiles, platform_admins, property_transfers).

- [ ] **2.** Aplicar vía MCP `execute_sql` en partes si el archivo es muy grande (o via psql).

- [ ] **3.** Verificar RLS habilitada en todas las tablas:
  ```sql
  SELECT schemaname, tablename, rowsecurity, forcerowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (...);
  ```

- [ ] **4.** Verificar count de policies:
  ```sql
  SELECT tablename, count(*) FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
  GROUP BY tablename;
  ```

- [ ] **5.** Tests cruzados:
  - Crear 2 test users en 2 orgs distintas via dashboard + trigger.
  - Sign-in como user A → ver propiedades: 0 (correcto).
  - Crear propiedad en org A.
  - Sign-in como user B → ver propiedades: 0 (RLS blocks cross-org).
  - Verificar que funcionan upload storage con el mismo cliente auth.

- [ ] **6.** Commit.
  ```bash
  git commit -m "feat(auth-migration): phase 07 — RLS rewrite using auth.uid/auth.jwt

- Drop all policies that referenced current_setting('request.jwt.claims')
- New policies use auth.uid() and auth.jwt() -> 'active_org_id' / 'org_role'
- Enable + force RLS on multitenancy tables (organization, member, invitation, user_active_org, role_permissions)
- Rewrite storage.objects policies to use auth.jwt() natively (no more withRLS dependency)
- Partial indexes on deleted_at for perf

Ref: docs/plans/2026-04-16-supabase-auth-migration/07-rls-policies-rewrite.md"
  ```

## Checklist

- [ ] RLS habilitada + forzada en TODAS las tablas dominio + multitenancy
- [ ] Todas las policies viejas dropped
- [ ] Policies nuevas creadas con sintaxis `auth.uid()` / `auth.jwt()`
- [ ] Tests cruzados org A ≠ org B pasan
- [ ] Storage policies simplificadas (no más workaround)
- [ ] Partial indexes creados

## Rollback

Re-aplicar `drizzle/0002_rls_policies.sql` + la versión vieja de storage policies (desde histórico git). Drop las policies nuevas antes.

## Notas

- **Trash mode (papelera):** se preserva via `current_setting('app.include_deleted', true) = 'true'`. Esto lo setea el caller (Server Action) cuando accede a la vista papelera. Sub-plan 09 documenta cómo.
- **Super admin:** policies respetan `is_super_admin` del JWT. Tabla `platform_admins` sigue siendo source of truth (hook la lee).
- **Soft delete:** todas las tablas dominio preservan deleted_at. Default SELECT filtra deleted_at IS NULL. Trash mode se opt-in.
- **Por brevedad:** el SQL de "domain tables" queda en stub en este plan. Durante ejecución, el engineer debe:
  - Leer `drizzle/0002_rls_policies.sql` actual.
  - Por cada policy existente, reescribirla con la nueva sintaxis.
  - Preservar: org isolation, soft delete, role-aware trash, super admin override.
  - Agregar SELECT/INSERT/UPDATE por tabla según el patrón.
