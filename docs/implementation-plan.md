# Black Estate — Plan de Implementación

> Plan de ejecución granular para llevar Black Estate de frontend con datos mock a producto funcional con backend real.
>
> **Creado:** 2026-04-13
> **Última actualización:** 2026-04-14
> **Estado:** Capa 1 completada, Capa 2.1 (schema) completada, enums migrados a inglés. Siguiente: RLS policies, luego reemplazar mocks con queries reales.

---

## Resumen de capas

| Capa | Nombre | Dependencias | Estado |
|------|--------|-------------|--------|
| 1 | Fundación (Auth + DB) | Ninguna | ✅ Completada |
| 2 | Data Layer Real | Capa 1 | 🔄 En progreso (schema done, queries pendientes) |
| 3 | Lógica Asíncrona y AI | Capa 2 | ⬜ Pendiente |
| 4 | Observabilidad y Notificaciones | Capa 3 | ⬜ Pendiente |
| 5 | Soporte y Marketing | Capa 4 | ⬜ Pendiente |

---

## Capa 1 — Fundación (sin esto nada más funciona)

### 1.1 Better Auth — Autenticación, organizations y roles

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 1.1.1 | Instalar Better Auth | `npm install better-auth` | ✅ |
| 1.1.2 | Configurar env vars | `BETTER_AUTH_SECRET` (32+ chars), `BETTER_AUTH_URL`, `DATABASE_URL` en `.env.local` | ✅ |
| 1.1.3 | Crear instancia auth (server) | `lib/auth.ts` con `betterAuth()`, PostgreSQL adapter, email/password, Google OAuth, Apple OAuth | ✅ |
| 1.1.4 | Crear cliente auth (client) | `lib/auth-client.ts` con `createAuthClient()` desde `better-auth/react` | ✅ |
| 1.1.5 | Crear API route handler | `app/api/auth/[...all]/route.ts` con `toNextJsHandler(auth)` | ✅ |
| 1.1.6 | Configurar proxy (Next.js 16) | `proxy.ts` en la raíz: proteger `/dashboard/*`, permitir `/`, `/p/*` como públicas | ✅ |
| 1.1.7 | Agregar plugin `nextCookies` | Para que Server Actions puedan setear cookies de auth automáticamente | ✅ (incluido en 1.1.3) |
| 1.1.8 | Agregar plugin `organization` | Con roles custom (`owner`, `admin`, `agent`), permissions, invitaciones, límite de miembros | ✅ (incluido en 1.1.3) |
| 1.1.9 | Definir roles y permissions | Configurar los 3 roles con sus ~20 permissions según `docs/roles-and-permissions.md` | ✅ |
| 1.1.10 | Generar/migrar tablas de auth | `npx auth migrate` para crear tablas `user`, `session`, `account`, `organization`, `member`, etc. | ✅ |
| 1.1.11 | Configurar Google OAuth | Crear proyecto en Google Cloud Console, obtener client ID y secret | ✅ |
| 1.1.12 | Configurar Apple OAuth | Crear App ID en Apple Developer, obtener credentials | ⏭️ Diferido a producción |
| 1.1.13 | Crear páginas de auth (UI) | `app/(auth)/sign-in/page.tsx` y `sign-up/page.tsx` con shadcn (formularios custom) | ✅ |
| 1.1.14 | Crear componente UserButton | Componente con avatar, nombre, dropdown menu (perfil, settings, logout) | ✅ |
| 1.1.15 | Crear componente OrgSwitcher | Componente para cambiar entre organizaciones | ✅ |
| 1.1.16 | Hook: auto-crear org en sign-up | After hook en sign-up que crea una org personal con rol `owner` | ✅ |
| 1.1.17 | Test end-to-end de auth flow | Sign-up → org creada → session activa → dashboard accesible → sign-out funciona | ✅ (16/16 tests passed) |
| 1.1.18 | Geolocalización en sessions | Enriquecer sessions con país, ciudad y dispositivo usando headers de Vercel (`x-vercel-ip-country`, etc.) | ⏭️ Diferido a producción |
| 1.1.19 | Migrar IDs de auth a UUID | Migrar IDs base62 → UUID, configurar `generateId: () => crypto.randomUUID()` en Better Auth | ✅ |

