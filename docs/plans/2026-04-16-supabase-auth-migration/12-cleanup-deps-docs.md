# Sub-plan 12 — Cleanup Dependencies + Docs

> **Depends on:** 01-11 completas
> **Unlocks:** 14 (testing)

## Goal

Purgar artifacts de Better Auth:

- Dependencies npm
- Archivos TS obsoletos
- Tablas legacy
- Config obsoleta
- Actualizar `CLAUDE.md` y `docs/implementation-plan.md` reflejando arquitectura final

## Archivos a borrar

```
lib/auth.ts
lib/auth-client.ts
lib/auth-utils.ts
lib/auth-permissions.ts
app/api/auth/[...all]/route.ts           # Borrar directorio entero
```

## Archivos a verificar tras Fase 09 (ya borrados)

```
features/shared/infrastructure/rls.ts    # Verificar si aún existe (se modificó en Fase 09)
                                         # En realidad se MANTIENE con claims nuevos.
                                         # Solo verificar.
lib/db/rls.ts                            # Borrado en Fase 09
lib/db/session-context.ts                # Borrado en Fase 09
```

## Dependencies

```bash
npm uninstall better-auth
```

Verificar que no queda en `package.json`:
```bash
grep better-auth package.json  # should be empty
```

## Tablas DB a borrar (legacy Better Auth)

```sql
-- drizzle/sql/012_drop_legacy_tables.sql

-- Ejecutar SOLO después de Fase 11 (migration) o confirmación de purge
-- y tras verificar que auth.users tiene los users migrados.

DROP TABLE IF EXISTS public.invitation_legacy_better_auth CASCADE;
DROP TABLE IF EXISTS public.member_legacy_better_auth CASCADE;
DROP TABLE IF EXISTS public.organization_legacy_better_auth CASCADE;
DROP TABLE IF EXISTS public.account CASCADE;
DROP TABLE IF EXISTS public.session CASCADE;
DROP TABLE IF EXISTS public."user" CASCADE;
DROP TABLE IF EXISTS public.verification CASCADE;
```

## Env vars a eliminar

De `.env.local`:

```
# ELIMINAR:
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
```

Los mantenemos por compat durante la transición. Fase 12 los quita.

En Google Cloud Console → OAuth redirect URIs:
- Mantener la URI de Supabase (`/auth/v1/callback`)
- Borrar la URI de Better Auth (`/api/auth/callback/google`)

## `CLAUDE.md` — sección reescribir

Reemplazar sección "Tenancy & Auth Model" y "Database Layer" con contenido reflejando:

- Supabase Auth como auth provider
- `auth.users` tabla managed por Supabase
- `public.organization`, `public.member`, `public.invitation`, `public.user_active_org`
- Custom access token hook inyecta claims
- RLS usa `auth.uid()` y `auth.jwt()`
- `withRLS()` sigue existiendo (para Drizzle queries), pero claims ahora vienen de Supabase Auth
- `getSupabaseServerClient()` vs `getSupabaseAdmin()`

Detalle del contenido nuevo para `CLAUDE.md`:

````markdown
## Tenancy & Auth Model

- **Auth:** Supabase Auth (email/password + Google OAuth) con custom access token hook para claims
- **Multitenancy:** `public.organization` + `public.member` + `public.invitation` en `public.*`. FK a `auth.users.id`.
- **Pattern:** "Everything is an org" — trigger `on_auth_user_created` auto-crea org default para cada user nuevo.
- **Custom roles:** `owner` (1 per org), `admin` (N), `agent` (N) — seed en `public.role_permissions`.
- **Plans:** `free`, `pro`, `enterprise` en `organization.plan`.
- **Visibilidad cross-agent:** agents ven otros agents en misma org (read-only), via RLS policy role-aware.
- **Multi-org:** `user_active_org` persiste org elegida. JWT hook lee esta tabla para emitir claims. Switching vía `switchActiveOrgAction` + `supabase.auth.refreshSession()`.
- **Super admin:** tabla `public.platform_admins`. Hook setea claim `is_super_admin`. Policies validan.
- **Billing:** Paddle + Payoneer (sin cambio).

### JWT Claims (custom_access_token_hook)

El hook inyecta en cada JWT:
- `sub`: user id (auth.uid())
- `role`: "authenticated" (Postgres role)
- `aud`: "authenticated"
- `active_org_id`: UUID de la org activa (o null si sin org)
- `org_role`: "owner" | "admin" | "agent" | null
- `is_super_admin`: boolean
- `user_name`: nombre visible

Policies acceden vía `auth.jwt() ->> 'active_org_id'`, etc.

