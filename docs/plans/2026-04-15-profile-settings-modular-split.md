# Plan — Profile + Settings migración a Clean Architecture con split modular

> **Creado:** 2026-04-15
> **Estado:** Pendiente (próximo chat)
> **Prerequisito:** Capa 2 de `implementation-plan.md` completada (RLS, storage, Clean Architecture en properties/leads/appointments/etc.)

## Contexto

El módulo actual `features/settings/` agrupa datos user-level y org-level por herencia del MVP mock. Los datos viven en memoria (`let` vars en `features/settings/infrastructure/settings.service.ts`). El avatar ya sube al bucket `avatars` de Supabase Storage via `uploadAvatarAction`, pero la URL no persiste en DB.

Decisión tomada: fragmentar en 5 módulos por bounded context DDD, no por página UI.

## Split modular (C ajustada)

```
features/
  profile/         # user identity (name, avatar, bio, contact, socials)
  billing/         # plan, subscription, seats, invoices (Paddle)
  integrations/    # whatsapp, mercadolibre, zonaprop (OAuth + webhooks + sync)
  notifications/   # prefs + delivery (Knock integration landing aquí cuando llegue)
  settings/        # residual org-level misc: business (timezone, currency), marketing (hashtags, brand)
```

### Justificación por módulo

| Módulo | Bounded context | Invariantes propias | Roadmap cercano |
|---|---|---|---|
| `profile/` | User identity | Avatar lifecycle storage, contacto único para landings/brochures, user-level RLS | Usado en brochures, landings, agent cards |
| `billing/` | Commerce | Plan tier → seat limit + feature flags, subscription lifecycle, MoR | Paddle integration inminente |
| `integrations/` | External systems | OAuth token refresh, sync state, webhook reconciliation por-proveedor | WhatsApp bot, ML, ZP todos en plan |
| `notifications/` | Delivery orchestration | Prefs + canales, rate limits, routing | Knock integration pendiente |
| `settings/` | Org prefs misc | Timezone, currency, brand colors, hashtags default | Estable, chico |

## Tareas

### 1) Split modular

- Crear 5 módulos con estructura Clean Arch (domain / application / infrastructure / presentation)
- `app/dashboard/settings/page.tsx` sigue siendo host de tabs pero importa de múltiples módulos
- Mover el avatar upload a `features/profile/presentation/storage-actions.ts` (sale de `properties/`)

### 2) Schema DB (Drizzle)

**Profile:**
- Reutilizar tabla `user` de Better Auth: `name`, `email`, `image` (avatar URL)
- Nueva tabla `agent_profile`:
  - `userId` (PK, FK `user.id` ON DELETE CASCADE)
  - `organizationId` (FK `organization.id`)
  - `bio` text
  - `website` text
  - `whatsapp` text
  - `instagram` text
  - `facebook` text
  - `title` text
  - `createdAt`, `updatedAt`, `deletedAt`
  - UNIQUE(userId, organizationId) — un agente tiene un perfil por org

**Billing:**
- Reutilizar `organization.metadata.plan` + `organization.maxSeats` (ya existen en Better Auth additionalFields)
- Nueva tabla `subscription`:
  - `id`, `organizationId` (FK), `paddleSubscriptionId`, `status` (`active` | `past_due` | `canceled`), `plan`, `seats`, `currentPeriodEnd`, timestamps
- Nueva tabla `invoice`:
  - `id`, `organizationId`, `subscriptionId`, `paddleInvoiceId`, `amount`, `currency`, `status`, `paidAt`, timestamps
- (Webhooks Paddle se implementan en Capa 3 cuando se integre el provider)

**Integrations:**
- Nueva tabla `integration`:
  - `id`, `organizationId`, `provider` (`whatsapp` | `mercadolibre` | `zonaprop`), `status` (`connected` | `disconnected` | `error`), `accessToken` (encrypted), `refreshToken` (encrypted), `expiresAt`, `metadata` (jsonb per-provider), timestamps
  - UNIQUE(organizationId, provider)
- Tokens se cifran con `APP_ENCRYPTION_KEY` antes de persistir (pgcrypto o libsodium)

**Notifications:**
- Nueva tabla `notification_pref`:
  - `userId` (PK), `organizationId`, `emailNewLead` bool, `emailAppointment` bool, `emailWeekly` bool, `pushNewLead` bool, etc.
  - UNIQUE(userId, organizationId)

**Settings (residual):**
- Nueva tabla `org_settings`:
  - `organizationId` (PK), `timezone`, `defaultCurrency`, `locale`, `brandColor`, `defaultHashtags` (text[]), timestamps
- Eliminar `features/settings/infrastructure/settings.service.ts` (mock)
- Eliminar defaults en `lib/constants/settings.ts` que ya no se usen

**Generar migración:** `npx drizzle-kit generate` (NO push). Revisar SQL. Aplicar con `npx drizzle-kit migrate`.

### 3) Clean Architecture por módulo

Para cada uno de los 5 módulos, seguir el patrón establecido en `properties/`:

```
features/<module>/
  domain/
    <module>.entity.ts          # interface con undefined, nunca null
    <module>.repository.ts      # IRepository port
  application/
    get-<module>.use-case.ts
    update-<module>.use-case.ts
    (otros casos de uso específicos)
  infrastructure/
    <module>.model.ts           # Drizzle $inferSelect
    <module>.mapper.ts          # null ↔ undefined
    drizzle-<module>.repository.ts
  presentation/
    actions.ts                  # thin: auth + delegate
    components/                 # mover desde features/settings/presentation/components/sections/
```

### 4) Persistencia avatar (profile)