### 1.2 Supabase — Base de datos, storage y realtime

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 1.2.1 | Crear cuenta en Supabase | Registrarse en supabase.com, crear proyecto "blackestate" | ✅ |
| 1.2.2 | Obtener connection string | Copiar `DATABASE_URL` (pooled) del dashboard de Supabase | ✅ |
| 1.2.3 | Configurar env vars | `DATABASE_URL` en `.env.local` (Better Auth se conecta directamente a Postgres) | ✅ |
| 1.2.4 | Verificar conexión | Ejecutar `npx auth migrate` y confirmar que las tablas de auth se crean en Supabase | ✅ |
| 1.2.5 | Configurar Storage | Crear buckets `property-media`, `avatars`, `brochures` (para Capa 2) | ⬜ |

---

## Capa 2 — Data Layer Real (reemplazar mocks)

### 2.1 Schema de base de datos

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.1.1 | Configurar Drizzle ORM | `drizzle.config.ts`, `lib/db/pool.ts` (shared pool con globalThis guard), `lib/db/index.ts` (instancia Drizzle), `lib/db/schema/` (schemas). Scripts: `db:generate`, `db:migrate`, `db:check`. `db:push` bloqueado. | ✅ |
| 2.1.2 | Extender tabla `organization` | Better Auth ya crea esta tabla. Campos adicionales vía `schema.additionalFields`: `plan`, `maxSeats`, `logoUrl` | ✅ (en auth.ts) |
| 2.1.3 | Extender tabla `member` | Better Auth ya crea esta tabla. Campo adicional: `title` | ✅ (en auth.ts) |
| 2.1.4 | Diseñar tabla `properties` | 44 columnas: core, price (numeric 14,2), address (doublePrecision lat/lng), surface, features, amenities (text[]), media (text[]), timestamps + soft delete | ✅ |
| 2.1.5 | Diseñar tabla `property_media` | Diferida — media se almacena como `photos text[]`, `blueprints text[]`, `video_url`, `virtual_tour_url` en `properties`. Tabla separada con metadata por archivo se crea cuando se implemente Supabase Storage (tarea 2.3) | ⏭️ Diferida |
| 2.1.6 | Diseñar tabla `leads` | 16 columnas: contact info (email/phone nullable), source, status, preferences, timestamps + soft delete. FK → properties | ✅ |
| 2.1.7 | Diseñar tabla `lead_property_queue` | 11 columnas: status, sort_order, timestamps + soft delete. FK → leads, properties | ✅ |
| 2.1.8 | Diseñar tabla `appointments` | 14 columnas: starts_at/ends_at (timestamptz), status, notes, lifecycle timestamps + soft delete. FK → leads, properties | ✅ |
| 2.1.9 | Diseñar tabla `bot_conversations` | 7 columnas: status, timestamps + soft delete. FK → leads | ✅ |
| 2.1.10 | Diseñar tabla `bot_messages` | 12 columnas: sender, content_type, text, media_url, status, timestamps + soft delete. FK → bot_conversations | ✅ |
| 2.1.11 | Diseñar tabla `bot_config` | 11 columnas: active, schedule (jsonb), notifications (jsonb), org_id UNIQUE, timestamps + soft delete | ✅ |
| 2.1.12 | Diseñar tabla `analytics_events` | 5 columnas: event_type, metadata (jsonb), created_at. Append-only, sin updatedAt/deletedAt | ✅ |
| 2.1.13 | Diseñar tabla `ai_contents` | 11 columnas: type, platform, text, published_at/to, timestamps + soft delete. FK → properties | ✅ |
| 2.1.14 | Diseñar tabla `agent_profiles` | 12 columnas: bio, social links, avatar_url, timestamps + soft delete. UNIQUE(user_id, org_id). FK → user, organization | ✅ |
| 2.1.15 | **RLS — Row Level Security** | Seguridad a nivel de DB. Drizzle NO bypasea RLS — todas las queries pasan por `withRLS()` con `SET LOCAL role = 'authenticated'`. Ver subtareas abajo. | ⬜ |

#### 2.1.15 — RLS (subtareas)