### Session flow

Web:
1. User signs in → Supabase Auth crea session, setea cookie `sb-<project>-auth-token`.
2. `proxy.ts` usa `updateSession` de `@supabase/ssr` para refrescar cookie en cada request (TTL 1h).
3. Server Components + Server Actions usan `getSupabaseServerClient()` (lee cookie) o `getSessionContext()` (parsea claims).
4. RLS aplica automáticamente sobre Supabase client queries.
5. Para Drizzle queries, `withRLS(ctx, ...)` inyecta claims manualmente como `request.jwt.claims` + `SET LOCAL ROLE authenticated`.

Mobile (futuro):
1. User signs in via Supabase SDK → JWT + refresh token.
2. SDK envía JWT en Authorization header a Supabase API.
3. Backend Next.js (si usado para features custom) acepta Bearer JWT en API routes.
4. Detalle en `docs/plans/2026-04-16-supabase-auth-migration/13-mobile-skeleton.md`.

## Database Layer

- **ORM:** Drizzle ORM + Drizzle Kit para tablas domain + multitenancy.
- **Connection:** shared `pg` pool en `lib/db/pool.ts`.
- **Drizzle instance:** `lib/db/index.ts`.
- **Schemas:** `lib/db/schema/` — incluye `organization.ts`, `member.ts`, `invitation.ts`, `user_active_org.ts`, `role_permissions.ts`, `platform_admins.ts`.
- **Migrations:** Drizzle Kit (`drizzle/*.sql`) + manual SQL (`drizzle/sql/*.sql`) para hooks/functions/policies.
- **RLS:** Supabase Auth nativo sobre cliente auth (`supabase.from(...)`). Para Drizzle: `withRLS()` wrapper en `features/shared/infrastructure/rls.ts` inyecta claims match al JWT Supabase.

### Archivos Supabase

- `lib/supabase/server.ts` → `getSupabaseServerClient()` (auth cookies), `getSupabaseAdmin()` (service_role para admin ops).
- `lib/supabase/client.ts` → `createClient()` browser.
- `lib/supabase/proxy.ts` → `updateSession()` para middleware.
- `lib/supabase/storage.ts` → helpers de Storage (aceptan cliente como param).
- `lib/supabase/config.ts` → BUCKET_CONFIG SoT.

### ⚠️ Cuándo usar cuál cliente

| Operación | Cliente |
|---|---|
| Server Action que corre lógica user-scoped | `getSupabaseServerClient()` + Drizzle con `withRLS(ctx)` |
| Storage upload/download user | `getSupabaseServerClient()` + `uploadFile(client, ...)` |
| Admin ops (invite, user create, seed) | `getSupabaseAdmin()` |
| Inngest background jobs cross-org | `getSupabaseAdmin()` |
| Public queries (landing page) | `getSupabaseServerClient()` sin session → role `anon` → solo SELECT policies públicas |

Nunca usar `getSupabaseAdmin()` en Server Actions que responden a user input — bypasea RLS.

### ⚠️ DANGER: drizzle-kit push

(Sin cambios de sección, preservar del CLAUDE.md actual — sigue aplicando.)
````

## `docs/implementation-plan.md` — actualizar

Actualizar sección Capa 1 — Fundación:

```markdown
### 1.1 Supabase Auth — Autenticación, organizations y roles

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 1.1.1 | Configurar Supabase Auth (email/password + Google) | Dashboard config, SMTP, templates | ✅ |
| 1.1.2 | Custom access token hook | Inyecta active_org_id, org_role, is_super_admin, user_name en JWT | ✅ |
| 1.1.3 | Schema multitenancy | public.organization, member, invitation, user_active_org, role_permissions | ✅ |
| 1.1.4 | Trigger on_auth_user_created | Auto-crea org default para user nuevo | ✅ |
| 1.1.5 | RBAC + authorize() function | Seed role_permissions + function para permission check | ✅ |
| 1.1.6 | RLS policies rewrite | Todas las tablas usan auth.uid() / auth.jwt() ->> claims | ✅ |
| 1.1.7 | Storage simplification | Sin service_role workaround; cliente auth aplica RLS nativo | ✅ |
| 1.1.8 | Server Actions refactor | getSessionContext lee Supabase claims; getSupabaseServerClient ubiquo | ✅ |
| 1.1.9 | UI components | sign-up, sign-in, forgot-password, UserButton, OrgSwitcher, MembersList | ✅ |
| 1.1.10 | Invitations flow | Email-based via Supabase admin API + public.invitation | ✅ |
| 1.1.11 | Data migration de Better Auth | (purge o migrate según decisión previa) | ✅ |
| 1.1.12 | Apple OAuth | Diferido a producción | ⏭️ |
| 1.1.13 | Geolocalización en sessions | Diferido | ⏭️ |
| 1.1.14 | Mobile SDK setup | Sub-plan 13 skeleton; implementación cuando arranque stream mobile | ⏭️ |
| 1.1.15 | E2E tests manual | `14-testing-checklist.md` completado | ✅ |
```

