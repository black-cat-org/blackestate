# Migración Better Auth → Supabase Auth — Master Plan

> **Estado:** Escrito, pendiente de ejecución.
> **Fecha creación:** 2026-04-16
> **Autor del plan:** Claude (inventario + diseño)
> **Ejecutor:** Claude en sesión(es) futura(s), bajo supervisión del usuario.

## Goal

Reemplazar Better Auth por Supabase Auth como sistema de autenticación, preservando íntegramente la arquitectura multitenancy (organizaciones, miembros, roles, invitaciones) que Better Auth Organization Plugin otorgaba out-of-the-box, ahora reconstruida sobre tablas propias en `public.*`. Al terminar, toda funcionalidad observable del app debe ser **equivalente a hoy**, con arquitectura más simple, nativa al ecosistema Supabase, y compatible con mobile clients futuros.

## Por qué

1. **Problema inmediato:** acoplamiento Better Auth ↔ Supabase ecosystem. Cada feature Supabase nueva (Storage ahora, Realtime/Vector/Edge Functions a futuro) requiere carpintería de JWT signing o Third-Party Auth para que RLS funcione de verdad.
2. **Mobile confirmado en roadmap:** Supabase Auth tiene SDK mobile clase mundial. Better Auth mobile está detrás.
3. **Stage inicial del proyecto:** sin users reales que migrar, el switch cost nunca va a ser más bajo que ahora.
4. **Coherencia de stack:** DB, Storage, futuro Realtime/Vector/Edge ya son Supabase. Mantener Auth fuera agrega un sistema más en la cabeza del equipo y un puente que sangra complejidad por cada feature.
5. **Decisión del usuario** (ver `docs/plans/2026-04-15-profile-settings-modular-split.md` quedó obsoleto — esa migración se re-planifica desde cero aquí).

## Alcance (in vs out)

### In scope

- Reemplazar Better Auth por Supabase Auth (email/password + Google OAuth).
- Reconstruir multitenancy en `public.*`:
  - `organization`, `member`, `invitation` con triggers/hooks equivalentes.
  - Auto-creación de org en sign-up (3-layer defense → 1-layer nativa con DB trigger).
  - Active organization persistida + switching.
  - Roles custom: `owner`, `admin`, `agent`.
  - Permissions via `authorize()` function + RLS.
- Custom claims en JWT (`custom_access_token_hook`): `org_id`, `org_role`, `is_super_admin`, `active_org_id`.
- Invitations: email-based con Supabase Auth + app-level acceptance flow.
- Reescribir RLS policies usando `auth.uid()` y `auth.jwt() -> claims` (eliminar `withRLS()` y el SQL helper de claim injection manual).
- Simplificar Storage helpers (eliminar service_role bypass — cliente Supabase autenticado ya resuelve RLS nativamente).
- Migrar UI de auth:
  - Sign-up, sign-in, sign-out, password reset, email verification.
  - UserButton, OrgSwitcher.
- Refactor de `getSessionContext()` para leer de Supabase Auth.
- Migrar test users existentes en DB (si los hay).
- Cleanup de deps (`better-auth`, related) + actualizar `CLAUDE.md`.
- Testing manual checklist para validar equivalencia funcional.

### Out of scope (diferido)

- Mobile integración completa (iOS/Android SDK). Se deja **skeleton + subplan 13** con decisiones preliminares; ejecución cuando arranque el stream de mobile.
- 2FA (no existía antes; postergable).
- Magic link login (no existía; postergable).
- Apple OAuth (ya diferido en plan original).
- Enterprise features: SSO/SAML, SCIM (no existían).

### Explícitamente preservado

- Todos los plugins y hooks actuales de DB (triggers de Drizzle migrations).
- RLS en tablas dominio: misma semántica, distinta sintaxis.
- Paleta de permisos: `property`, `lead`, `analytics`, `bot`, `settings`, `billing`.
- Plan commercial: `free`, `pro`, `enterprise`.
- Super admin flag.
- Pool compartido `lib/db/pool.ts` + Drizzle.
- Toda la arquitectura Clean Architecture / features/ / use cases / presentation.

## Fases y dependencias