**Arquitectura:**
- Drizzle conecta con `postgres`/`service_role` pero SIEMPRE hace `SET LOCAL role = 'authenticated'` + claims via `withRLS()`.
- `service_role` directo solo para: Better Auth internals e Inngest background jobs cross-org.
- Todo request de usuario pasa por `withRLS()` — sin excepciones.
- No existe hard delete. Solo soft delete (`UPDATE SET deleted_at`). Integridad referencial protegida.

**Claims en `SET LOCAL request.jwt.claims`:**
```json
{ "sub": "user-uuid", "org_id": "org-uuid", "org_role": "owner|admin|agent", "is_super_admin": false }
```

**Niveles de acceso:**
- **Super admin (futuro):** Ve todo, todas las orgs, incluso borrados. Tabla `platform_admins`.
- **Owner/Admin:** Ve su org. Papelera: ve todo borrado de su org. Edita/borra cualquier registro.
- **Agent:** Ve su org (read-only otros). Papelera: solo ve lo suyo borrado. Edita/borra solo lo suyo.

**Papelera:** Se activa con `SET LOCAL app.include_deleted = 'true'` via `withRLS(ctx, cb, { includeDeleted: true })`. Owner/admin ven todo borrado de la org. Agent solo ve lo suyo borrado.

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.1.15.1 | Agregar `created_by_user_id` | Columna `TEXT NOT NULL` en 5 tablas: `properties`, `leads`, `appointments`, `ai_contents`, `lead_property_queue`. Índice compuesto `(organization_id, created_by_user_id)`. | ✅ |
| 2.1.15.2 | Crear tabla `platform_admins` | `user_id TEXT PK`, `created_at TIMESTAMPTZ`. Tabla `property_transfers` también creada para audit trail de transferencias. | ✅ |
| 2.1.15.3 | ENABLE + FORCE RLS | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` en 12 tablas de dominio + `platform_admins` + `property_transfers`. SQL en `drizzle/0002_rls_policies.sql`. | ✅ |
| 2.1.15.4 | Policies SELECT | Org isolation + soft delete + papelera role-aware + super admin. 12 policies creadas. Performance: `(SELECT current_setting(...))` cacheado. | ✅ |
| 2.1.15.5 | Policies INSERT | Solo en org propia. 11 policies. `property_transfers` INSERT solo owner/admin. | ✅ |
| 2.1.15.6 | Policies UPDATE | Owner/admin: todo. Agent: solo `created_by_user_id = sub`. Bot/config: solo owner/admin. Analytics: no UPDATE. | ✅ |
| 2.1.15.7 | Bloquear DELETE | No existe policy DELETE ni GRANT DELETE. Soft delete = UPDATE. Integridad referencial protegida. | ✅ |
| 2.1.15.8 | Crear `withRLS()` | `lib/db/rls.ts` — Transaction wrapper con `SET LOCAL role = 'authenticated'` + claims + `includeDeleted` flag. Build OK. | ✅ |
| 2.1.15.9 | Crear `getSessionContext()` | `lib/db/session-context.ts` — Extrae userId, orgId, role de Better Auth + consulta `platform_admins`. Build OK. | ✅ |
| 2.1.15.10 | Tests RLS | Verificar: agent no edita de otro, org isolation funciona, papelera respeta roles, super admin flag funciona. | ⬜ |
| 2.1.15.15 | Partial indexes en `deleted_at` | `CREATE INDEX ... ON table(id) WHERE deleted_at IS NULL` en tablas de alto tráfico (properties, leads, appointments). Requiere SQL raw. | ⬜ |
| 2.1.15.11 | Permiso `org:properties:assign` | Agregar a owner/admin en Better Auth permissions. Agent no puede transferir. | ⬜ |
| 2.1.15.12 | Tabla `property_transfers` | Audit trail: `from_user_id`, `to_user_id`, `transferred_by_user_id`, `property_ids TEXT[]`, counts de cascade (leads, appointments, ai_contents, queue_items), `acknowledged_at`, `notes`, `created_at`. RLS: org isolation, SELECT para involucrados + owner/admin. | ⬜ |
| 2.1.15.13 | `transferProperties()` | Server Action: bulk transfer N propiedades + cascade (leads, appointments, ai_contents, lead_property_queue). Actualiza `created_by_user_id` en todo. Crea registro en `property_transfers`. Todo en una transacción. Solo owner/admin. | ⬜ |
| 2.1.15.14 | `previewTransfer()` | Server Action: dado N property IDs y agente destino, retorna resumen de todo lo que se va a transferir (counts) sin ejecutar. Para el dialog de confirmación. | ⬜ |

**Tablas y policies:**

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `properties` | org + no deleted + papelera role-aware + super admin | org propia | owner/admin: todos; agent: solo suyo | bloqueado |
| `leads` | igual | igual | igual | bloqueado |
| `appointments` | igual | igual | igual | bloqueado |
| `ai_contents` | igual | igual | igual | bloqueado |
| `lead_property_queue` | igual | igual | igual | bloqueado |
| `bot_config` | org + no deleted | org propia | solo owner/admin | bloqueado |
| `bot_conversations` | org + no deleted | org propia | solo owner/admin | bloqueado |
| `bot_messages` | org + no deleted | org propia | solo owner/admin | bloqueado |
| `analytics_events` | org (sin soft delete) | org propia | nadie (append-only) | bloqueado |
| `agent_profiles` | org | org propia | propio `user_id` | bloqueado |
| `platform_admins` | solo super admin / service_role | solo service_role | solo service_role | solo service_role |
| 2.1.16 | Crear índices | 24 índices: org_id en toda tabla, status, FKs, compuestos (org+status, org+starts_at, lead+sort_order) | ✅ |
| 2.1.17 | Ejecutar migraciones | Todas las migraciones aplicadas contra Supabase dev. Migración base en `drizzle/0000_complex_infant_terrible.sql` | ✅ |
| 2.1.18 | Seed data de desarrollo | Script de seed para tener datos de prueba en la DB real | ⬜ |
| 2.1.19 | FK constraints | 25 FKs: 12 dominio↔dominio, 11 dominio→auth, 6 auth internas | ✅ |
| 2.1.20 | pgEnum types | 17 enum types creados para validación a nivel de DB. Valores migrados a inglés. | ✅ |
| 2.1.21 | Soft delete | `deleted_at timestamptz` en todas las tablas de dominio (excepto analytics_events que es append-only) | ✅ |
| 2.1.22 | `$onUpdate` timestamps | `updatedAt` con `.$onUpdate(() => new Date())` en todas las tablas mutables | ✅ |
| 2.1.23 | Migrar enums a inglés | Código + DB migrados. 10 enums renombrados con `ALTER TYPE RENAME VALUE`. Defaults actualizados automáticamente. Código y DB sincronizados. | ✅ |
| 2.1.24 | Nullability audit | Se ejecuta como sub-paso de CADA migración de data layer (2.2.2-2.2.9). Para cada entidad: (1) listar columnas nullable en DB schema, (2) verificar que el entity type marca esos campos como optional (`?`), (3) verificar que el mapper convierte `null → undefined`, (4) grep en componentes que consumen la entidad para detectar accesos sin optional chaining a campos opcionales. Patrón: Model (`null`) → Mapper (`undefined`) → Entity (`field?`) → Component (`?.`). | ⬜ |

### 2.2 Clean Architecture Refactor + Data Layer Migration

**Architecture:** Clean Architecture + DDD + Feature-Based Modules. Full spec in `CLAUDE.md`.

#### 2.2.0 — Scaffolding (create feature structure)

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.0.1 | Create `features/` directory | Root-level directory for all feature modules | ✅ |
| 2.2.0.2 | Create `features/shared/` | `domain/value-objects.ts`, `domain/session-context.ts` (SessionContext interface), `infrastructure/rls.ts`, `infrastructure/session-context.ts`. | ✅ |
| 2.2.0.3 | Configure path alias | `@/*` already resolves `features/` — no changes needed. | ✅ |

#### 2.2.1 — Properties feature (template module — do this first, then replicate)

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.1.1 | `features/properties/domain/property.entity.ts` | Property entity + value types. Imports from shared value objects. Uses `undefined` for optional. | ✅ |
| 2.2.1.2 | `features/properties/domain/property.repository.ts` | `IPropertyRepository` interface (port). Imports `SessionContext` from shared domain (not infrastructure). | ✅ |
| 2.2.1.3 | `features/properties/infrastructure/property.model.ts` | Type alias from Drizzle `$inferSelect`/`$inferInsert`. | ✅ |
| 2.2.1.4 | `features/properties/infrastructure/property.mapper.ts` | `mapRowToEntity`, `mapFormDataToInsert`, `mapPartialEntityToUpdate`. Null↔undefined conversion. | ✅ |
| 2.2.1.5 | `features/properties/infrastructure/drizzle-property.repository.ts` | Implements `IPropertyRepository`. withRLS for auth queries. Defense-in-depth `isNull(deletedAt)`. `findPublicById` redacts location. | ✅ |
| 2.2.1.6 | `features/properties/application/` use cases | 7 use cases: get-properties, get-property-by-id, create, update, delete, duplicate, get-public-property. | ✅ |
| 2.2.1.7 | `features/properties/presentation/actions.ts` | Auth Server Actions (thin). `public-actions.ts` separated for unauthenticated public queries. | ✅ |
| 2.2.1.8 | Backward compatibility | `lib/data/properties.ts` re-exports to actions. `lib/types/property.ts` re-exports to entity. Old imports keep working. | ✅ |
| 2.2.1.9 | Architecture fixes from code review | `SessionContext` moved to shared domain. Domain no longer imports from infrastructure. Soft-delete defense-in-depth added. Public actions separated. | ✅ |
| 2.2.1.10 | Move components + update pages | ⏭️ Deferred — components stay in `components/properties/` until all features are migrated, then move in batch. |  |
| 2.2.1.11 | Null safety audit — properties | Pending full audit of nullable columns vs entity fields vs component access patterns. | ⬜ |
| 2.2.1.12 | Build + code review | Build passes. Code review: 7 issues found, all fixed. Architecture validated. | ✅ |

#### 2.2.2 — Leads feature

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.2.1 | Domain layer | `lead.entity.ts` (Lead, LeadSource, QueueStatusId, PropertyQueueItem, etc.) + `lead.repository.ts` (ILeadRepository with CRUD + queue + visits). | ✅ |
| 2.2.2.2 | Infrastructure layer | `lead.model.ts` + `lead.mapper.ts` (null↔undefined, `??` consistent) + `drizzle-lead.repository.ts` (withRLS, single-transaction queue ops, JSONB propertyId filter for visits, isNull defense-in-depth). | ✅ |
| 2.2.2.3 | Application layer | 9 use case files: get-leads, get-lead-by-id, get-leads-by-property, create-lead, update-lead, delete-lead, manage-queue (6 ops incl reorderQueue), track-visit, get-suggested-properties (pure domain logic). | ✅ |
| 2.2.2.4 | Presentation layer | `actions.ts` (13 auth actions) + `public-actions.ts` (2 public). Components moved from `components/contacts/`. Backward compat in `lib/data/leads.ts` + `lib/types/lead.ts`. | ✅ |
| 2.2.2.5 | Null safety fixes | `phone?`, `email?`, `source?` made optional in entity. Components updated: `lead-detail-info`, `lead-source-badge`, `lead-timeline`, `lead-chat-dialog`, `appointments-view`, `use-leads-filter`. | ✅ |
| 2.2.2.6 | Code review fixes | 8 issues found, all fixed: JSONB filter (#1), isNull on update (#2), single-transaction queue (#3,#4), duplicate formatRelativeTime (#5), leadPhone optional (#6), reorderQueue implemented (#7), `??` consistency (#8). | ✅ |

#### 2.2.3 — Appointments feature

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.3.1 | Domain + Infrastructure + Application | Entity, repository, mapper, model, use cases. | ⬜ |
| 2.2.3.2 | Presentation | Actions + move `components/appointments/`. | ⬜ |
| 2.2.3.3 | Null safety audit + build | | ⬜ |

#### 2.2.4 — Bot feature

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.4.1 | Domain + Infrastructure + Application | Entities: BotConversation, BotMessage, BotConfig, SentProperty, Appointment (bot-scoped). | ⬜ |
| 2.2.4.2 | Presentation | Actions + move `components/bot/`. | ⬜ |
| 2.2.4.3 | Null safety audit + build | | ⬜ |

#### 2.2.5 — Analytics feature

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.5.1 | Domain + Infrastructure + Application | Aggregation queries. Read-only (no create/update/delete). Cross-entity queries (properties + leads + appointments). | ⬜ |
| 2.2.5.2 | Presentation | Actions + move `components/analytics/`. | ⬜ |
| 2.2.5.3 | Null safety audit + build | | ⬜ |

#### 2.2.6 — Dashboard feature

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.6.1 | Domain + Infrastructure + Application | Dashboard stats. Cross-entity aggregation. Depends on properties, leads, appointments repositories. | ⬜ |
| 2.2.6.2 | Presentation | Actions + dashboard components. | ⬜ |
| 2.2.6.3 | Build | | ⬜ |

#### 2.2.7 — AI Contents feature

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.7.1 | Domain + Infrastructure + Application | CRUD for AI-generated content. | ⬜ |
| 2.2.7.2 | Presentation | Actions + move `components/ai/`. | ⬜ |
| 2.2.7.3 | Null safety audit + build | | ⬜ |

#### 2.2.8 — Settings feature

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.8.1 | Domain + Infrastructure + Application | Agent profile, business settings, notification prefs, bot config, plan info. | ⬜ |
| 2.2.8.2 | Presentation | Actions + move `components/settings/`. | ⬜ |
| 2.2.8.3 | Null safety audit + build | | ⬜ |

#### 2.2.9 — Cleanup

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.9.1 | Delete `lib/data/` | All mock data files replaced by feature modules. | ⬜ |
| 2.2.9.2 | Delete `lib/types/` | Entity types moved to `features/*/domain/`. Shared types to `features/shared/domain/`. | ⬜ |
| 2.2.9.3 | Update `CLAUDE.md` | Reflect final project structure post-refactor. | ⬜ |
| 2.2.9.4 | Full build + lint | Final verification. | ⬜ |

### 2.4 Transferencia de propiedades (enterprise)

Flujo completo para que owner/admin transfiera propiedades (+ cascade) entre agentes de la misma org. Incluye preview, confirmación, audit trail, e inbox para el agente receptor.

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.4.1 | Página de transferencias | `app/dashboard/transfers/page.tsx` — lista de transferencias realizadas y recibidas. Owner/admin ve todas de la org, agent ve solo las suyas. | ⬜ |
| 2.4.2 | Dialog de bulk transfer | Selección múltiple de propiedades + selector de agente destino + preview con counts (N propiedades, N leads, N citas, N contenidos AI) + botón confirmar. | ⬜ |
| 2.4.3 | Inbox del agente receptor | Dentro de la página de transferencias: lista de transfers pendientes de acknowledge. Muestra qué se recibió, de quién, cuándo. Botón "marcar como revisado". | ⬜ |
| 2.4.4 | Badge en sidebar | Indicador en el sidebar cuando hay transfers sin acknowledge. | ⬜ |
| 2.4.5 | Workflow Knock `property_transferred` | Notificación al agente receptor cuando recibe una transferencia. Se implementa junto con el resto de workflows en Capa 4.4. | ⏭️ Diferido a Capa 4 |

### 2.3 Supabase Storage — Archivos reales

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.3.1 | Crear buckets | `property-media` (fotos, videos, planos), `avatars`, `brochures` | ⬜ |
| 2.3.2 | Configurar RLS en Storage | Policies para que cada org solo acceda a sus archivos | ⬜ |
| 2.3.3 | Crear helper de upload | `lib/supabase/storage.ts` con funciones `uploadPropertyMedia()`, `uploadAvatar()`, `deleteMedia()` | ⬜ |
| 2.3.4 | Integrar con property form | Conectar el `media-step.tsx` del wizard con upload real a Storage | ⬜ |
| 2.3.5 | Integrar con perfil/settings | Upload de avatar y logo de agencia | ⬜ |
| 2.3.6 | Image optimization | Configurar `next.config.ts` con el dominio de Supabase Storage para `next/image` | ⬜ |

---

## Capa 3 — Lógica Asíncrona y AI

### 3.1 Inngest — Background jobs

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 3.1.1 | Crear cuenta en Inngest | Registrarse en inngest.com | ⬜ |
| 3.1.2 | Instalar dependencia | `inngest` | ⬜ |
| 3.1.3 | Configurar env vars | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | ⬜ |
| 3.1.4 | Crear endpoint | `app/api/inngest/route.ts` | ⬜ |
| 3.1.5 | Crear cliente Inngest | `inngest/client.ts` con definición de eventos tipados | ⬜ |
| 3.1.6 | Función: procesar webhooks | `inngest/functions/process-webhooks.ts` — procesar eventos entrantes (WhatsApp, Paddle, etc.) | ⬜ |
| 3.1.7 | Función: procesar imágenes | `inngest/functions/process-property-media.ts` — resize/optimize fotos subidas | ⬜ |
| 3.1.8 | Función: cola de propiedades | `inngest/functions/send-property-queue.ts` — envío throttled de propiedades a leads | ⬜ |
| 3.1.9 | Función: recordatorio de cita | `inngest/functions/appointment-reminder.ts` — scheduled 2h antes | ⬜ |
| 3.1.10 | Función: reporte semanal | `inngest/functions/weekly-report.ts` — cron que genera y envía reporte | ⬜ |

### 3.2 Vercel AI SDK + Claude Haiku

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 3.2.1 | Instalar dependencias | `ai`, `@ai-sdk/anthropic` | ⬜ |
| 3.2.2 | Configurar env var | `ANTHROPIC_API_KEY` | ⬜ |
| 3.2.3 | Crear helper de AI | `lib/ai/client.ts` con configuración base del modelo | ⬜ |
| 3.2.4 | Implementar generación de descripciones | `lib/ai/generate-description.ts` — prompt + streamText para descripciones de propiedades | ⬜ |
| 3.2.5 | Implementar generación de copy | `lib/ai/generate-copy.ts` — versiones para Facebook, Instagram, TikTok, WhatsApp | ⬜ |
| 3.2.6 | Implementar generación de brochures | `lib/ai/generate-brochure-text.ts` — texto para PDFs | ⬜ |
| 3.2.7 | Conectar con componentes AI existentes | Integrar con `ai-brochure-generator.tsx`, `ai-caption-generator.tsx`, etc. | ⬜ |
| 3.2.8 | Envolver en Inngest steps | Las llamadas al LLM pasan por Inngest para retry ante rate limits | ⬜ |

---

## Capa 4 — Observabilidad y Notificaciones

### 4.1 Sentry — Error tracking

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 4.1.1 | Crear cuenta en Sentry | Registrarse en sentry.io, crear proyecto Next.js | ⬜ |
| 4.1.2 | Instalar dependencia | `@sentry/nextjs` | ⬜ |
| 4.1.3 | Configurar Sentry | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` | ⬜ |
| 4.1.4 | Configurar source maps | Habilitar upload automático en build de Vercel | ⬜ |
| 4.1.5 | Tags custom | Configurar `userId`, `organizationId`, `feature` en cada evento | ⬜ |
| 4.1.6 | Alertas | Configurar alertas por email o Slack para errores críticos | ⬜ |