Y agregar en header:

```markdown
> **Migración Better Auth → Supabase Auth completada:** YYYY-MM-DD.
> Documentación completa: `docs/plans/2026-04-16-supabase-auth-migration/`
```

## Obsolescencia de otros docs

Borrar o marcar obsoletos:

- `docs/plans/2026-04-15-profile-settings-modular-split.md` → prepend warning: "OBSOLETO — superseded por migración Supabase Auth. Re-evaluar profile/settings split después."

## Pasos

- [ ] **1.** Borrar archivos TS:
  ```bash
  rm lib/auth.ts lib/auth-client.ts lib/auth-utils.ts lib/auth-permissions.ts
  rm -rf app/api/auth
  ```

- [ ] **2.** Uninstall `better-auth`:
  ```bash
  npm uninstall better-auth
  ```

- [ ] **3.** Grep para confirmar 0 references:
  ```bash
  rg "better-auth" --type ts --type tsx
  # Debe retornar 0 matches
  rg "from \"@/lib/auth\"" --type ts --type tsx
  # Debe retornar 0 matches
  ```

  Si hay matches, actualizar imports o eliminar código huérfano.

- [ ] **4.** Borrar env vars obsoletas en `.env.local`.

- [ ] **5.** Google Cloud Console → borrar redirect URI vieja.

- [ ] **6.** Drop tablas legacy:
  ```bash
  # Via MCP execute_sql o psql
  psql $DATABASE_URL -f drizzle/sql/012_drop_legacy_tables.sql
  ```

- [ ] **7.** Verificar DB clean:
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('user', 'session', 'account', 'verification', 'organization_legacy_better_auth', 'member_legacy_better_auth', 'invitation_legacy_better_auth');
  -- Debe retornar 0 filas
  ```

- [ ] **8.** Reescribir secciones Tenancy & Auth Model y Database Layer en `CLAUDE.md`.

- [ ] **9.** Actualizar `docs/implementation-plan.md` Capa 1.

- [ ] **10.** Marcar `docs/plans/2026-04-15-profile-settings-modular-split.md` como obsoleto.

- [ ] **11.** Build + lint check. Todos los imports deben resolver.

- [ ] **12.** Commit.
  ```bash
  git commit -m "feat(auth-migration): phase 12 — cleanup Better Auth artifacts

- Remove lib/auth*, app/api/auth
- Uninstall better-auth npm dep
- Drop legacy tables: user, session, account, verification, *_legacy_better_auth
- Update CLAUDE.md: new auth architecture, JWT claims, session flow
- Update docs/implementation-plan.md: Capa 1 reflects Supabase Auth
- Mark 2026-04-15-profile-settings-modular-split.md obsolete

Ref: docs/plans/2026-04-16-supabase-auth-migration/12-cleanup-deps-docs.md"
  ```

## Checklist

- [ ] `better-auth` uninstalled
- [ ] Archivos TS borrados
- [ ] Legacy tables dropped
- [ ] Env vars limpias
- [ ] Google Console actualizado
- [ ] `CLAUDE.md` refleja arquitectura nueva
- [ ] `docs/implementation-plan.md` actualizado
- [ ] `2026-04-15-profile-settings-modular-split.md` marcado obsolete
- [ ] Build + lint pass
- [ ] `rg "better-auth"` retorna 0

## Rollback

Complejo — esta fase es destructiva. Rollback requiere:
1. `git revert` del commit
2. Restaurar tablas desde backup (Fase 11)
3. Reinstalar better-auth
4. Reconfigurar Google Cloud Console redirect URI vieja

En la práctica: llegar a Fase 12 sin confidence es un error. Debería correr después de Fase 14 testing pasando. Si sub-plan 14 falla → no se ejecuta Fase 12.

## Notas

- Si el file `features/shared/infrastructure/rls.ts` aún existe (no borrado en Fase 09), verificar que usa claims nuevos. Si sí, se mantiene. Si está roto, fix.
- Verificar que tests pasen (Fase 14 primero).
- `roles-and-permissions.md` en docs queda como referencia — podría update o mantener como lore.