- `uploadAvatarAction` refactor:
  - Move a `features/profile/presentation/storage-actions.ts`
  - Subir a bucket `avatars` (path: `{orgId}/{userId}/{uuid}.{ext}`)
  - Actualizar `user.image` via `auth.api.updateUser({ body: { image: url }, headers })`
  - Borrar avatar anterior del bucket si existe (evitar acumular basura)
- Use case: `update-avatar.use-case.ts` orquesta storage + Better Auth user update + eventual sync a `agent_profile` si se guarda copia

### 5) RLS

**Aplicar en todas las tablas nuevas:**

```sql
ALTER TABLE agent_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_profile FORCE ROW LEVEL SECURITY;

-- SELECT: todos en la misma org pueden ver perfiles del equipo
CREATE POLICY select_agent_profile ON agent_profile FOR SELECT
  USING ("organizationId" = current_setting('request.jwt.claims', true)::json->>'org_id');

-- INSERT/UPDATE: solo el propio user edita su perfil
CREATE POLICY write_agent_profile ON agent_profile FOR ALL
  USING ("userId" = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK ("userId" = current_setting('request.jwt.claims', true)::json->>'sub');
```

Análogo para `notification_pref` (user-scope), `subscription`/`invoice`/`integration`/`org_settings` (org-scope + role-gated para integrations).

**Integrations — role gate:**
- SELECT: cualquiera en la org
- INSERT/UPDATE/DELETE: solo owner/admin (tokens sensibles)

**Reglas:**
- FORCE RLS en todas
- Soft delete (no DELETE hard, solo `UPDATE SET deleted_at`)
- Todas las queries pasan por `withRLS()` — sin excepciones

### 6) UI presentación

Migrar componentes existentes:
- `profile-section.tsx` → `features/profile/presentation/components/sections/profile-section.tsx`
- `business-section.tsx` → `features/settings/...`
- `notifications-section.tsx` → `features/notifications/...`
- `integrations-section.tsx` → `features/integrations/...`
- `marketing-section.tsx` → `features/settings/...` (o mantener en settings)
- Plan / billing info → `features/billing/...`

Cambiar llamadas de `updateAgentProfileAction` → `updateProfileAction` (del módulo correcto). Cada section consume su propio action.

`/dashboard/settings/page.tsx` queda como host de tabs, importa de los 5 módulos.

### 7) Cleanup

- Borrar `features/settings/infrastructure/settings.service.ts`
- Borrar `features/settings/domain/settings.entity.ts` (reemplazado por entities por módulo)
- Borrar defaults de `lib/constants/settings.ts` que ya no se usen
- Revisar imports rotos y arreglar rutas

### 8) Tests E2E (Playwright)

- Profile: crear user, actualizar nombre/bio, subir avatar, recargar página, verificar persistencia
- Profile: verificar avatar URL en `user.image` + archivo en bucket `avatars`
- Profile: reemplazar avatar → verificar archivo anterior borrado del bucket
- Profile RLS: user A no puede escribir profile de user B (error)
- Notifications: toggles persisten + aíslan por user
- Integrations RLS: agent no puede conectar integración (solo owner/admin)
- Billing: lectura de plan funciona para todos; solo owner puede cambiar
- Settings: org settings visibles para todos, editables por admin/owner

### 9) Update documentation

- Actualizar `CLAUDE.md`: agregar sección "Profile, Billing, Integrations, Notifications" en Project Structure
- Actualizar `docs/implementation-plan.md`: marcar 2.3.8 como ✅ completamente, agregar tareas del split, reflejar estado final de Capa 2
- Actualizar memory `MEMORY.md` si aplica (nuevos módulos, decisión de bounded contexts)

## Out of scope (diferido)

- **Billing flow real con Paddle**: solo schema DB + read-only UI. Webhooks + subscription management en Capa 3.
- **Integrations OAuth flows**: solo schema + read-only UI. OAuth + sync jobs en Capa 3.
- **Knock notification delivery**: solo prefs UI + schema. Sending en Capa 4.
- **Transferencias enterprise**: fuera de alcance.

## Checklist null safety (por tabla nueva)

Para cada tabla recién creada, ejecutar el audit de CLAUDE.md:

1. Listar columnas nullable en Drizzle schema
2. Verificar mapper null → undefined (read) y undefined → null (write)
3. Verificar entity usa `field?: T` nunca `field: T | null`
4. Grep componentes consumidores — `?.` en campos opcionales
5. Zod boundary → empty string → null

## Referencias

- Clean Arch en este proyecto: `features/properties/` (referencia canónica)
- Mappers null-safe: `features/properties/infrastructure/property.mapper.ts`
- RLS helpers: `features/shared/infrastructure/rls.ts`
- Session context: `features/shared/infrastructure/session-context.ts`
- Storage helpers: `lib/supabase/storage.ts`
- Bucket avatars: 2MB limit, public, path `{orgId}/{userId}/{uuid}.{ext}`
- Better Auth API: `auth.api.updateUser({ body: { image, name }, headers })`

## Prompt sugerido para el próximo chat

> Leé `docs/plans/2026-04-15-profile-settings-modular-split.md` y ejecutá el plan completo.
>
> Orden recomendado:
> 1. Schema DB (generar migración, revisar SQL, aplicar)
> 2. RLS policies
> 3. Módulo por módulo: profile → settings → notifications → billing → integrations (Clean Arch + use cases + UI migration)
> 4. Persistencia avatar con `auth.api.updateUser`
> 5. Cleanup mock service
> 6. Tests E2E con Playwright
> 7. Update CLAUDE.md + implementation-plan.md
>
> Seguí el patrón Clean Architecture de `features/properties/`. Null safety estricto (Model null ↔ Entity undefined). RLS obligatorio con `withRLS()`. NO usar `drizzle-kit push` bajo ninguna circunstancia.