### 4.2 PostHog — Product analytics

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 4.2.1 | Crear cuenta en PostHog | Registrarse en posthog.com | ⬜ |
| 4.2.2 | Instalar dependencias | `posthog-js`, `posthog-node` | ⬜ |
| 4.2.3 | Configurar provider | Provider en root layout con API key | ⬜ |
| 4.2.4 | Identificación de usuarios | `posthog.identify()` con `userId`, `organizationId`, `plan` | ⬜ |
| 4.2.5 | Instrumentar eventos core | `property_created`, `lead_received`, `appointment_booked`, `deal_won`, etc. | ⬜ |
| 4.2.6 | Feature flags | Configurar flags para gating por plan (`free`/`pro`/`enterprise`) | ⬜ |

### 4.3 Resend + React Email — Emails transaccionales

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 4.3.1 | Crear cuenta en Resend | Registrarse en resend.com | ⬜ |
| 4.3.2 | Verificar dominio | Configurar DKIM/SPF/DMARC para `mail.blackestate.com` | ⬜ |
| 4.3.3 | Instalar dependencias | `resend`, `@react-email/components` | ⬜ |
| 4.3.4 | Crear templates | `emails/welcome.tsx`, `emails/new-lead.tsx`, `emails/appointment-reminder.tsx`, `emails/weekly-report.tsx` | ⬜ |
| 4.3.5 | Crear helper de envío | `lib/email/send.ts` con función wrapper | ⬜ |
| 4.3.6 | Conectar con Inngest | Los envíos se disparan desde Inngest functions | ⬜ |

