-- Sub-plan 01 preamble — rename Better Auth tables before Drizzle migration.
--
-- Rationale:
--   Fase 01 crea public.organization, public.member, public.invitation con el
--   schema multitenancy nuevo. Esos nombres colisionan con las tablas que
--   Better Auth creó en su propia migration inicial. Postgres tracks FKs by
--   OID (not name), así que el rename preserva integridad referencial — las
--   10 tablas dominio (properties, leads, etc.) siguen apuntando a la tabla
--   renombrada, que ahora se llama organization_legacy_better_auth.
--
-- Post-conditions:
--   - public.organization  NO existe
--   - public.organization_legacy_better_auth  existe con la misma data
--   - FKs de domain tables apuntan automáticamente al nombre nuevo
--   - Lo mismo para member, invitation
--
-- Siguiente paso:
--   drizzle-kit generate + migrate crea public.organization/member/invitation
--   nuevas (Drizzle schemas del sub-plan 01).

ALTER TABLE IF EXISTS public.organization RENAME TO organization_legacy_better_auth;
ALTER TABLE IF EXISTS public.member RENAME TO member_legacy_better_auth;
ALTER TABLE IF EXISTS public.invitation RENAME TO invitation_legacy_better_auth;

-- Check post-condition
DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('organization', 'member', 'invitation');
  IF cnt > 0 THEN
    RAISE EXCEPTION 'Rename failed: % legacy tables still exist with old names', cnt;
  END IF;
END
$$;