```
Fase 0: Preparación
  ├─→ Fase 1: Schema multitenancy (tablas public.organization, member, invitation)
  │     ↓
  ├─→ Fase 2: Supabase Auth config (providers, templates, SMTP)
  │     ↓
  ├─→ Fase 3: Custom claims hook (JWT enriquecido con org_id, role, etc.)
  │     ↓
  ├─→ Fase 4: RBAC + authorize() function
  │     ↓
  ├─→ Fase 5: Org creation lifecycle (DB trigger on auth.users insert)
  │     ↓
  ├─→ Fase 6: Invitations flow
  │     ↓
  ├─→ Fase 7: RLS policies rewrite (eliminar withRLS, usar auth.uid/auth.jwt)
  │     ↓
  ├─→ Fase 8: Storage simplification (eliminar service_role hack)
  │     ↓
  ├─→ Fase 9: Server Actions refactor (getSessionContext, eliminar withRLS)
  │     ↓
  ├─→ Fase 10: UI components migration
  │     ↓
  ├─→ Fase 11: Data migration (test users, si los hay)
  │     ↓
  ├─→ Fase 12: Cleanup deps + docs
  │     ↓
  └─→ Fase 14: Testing checklist manual + gate para marcar done

Fase 13 (skeleton mobile) — independiente, paralela o posterior
```

Cada fase tiene su sub-plan. Algunas pueden empalmarse en paralelo si la infra permite (ej: Fase 10 UI mientras se prueba Fase 7 RLS), pero el orden por default asume ejecución serial para minimizar branches de debug simultáneos.

## Sub-plans

| # | Archivo | Descripción |
|---|---|---|
| 01 | `01-schema-multitenancy.md` | Tablas `public.organization`, `public.member`, `public.invitation` con FKs a `auth.users`. Drizzle schemas + migration SQL. Plan/maxSeats/logoUrl/title fields preservados. |
| 02 | `02-supabase-auth-config.md` | Dashboard: enable email/password, Google OAuth, SMTP via Resend, email templates. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. |
| 03 | `03-custom-claims-hook.md` | Postgres function `custom_access_token_hook(event jsonb) returns jsonb`. Enable en dashboard. Inyecta `active_org_id`, `org_role`, `is_super_admin`, `user_name`. |
| 04 | `04-rbac-permissions.md` | Enum `app_permission`, `app_role`. Tablas `role_permissions`. Function `authorize(permission)`. Seed con las 20+ permissions actuales. |
| 05 | `05-org-creation-lifecycle.md` | Trigger `on_auth_user_created` → crea org default + member owner. Tabla `user_active_org` para switching. Server Actions `switchActiveOrg`, `createOrganization`. |
| 06 | `06-invitations.md` | `inviteToOrgAction` via `supabase.auth.admin.inviteUserByEmail()` + row en `invitation` + email template. Acceptance flow en `/accept-invite?token=...`. |
| 07 | `07-rls-policies-rewrite.md` | Todas las RLS en tablas dominio (properties, leads, appointments, etc.) migradas a `auth.uid()` / `auth.jwt() ->> 'active_org_id'`. Eliminar `withRLS()`. |
| 08 | `08-storage-simplification.md` | Eliminar service_role bypass en `lib/supabase/storage.ts`. Usar cliente Supabase authenticated (cookies de sesión). Storage RLS policies simplificadas. |
| 09 | `09-server-actions-refactor.md` | `getSessionContext()` lee de `supabase.auth.getClaims()`. Eliminar `withRLS()`, `lib/db/rls.ts`, `features/shared/infrastructure/rls.ts`. Actualizar todas las actions/use cases. |
| 10 | `10-ui-components-migration.md` | Sign-up, sign-in, UserButton, OrgSwitcher reescritos usando `@supabase/ssr` client + custom hooks. Password reset + email verification UI. |
| 11 | `11-data-migration-script.md` | Script node para migrar users de `user`/`session`/`account`/`organization`/`member` (Better Auth) → `auth.users` + `public.organization`/`public.member`. Incluye mapping de OAuth accounts. |
| 12 | `12-cleanup-deps-docs.md` | `npm uninstall better-auth`. Borrar `lib/auth.ts`, `lib/auth-client.ts`, `lib/auth-utils.ts`, `lib/auth-permissions.ts`, `app/api/auth/[...all]`. Reescribir sección Auth en `CLAUDE.md`. Actualizar `docs/implementation-plan.md`. |
| 13 | `13-mobile-skeleton.md` | Decisiones preliminares mobile: SDK elegido (Supabase Expo), flujo OAuth, deep linking, session persistence, refresh. NO implementación. |
| 14 | `14-testing-checklist.md` | Lista manual end-to-end: sign-up + org auto-create + OAuth + invitaciones + switching + upload avatar + CRUD properties + RLS isolation entre orgs + sign-out. |