### 4.4 Knock — Notificaciones multi-canal

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 4.4.1 | Crear cuenta en Knock | Registrarse en knock.app | ⬜ |
| 4.4.2 | Configurar Resend como provider | Conectar Resend como Email Channel en Knock | ⬜ |
| 4.4.3 | Instalar dependencias | `@knocklabs/node`, `@knocklabs/react` | ⬜ |
| 4.4.4 | Definir workflows | `new_lead`, `appointment_confirmed`, `appointment_reminder_2h`, `bot_handoff`, `weekly_report` | ⬜ |
| 4.4.5 | Integrar feed in-app | `<NotificationFeedProvider>` + `<NotificationFeed />` (campanita) en el dashboard header | ⬜ |
| 4.4.6 | Preferencias de usuario | UI para que el agente configure qué notificaciones recibe por qué canal | ⬜ |

---

## Capa 5 — Soporte y Marketing

### 5.1 Crisp — Customer support

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 5.1.1 | Crear cuenta en Crisp | Registrarse en crisp.chat | ⬜ |
| 5.1.2 | Instalar widget | Snippet de Crisp en el layout del dashboard y landings públicas | ⬜ |
| 5.1.3 | Configurar identification | Pasar `userId`, `email`, `plan` al widget para contexto | ⬜ |
| 5.1.4 | Conectar WhatsApp Business | Vincular número verificado desde dashboard de Crisp | ⬜ |
| 5.1.5 | Crear knowledge base | FAQs iniciales del producto | ⬜ |

