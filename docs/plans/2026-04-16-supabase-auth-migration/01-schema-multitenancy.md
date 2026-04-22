# Sub-plan 01 — Schema Multitenancy

> **Depends on:** 00-master.md
> **Unlocks:** 03, 04, 05, 07
> **Status:** ✅ Completed — 2026-04-16
> **Branch:** `feat/auth-migration-phase-01`

## Resumen ejecución

Aplicado vía MCP `execute_sql` (drizzle-kit migrate colgó por colisión de prefix 0002 en filenames). Decisiones tomadas durante ejecución (con confirmación del user):

1. **UUID nativo en TODAS las tablas nuevas** + `platform_admins.user_id` migrado de `text → uuid`. Razón: stage inicial sin data relevante; mejor consistencia con `auth.users.id` nativo de Supabase. FKs reales a `auth.users` enforced en DB.
2. **Rename de indexes/constraints legacy** (no solo tablas) para evitar colisión nombres con tablas nuevas. `member_user_id_idx` → `member_legacy_user_id_idx`, etc.
3. **`drizzle/0002_rls_policies.sql` movido a `drizzle/legacy/`** porque colisionaba con `0002_auth_migration_schema.sql`. Las RLS legacy se reemplazan en sub-plan 07.
4. **`__drizzle_migrations` populated manualmente** con hashes de migrations 0001 (estaba unregistered) y 0002 (nueva). Drift de Drizzle tracking resuelto.
5. **`platform_admins_select` policy DROPPED** (dependía de `user_id text`, blocking ALTER COLUMN). Se recrea en sub-plan 07.
6. **Post-review fixes aplicados:**
   - `lib/auth-permissions.ts`: agregado `property.assign` a permisos `owner`/`admin` (sincroniza con `appPermissionEnum`).
   - `drizzle/sql/002_invitation_check_constraint.sql`: CHECK `status != 'pending' OR invited_by_user_id IS NOT NULL` para integridad INSERT.
   - JSDoc en `invitation.ts` documenta el CHECK.

## Tareas diferidas detectadas

- **Partial index `member_active_user_org_idx`** sobre `(user_id, organization_id) WHERE deleted_at IS NULL` — ejecutado en sub-plan 05 junto al trigger (más eficiente que `member_deleted_at_idx` actual). Ver sección "Tarea adicional" en `05-org-creation-lifecycle.md`.
- **Recrear `platform_admins_select` policy** — sub-plan 07 ya cubre esto con sintaxis Supabase Auth nativa.

## Goal

Crear las tablas `public.organization`, `public.member`, `public.invitation`, `public.user_active_org`, `public.role_permissions`, y preservar `public.platform_admins`. FKs apuntan a `auth.users(id)` gestionada por Supabase Auth. Mantener `plan`, `maxSeats`, `logoUrl` en organization; `title` en member.

Schema definido via Drizzle. Migration generada con `drizzle-kit generate`, aplicada con `drizzle-kit migrate`.

## Archivos

### Crear

- `lib/db/schema/organization.ts`
- `lib/db/schema/member.ts`
- `lib/db/schema/invitation.ts`
- `lib/db/schema/user-active-org.ts`
- `lib/db/schema/role-permissions.ts`

### Modificar

- `lib/db/schema/index.ts` — barrel re-export de tablas nuevas
- `lib/db/schema/platform-admins.ts` — cambiar FK tipo `text` → `uuid` si aplica (revisar)

### Contexto

- `drizzle.config.ts` — no requiere cambios
- Las tablas Better Auth (`user`, `session`, `account`, `organization`, `member`, `invitation`) **se dejan intactas hasta Fase 11 y 12**. Data migration las usa como fuente. NO borrarlas en esta fase.

## Preamble obligatorio — renombrar tablas Better Auth

**CRÍTICO:** las tablas nuevas `public.organization`, `public.member`, `public.invitation` colisionan con las ya creadas por Better Auth (mismos nombres). Antes de aplicar la migration Drizzle de esta fase, ejecutar el rename vía SQL manual:

```sql
-- drizzle/sql/001_pre_rename_better_auth_tables.sql
ALTER TABLE IF EXISTS public.organization RENAME TO organization_legacy_better_auth;
ALTER TABLE IF EXISTS public.member RENAME TO member_legacy_better_auth;
ALTER TABLE IF EXISTS public.invitation RENAME TO invitation_legacy_better_auth;

-- Renombrar también indexes/constraints con nombres genéricos si los hubiera
-- (Better Auth los genera con prefix de tabla; el rename los arrastra automáticamente).
```

Ejecutar ANTES del paso 8 (`drizzle-kit generate`) de esta fase. Si no se hace, la migration falla por nombre duplicado.

`public.user`, `public.session`, `public.account`, `public.verification` NO colisionan — se dejan intactos hasta Fase 12.

## SQL enums previos (dependencia)

Las tablas dominio usan enums (ej. `member_role_enum`). Revisar si en la DB actual el enum existe y tiene valores. Si sí, reutilizar.