## Riesgos + mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración data corrompe test users existentes | Media | Bajo (solo test data) | Backup completo DB antes. Migration script idempotente con dry-run mode. |
| `custom_access_token_hook` mal configurado → JWTs rotos → todo el app sin acceso | Baja | Alto | Implementar hook con extensive tests en DB (INSERT fake auth.users, call hook, inspect claims). Rollback: disable hook en dashboard. |
| RLS policies rotas tras rewrite → data leak cross-org o pérdida de acceso | Media | Crítico | Testear cada tabla post-rewrite con 2 test orgs. Verificación via SQL (SELECT con session ctx diferentes). Tienes backup de policies actuales en `drizzle/0002_rls_policies.sql`. |
| Invitación email no se manda (SMTP mal configurado) | Media | Medio | Configurar Resend SMTP en Supabase dashboard antes de Fase 6. Email test `supabase.auth.admin.inviteUserByEmail(test@...)` antes de UI. |
| Session cookies rotas entre middleware y Server Action | Baja | Alto | Usar exactamente el patrón `@supabase/ssr` docs (proxy.ts + createServerClient). No inventar. |
| Google OAuth redirect URI mismatch post-migración | Media | Alto | Actualizar URL en Google Cloud Console ANTES de desactivar Better Auth OAuth. Probar en sign-in real. |
| Active org no persiste entre sessions | Media | Medio | Tabla `user_active_org` (userId, orgId) en DB + leer en `custom_access_token_hook`. Cubierto en sub-plan 05. |
| Claims desincronizados con DB (user cambia de org pero JWT viejo no refleja) | Media | Medio | TTL corto de JWT (default 1h OK) + forzar refresh en `organization.setActive()` vía `supabase.auth.refreshSession()`. |
| Break en deployment prod durante migración | Media | Alto | Migración se ejecuta en branch separada. Merge a main solo después del checklist completo en preview deployment. |
| Mobile requisitos descubiertos a mitad de migración | Baja | Medio | Sub-plan 13 captura decisiones preliminares. Implementación mobile es posterior independiente. |

## Rollback strategy

Si la migración falla en medio o post-deploy aparecen issues críticos:

1. **Durante desarrollo (pre-merge):** branch se descarta. Main queda intacto.
2. **Post-merge, pre-deploy:** `git revert` del merge commit. Re-deploy.
3. **Post-deploy con data nueva creada en Supabase Auth:**
   - Test users en Supabase Auth (`auth.users`) y en `public.organization`/`member` deben mergearse a Better Auth tables en rollback.
   - Migration script reverso (no escrito en este plan; si llegamos a este escenario es failure de testing previo).
   - Mejor prevención: NO deployar a prod hasta completar checklist sub-plan 14 en preview.

## Timeline estimado

- **Fase 01-04 (infra + schema + hooks):** 1 día
- **Fase 05-08 (lifecycle + invitations + RLS + storage):** 1-1.5 días
- **Fase 09-10 (server actions + UI):** 1 día
- **Fase 11-12 (data + cleanup):** medio día
- **Fase 13 (mobile skeleton):** 2-3 horas
- **Fase 14 (testing):** medio día

**Total estimado: 4-5 días de trabajo dedicado.** Con inevitables bugs + iteración: **1 semana**. La estimación previa de "1-2 semanas" que di en la conversación es conservadora e incluye buffer para problemas no previstos.

## Criterios de éxito

La migración está completa cuando:

1. ✅ Usuario puede signup (email/password) → org auto-creada → redirect /dashboard, sin errores
2. ✅ Usuario puede sign-in con Google OAuth → dashboard
3. ✅ Invitar a otro email → recibe email → acepta → aparece como member en la org
4. ✅ Owner crea otra org → aparece en OrgSwitcher → switch activa
5. ✅ Upload avatar funciona (storage uso cliente Supabase authenticated, RLS activa)
6. ✅ CRUD propiedades funciona con RLS activa (no bypass via service_role excepto casos legítimos)
7. ✅ Usuario de org A NO ve propiedades de org B (tested via 2 test users)
8. ✅ Sign-out limpia sesión → redirect a /sign-in
9. ✅ `npm run build` pass sin warnings nuevos
10. ✅ `npm run lint` pass con warnings ≤ actuales
11. ✅ `better-auth` desinstalado, 0 references en código
12. ✅ `CLAUDE.md` actualizado reflejando arquitectura nueva
13. ✅ `docs/implementation-plan.md` actualizado