### 5.2 Marketing site

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 5.2.1 | Crear route group | `app/(marketing)/layout.tsx` con nav público y footer | ⬜ |
| 5.2.2 | Landing page | `app/(marketing)/page.tsx` — hero, features, social proof, CTA | ⬜ |
| 5.2.3 | Pricing page | `app/(marketing)/pricing/page.tsx` — planes free/pro/enterprise | ⬜ |
| 5.2.4 | Features page | `app/(marketing)/features/page.tsx` — detalle de features | ⬜ |
| 5.2.5 | About page | `app/(marketing)/about/page.tsx` | ⬜ |
| 5.2.6 | Blog (MDX) | Setup básico con MDX local | ⬜ |

### 5.3 TestSprite — Testing automatizado

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 5.3.1 | Crear cuenta en TestSprite | Registrarse en testsprite.com | ⬜ |
| 5.3.2 | Instalar MCP Server | Configurar en el IDE | ⬜ |
| 5.3.3 | Configurar Vitest | Setup básico para unit tests de utils y helpers | ⬜ |
| 5.3.4 | Generar tests iniciales | Tests para flujos críticos: auth, property CRUD, lead CRUD | ⬜ |
| 5.3.5 | Integrar con CI/CD | GitHub Actions → TestSprite → Vercel deploy | ⬜ |

---

## Notas generales

- **Cada capa depende de la anterior.** No saltar capas.
- **Dentro de cada capa**, las tareas están ordenadas por dependencia técnica.
- **Mock data no se borra inmediatamente.** Se mantiene como fallback durante la migración y se elimina al final de Capa 2.
- **Los tipos existentes en `lib/types/`** son la fuente de verdad para diseñar el schema de DB.
- **El modelo de multitenancy** es: Better Auth Organization = tenant. Un agente individual = org de 1 miembro. Una agencia = org con N miembros y roles (`owner`/`admin`/`agent`).
- **Pricing/tier** se almacena en el campo `plan` de la tabla `organization` (campo adicional definido en Better Auth).
- **Idioma del código:** Inglés estricto. Español SOLO para contenido visible al usuario final.
- **Drizzle Kit:** NUNCA usar `drizzle-kit push`. Solo `db:generate` + `db:migrate`. Hook de protección configurado.
- **Soft delete:** `deleted_at` nullable en toda tabla de dominio. Las queries deben filtrar `WHERE deleted_at IS NULL`.
- **Pool compartido:** `lib/db/pool.ts` con guard `globalThis` — usado por Better Auth y Drizzle.