Valores actuales (de `lib/db/schema/`):
- `member_role_enum` con valores: `owner`, `admin`, `agent` (asumir que existe ya; crear si no)
- `organization_plan_enum` con valores: `free`, `pro`, `enterprise` (asumir; crear si no)
- `invitation_status_enum` con valores: `pending`, `accepted`, `rejected`, `expired`, `cancelled`

## Schemas Drizzle

### `lib/db/schema/organization.ts`

```ts
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core"
import { organizationPlanEnum } from "./enums" // crear si no existe

export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logoUrl: text("logo_url"),
    plan: organizationPlanEnum("plan").notNull().default("free"),
    maxSeats: integer("max_seats").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    slugIdx: index("organization_slug_idx").on(table.slug),
    deletedAtIdx: index("organization_deleted_at_idx").on(table.deletedAt),
  }),
)

export type Organization = typeof organization.$inferSelect
export type NewOrganization = typeof organization.$inferInsert
```

### `lib/db/schema/member.ts`

```ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core"
import { memberRoleEnum } from "./enums"
import { organization } from "./organization"

export const member = pgTable(
  "member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    // FK a auth.users via SQL literal (Drizzle no conoce schema auth)
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [],
      name: "member_user_id_auth_users_fk",
    }),
    userOrgUnique: uniqueIndex("member_user_org_unique").on(
      table.userId,
      table.organizationId,
    ),
    orgIdx: index("member_organization_id_idx").on(table.organizationId),
    userIdx: index("member_user_id_idx").on(table.userId),
    deletedAtIdx: index("member_deleted_at_idx").on(table.deletedAt),
  }),
)

export type Member = typeof member.$inferSelect
export type NewMember = typeof member.$inferInsert
```

**Nota:** Drizzle no soporta `foreignKey` cross-schema directamente. Se agrega la FK `user_id → auth.users(id)` manualmente en la migration SQL (ver sección SQL patch abajo).

### `lib/db/schema/invitation.ts`

```ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { invitationStatusEnum, memberRoleEnum } from "./enums"
import { organization } from "./organization"

export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    token: text("token").notNull().unique(),
    invitedByUserId: uuid("invited_by_user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    orgIdx: index("invitation_organization_id_idx").on(table.organizationId),
    emailIdx: index("invitation_email_idx").on(table.email),
    tokenIdx: index("invitation_token_idx").on(table.token),
    statusIdx: index("invitation_status_idx").on(table.status),
  }),
)

export type Invitation = typeof invitation.$inferSelect
export type NewInvitation = typeof invitation.$inferInsert
```

### `lib/db/schema/user-active-org.ts`

```ts
import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core"
import { organization } from "./organization"

export const userActiveOrg = pgTable("user_active_org", {
  userId: uuid("user_id").primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type UserActiveOrg = typeof userActiveOrg.$inferSelect
```

FK `user_id → auth.users(id)` via SQL patch.

### `lib/db/schema/role-permissions.ts`

```ts
import { pgTable, uuid, uniqueIndex } from "drizzle-orm/pg-core"
import { memberRoleEnum, appPermissionEnum } from "./enums"

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: memberRoleEnum("role").notNull(),
    permission: appPermissionEnum("permission").notNull(),
  },
  (table) => ({
    rolePermUnique: uniqueIndex("role_permissions_role_perm_unique").on(
      table.role,
      table.permission,
    ),
  }),
)

export type RolePermission = typeof rolePermissions.$inferSelect
```

### `lib/db/schema/enums.ts`

Crear o extender:

```ts
import { pgEnum } from "drizzle-orm/pg-core"

// Existentes (si ya existen no re-declarar)
export const memberRoleEnum = pgEnum("member_role_enum", ["owner", "admin", "agent"])
export const organizationPlanEnum = pgEnum("organization_plan_enum", ["free", "pro", "enterprise"])

// Nuevos
export const invitationStatusEnum = pgEnum("invitation_status_enum", [
  "pending",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
])

export const appPermissionEnum = pgEnum("app_permission_enum", [
  // property
  "property.create",
  "property.read_own",
  "property.read_all",
  "property.edit_own",
  "property.edit_all",
  "property.delete_own",
  "property.delete_all",
  "property.assign",
  // lead
  "lead.create",
  "lead.read_own",
  "lead.read_all",
  "lead.edit_own",
  "lead.edit_all",
  "lead.delete_own",
  "lead.delete_all",
  "lead.assign",
  // analytics
  "analytics.read_own",
  "analytics.read_all",
  // bot
  "bot.read",
  "bot.configure",
  // settings
  "settings.read",
  "settings.manage",
  // billing
  "billing.manage",
])
```

### `lib/db/schema/index.ts` — update barrel

Agregar:

```ts
export * from "./organization"
export * from "./member"
export * from "./invitation"
export * from "./user-active-org"
export * from "./role-permissions"
```

## SQL patches post-migration (cross-schema FKs)

Drizzle no puede expresar FK a `auth.users` directamente. Tras `drizzle-kit generate`, editar la migration generada para agregar manualmente:

```sql
-- agregar al final de la migration generada
ALTER TABLE "member"
  ADD CONSTRAINT "member_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_invited_by_user_id_auth_users_fk"
  FOREIGN KEY ("invited_by_user_id") REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "user_active_org"
  ADD CONSTRAINT "user_active_org_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Nota:** `auth.users` es una tabla existente gestionada por Supabase. No modificarla. FKs a ella garantizan integridad: si se borra un user, cascada a member y user_active_org, y null en invitation.invited_by_user_id.

## Pasos de ejecución

- [ ] **0. Preamble — ejecutar rename tablas Better Auth**
  - Crear `drizzle/sql/001_pre_rename_better_auth_tables.sql` con el SQL del preamble.
  - Ejecutar via Supabase MCP `execute_sql` o `psql`.
  - Verificar: `\dt public.organization*` debe mostrar solo `organization_legacy_better_auth` (no `organization`).

- [ ] **1. Crear `lib/db/schema/enums.ts` (o actualizar si existe)**
  - Agregar `invitationStatusEnum` y `appPermissionEnum`.
  - No duplicar enums existentes.

- [ ] **2. Crear `lib/db/schema/organization.ts`** (con el código arriba).

- [ ] **3. Crear `lib/db/schema/member.ts`** (con el código arriba).

- [ ] **4. Crear `lib/db/schema/invitation.ts`** (con el código arriba).

- [ ] **5. Crear `lib/db/schema/user-active-org.ts`** (con el código arriba).

- [ ] **6. Crear `lib/db/schema/role-permissions.ts`** (con el código arriba).

- [ ] **7. Actualizar `lib/db/schema/index.ts`** — agregar los re-exports.

- [ ] **8. Generar migration**

  ```bash
  npx drizzle-kit generate --name auth_migration_schema
  ```

  Se crea archivo nuevo en `drizzle/NNNN_auth_migration_schema.sql`. Revisar que incluya solo las tablas nuevas.

- [ ] **9. Editar la migration generada** — agregar los FK cross-schema al final (bloque SQL arriba).

- [ ] **10. Aplicar migration**

  ```bash
  npx drizzle-kit migrate
  ```

  Verificar con Supabase MCP `list_tables`:

  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('organization', 'member', 'invitation', 'user_active_org', 'role_permissions');
  ```

  Todas las 5 tablas deben existir.

- [ ] **11. Verificar FKs**

  ```sql
  SELECT conname, pg_get_constraintdef(c.oid)
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname IN ('member', 'invitation', 'user_active_org')
  AND c.contype = 'f';
  ```

  Verificar que las FKs a `auth.users` están presentes.

- [ ] **12. RLS aún NO habilitada**
  - Las policies se escriben en sub-plan 07. En esta fase las tablas quedan sin RLS (o RLS off).
  - Para evitar data leaks en dev: `ALTER TABLE public.organization ENABLE ROW LEVEL SECURITY;` con política permissiva temporal, o mantener sin RLS sabiendo que sub-plan 07 cierra esto.
  - **Decisión:** dejar sin RLS por ahora. Sub-plan 07 la habilita junto con las policies.

- [ ] **13. Build check**

  ```bash
  npm run build
  ```

  Debe pasar sin errores TypeScript nuevos. Ignorar pre-existentes.

- [ ] **14. Commit**

  ```bash
  git add lib/db/schema/ drizzle/
  git commit -m "feat(auth-migration): phase 01 — create multitenancy schema tables

- Add public.organization, member, invitation, user_active_org, role_permissions
- Cross-schema FK to auth.users via SQL patches
- New enums: invitation_status_enum, app_permission_enum
- Better Auth tables remain intact (Fase 11+12 cleanup)

Ref: docs/plans/2026-04-16-supabase-auth-migration/01-schema-multitenancy.md"
  ```

## Checklist de verificación

- [ ] 5 tablas nuevas en `public.*`
- [ ] FKs a `auth.users` presentes en `member`, `invitation`, `user_active_org`
- [ ] FKs internas (member → organization, invitation → organization) presentes
- [ ] Enums nuevos (`invitation_status_enum`, `app_permission_enum`) creados
- [ ] Build pasa
- [ ] Lint sin errores nuevos
- [ ] `drizzle/` tiene migration nueva con SQL manual integrado

## Rollback de esta fase

Si algo falla:

```bash
git reset --hard HEAD~1
# Si migration ya fue aplicada:
# SQL manual via Supabase MCP:
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.user_active_org CASCADE;
DROP TABLE IF EXISTS public.invitation CASCADE;
DROP TABLE IF EXISTS public.member CASCADE;
DROP TABLE IF EXISTS public.organization CASCADE;
DROP TYPE IF EXISTS invitation_status_enum;
DROP TYPE IF EXISTS app_permission_enum;
```

## Notas

- **No tocar** las tablas Better Auth existentes (`user`, `session`, etc.). Sub-plan 11 las migra, sub-plan 12 las borra.
- **No tocar** las tablas dominio (`properties`, `leads`, etc.). Sub-plan 07 actualiza sus RLS.
- Si el campo `metadata jsonb` en `organization` no va a usarse, considerar quitarlo. Por ahora se preserva por paridad con Better Auth.
- Si `role_permissions` no se usa hasta sub-plan 04, está OK crearla vacía acá.