Si cualquier check falla: blocker, no se mergea.

## Decisiones arquitectónicas clave

### 1. Schema: `public.organization` NO en `auth.*`

Supabase convención: tu schema app en `public.*`. `auth.*` es managed por Supabase (`auth.users`, `auth.sessions`, etc.). Nuestras tablas org/member/invitation van en `public.*` con FK a `auth.users.id`.

### 2. Active org: tabla separada, no en JWT directamente

El JWT se refresh desde el hook, pero persistir la elección del user entre sessions requiere DB. Tabla `user_active_org (user_id UUID PK, org_id UUID)` — el hook la consulta al emitir el JWT.

### 3. Rol en JWT es el rol EN LA ORG ACTIVA

Un user puede tener role distinto en distintas orgs. El hook lee `org_role` de la fila `member` correspondiente a `active_org_id`.

### 4. Papelera: via query flag, no en JWT

`app.include_deleted = 'true'` era un GUC per-transacción. En el nuevo modelo, lo hacemos explícito en queries: `WHERE deleted_at IS NULL` vs `WHERE deleted_at IS NOT NULL` según el caso de uso (papelera UI). No más GUC injection.

### 5. Super admin: claim explícito + tabla

Tabla `platform_admins(user_id UUID PK)` se preserva. El hook agrega `is_super_admin: true` si user está listado. Policies usan `(auth.jwt() ->> 'is_super_admin')::boolean`.

### 6. Eliminar `withRLS()` por completo

Era necesario porque Better Auth no podía inyectar claims a Postgres via el cliente Supabase. Con Supabase Auth, el cliente ya lleva el JWT; RLS se ejecuta nativamente. Llamadas Drizzle desde Server Actions usan la conexión Postgres con JWT contextual vía RLS natural. `lib/db/rls.ts` y `features/shared/infrastructure/rls.ts` se eliminan.

### 7. Cliente DB en Server Actions: dos opciones, adoptar ambas

- **Opción A (preferida, cuando posible):** usar `createServerClient()` de `@supabase/ssr` + `.from('properties').select(...)` directamente. RLS activa vía cookies de sesión. Sirve para CRUD simple.
- **Opción B (para queries complejas):** mantener Drizzle via `lib/db/pool.ts`, pero agregar `SET LOCAL ROLE authenticated` + inyectar JWT claims de Supabase al iniciar la transaction. Un helper mínimo (más chico que `withRLS()` actual).

Sub-plan 09 detalla qué queries van por cuál camino.

### 8. Storage: siempre cliente authenticated

`lib/supabase/storage.ts` deja de usar service_role para uploads. Usa `createServerClient()` con cookies. El user JWT lleva `org_id` → RLS policies validan. `service_role` queda solo para admin ops legítimas (Inngest jobs, seed scripts).

## Lo que se elimina explícitamente

Al terminar la migración, estos archivos/conceptos desaparecen:

- `lib/auth.ts` (Better Auth config) → reemplazado por `@supabase/ssr` utilities
- `lib/auth-client.ts` → reemplazado por `@supabase/ssr` createBrowserClient
- `lib/auth-utils.ts` (ensureOrganization, getSession) → lógica movida a sub-plan 05 trigger + Server Actions
- `lib/auth-permissions.ts` → reemplazado por `public.role_permissions` + `authorize()` function
- `app/api/auth/[...all]/route.ts` → Supabase Auth no requiere custom routes
- `features/shared/infrastructure/rls.ts` → ya no necesario
- `lib/db/rls.ts` → ya no necesario (versión duplicada)
- `lib/db/session-context.ts` → duplicado, ya estaba para borrar
- Scripts auth de Better Auth en package.json (si los hay)
- Tablas Better Auth en DB (`user`, `session`, `account`, `organization`, `member`, `invitation` de Better Auth) → data migrada a nuevas tablas

## Lo que se crea

- `lib/supabase/client.ts` — createBrowserClient (ya existe como template, rewrite)
- `lib/supabase/server.ts` — reescrito: createServerClient + getSupabaseAdmin
- `lib/supabase/proxy.ts` — updateSession para middleware
- `proxy.ts` — usa updateSession
- `features/shared/infrastructure/session-context.ts` — reescrito para Supabase Auth
- `features/shared/infrastructure/supabase-server.ts` — helper para usar Supabase client autenticado en Server Actions
- `lib/db/schema/organization.ts` — tabla Drizzle
- `lib/db/schema/member.ts` — tabla Drizzle
- `lib/db/schema/invitation.ts` — tabla Drizzle
- `lib/db/schema/user-active-org.ts` — tabla Drizzle
- `lib/db/schema/role-permissions.ts` — tabla Drizzle
- Migrations Drizzle-generadas para todas las tablas nuevas
- SQL migrations para: custom_access_token_hook, trigger org creation, authorize() function, RLS policies
- Componentes UI: sign-up, sign-in, UserButton, OrgSwitcher (reescritos)
- `app/(auth)/forgot-password/page.tsx` (nuevo — no existía)
- `app/(auth)/verify-email/page.tsx` (nuevo — si habilitamos verification)
- `app/accept-invite/page.tsx` (nuevo)

## Dependencias nuevas

```
npm install @supabase/ssr
npm uninstall better-auth
```

Otras deps existentes (`@supabase/supabase-js`, `pg`, `drizzle-orm`) se mantienen.

## Env vars — cambios

**Se eliminan:**
- `BETTER_AUTH_SECRET` (si estaba)
- `BETTER_AUTH_URL` (si estaba)

**Se agregan:**
- `NEXT_PUBLIC_SUPABASE_URL` (público, se expone al browser — ya existe como `SUPABASE_URL` interno, duplicar con prefijo NEXT_PUBLIC)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nuevo)
- `NEXT_PUBLIC_APP_URL` (público — usado en redirectTo de OAuth + invitation links; ej. `http://localhost:3000` dev, `https://app.blackestate.com` prod)

**Se mantienen:**
- `SUPABASE_SERVICE_ROLE_KEY` (para admin ops legítimas)
- `DATABASE_URL` (Drizzle + Better Auth antes, solo Drizzle ahora)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (reconfigurar callback URL en Google Cloud Console)

**Supabase Dashboard — configs nuevas:**
- Google OAuth provider habilitado con los mismos credentials
- SMTP custom (Resend) para emails transaccionales
- Custom access token hook habilitado

## Orden de ejecución recomendado por sesión

Sesión 1: Fases 01, 02, 03 (schema + auth config + hook)
Sesión 2: Fases 04, 05 (RBAC + org lifecycle)
Sesión 3: Fases 06, 07 (invitations + RLS rewrite)
Sesión 4: Fases 08, 09 (storage + server actions refactor)
Sesión 5: Fase 10 (UI migration)
Sesión 6: Fases 11, 12 (data migration + cleanup)
Sesión 7: Fases 13, 14 (mobile skeleton + testing)

Cada sesión: branch separada → merge a main al final con sub-plan completado y checklist intermedio pasando.

## Convenciones de commits

Cada sub-plan termina con un commit con mensaje:

```
feat(auth-migration): phase NN — <descripción corta>

<bullet points de cambios clave>

Ref: docs/plans/2026-04-16-supabase-auth-migration/NN-<slug>.md
```

## Próximos pasos

Para iniciar ejecución:

1. Leer este master plan completo.
2. Leer el sub-plan 01 (`01-schema-multitenancy.md`) — es el primer paso.
3. Crear branch `feat/auth-migration-phase-01`.
4. Seguir sub-plan 01 paso a paso.
5. Commit + PR + merge.
6. Pasar al sub-plan 02.
7. Repetir hasta sub-plan 14.

## Referencias

- Inventario Better Auth actual: investigación completa en el chat del 2026-04-16.
- Supabase custom claims hook: https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac
- Supabase SSR Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- CLAUDE.md (actual, pre-migración): `/Users/gonzalopinell/projects/black-cat/blackestate/CLAUDE.md`
- RLS policies actuales: `drizzle/0002_rls_policies.sql`
- Roles y permissions: `docs/roles-and-permissions.md`
