# Sub-plan 11 — Data Migration Script

> **Depends on:** 01, 05
> **Unlocks:** 12

## Goal

Migrar data existente de las tablas Better Auth (`user`, `account`, `organization`, `member`, `session`, `invitation`) a la nueva arquitectura Supabase Auth + `public.*`.

Si hay users reales en DB → migrar. Si solo test accounts → opción A: migrar, opción B: borrar todo y que los test users se recreen sobre el nuevo stack.

## Preguntas previas a ejecución

Antes de correr este sub-plan, confirmar con usuario:

1. **¿Hay users reales (no-test) en DB?** (count vía SQL, ver abajo).
2. **¿Se migra o se purga?**
   - Purga: simple, cleanup completo.
   - Migrar: script Node que preserva data.

## Query diagnóstica

```sql
SELECT COUNT(*) AS total_users FROM public.user;
SELECT COUNT(*) AS total_orgs FROM public.organization WHERE schema = 'public';
-- (Better Auth usa schema public para sus tablas; no confundir con public.organization nueva de sub-plan 01 — NOTE: ambas comparten nombre)
```

**COLISIÓN:** la tabla `public.organization` existe tanto en Better Auth (ya poblada) como en la nueva (vacía tras Fase 01). Necesitamos rename.

### Solución: rename Better Auth tablas antes de crear nuevas

En Fase 01 se asume que las tablas Better Auth se llaman igual que las nuevas. Para evitar colisión, **ajustar Fase 01 preamble:**

```sql
-- Ejecutar ANTES de la migration Drizzle de Fase 01:
ALTER TABLE public.organization RENAME TO organization_legacy_better_auth;
ALTER TABLE public.member RENAME TO member_legacy_better_auth;
ALTER TABLE public.invitation RENAME TO invitation_legacy_better_auth;
-- user, session, account no colisionan con nuevos nombres.
```

**Esta acción la incorpora sub-plan 11 (no Fase 01).** El orden real es:

1. Fase 01 crea las tablas nuevas con nombres DIFERENTES: `organization_new`, `member_new`, `invitation_new`.
2. Fase 11 migra data de viejas (`organization`) a nuevas (`organization_new`).
3. Fase 12 borra las viejas y rename nuevas al nombre final.

**O alternativa más limpia:** Fase 01 usa nombres finales (`organization`, `member`, `invitation`). ANTES de Fase 01, en el preamble de la migration Drizzle, se renombran las de Better Auth a `*_legacy`. Sub-plan 11 opera sobre `_legacy`.

**Decisión (mejor):** esta segunda. Editamos Fase 01 para incluir el rename preamble. Fase 11 documenta qué tablas mira.

## Script de migración (opción MIGRAR)

### `scripts/migrate-auth-data.ts` (nuevo)

```ts
/**
 * Migration script: Better Auth → Supabase Auth
 *
 * Reads from:
 *   - public.user (legacy Better Auth users)
 *   - public.account (OAuth accounts)
 *   - public.organization_legacy_better_auth
 *   - public.member_legacy_better_auth
 *
 * Writes to:
 *   - auth.users (via supabase admin API — creates users with email verified)
 *   - public.organization
 *   - public.member
 *   - public.user_active_org
 *
 * Run once, idempotent (checks if user already migrated).
 *
 * Usage:
 *   npx tsx scripts/migrate-auth-data.ts --dry-run  # show what would happen
 *   npx tsx scripts/migrate-auth-data.ts --execute  # actually migrate
 */

import { createClient } from "@supabase/supabase-js"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const DRY_RUN = !process.argv.includes("--execute")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })

interface LegacyUser {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: Date
}

interface LegacyOrg {
  id: string
  name: string
  slug: string
  plan: string
  maxSeats: number
  logoUrl: string | null
  createdAt: Date
}

interface LegacyMember {
  id: string
  userId: string
  organizationId: string
  role: string
  title: string | null
}

interface LegacyAccount {
  userId: string
  provider: string
  providerAccountId: string
  accessToken: string | null
  refreshToken: string | null
}

async function main() {
  console.log(`Migration mode: ${DRY_RUN ? "DRY RUN" : "EXECUTE"}`)
  console.log("Reading legacy data…")

  const { rows: users } = await pgPool.query<LegacyUser>(`
    SELECT id, name, email, "emailVerified" as emailVerified, image, "createdAt" as createdAt
    FROM public."user"
  `)
  console.log(`→ Found ${users.length} legacy users`)

  const { rows: orgs } = await pgPool.query<LegacyOrg>(`
    SELECT id, name, slug, COALESCE(plan, 'free') as plan,
           COALESCE("maxSeats", 1) as maxSeats, "logoUrl", "createdAt"
    FROM public.organization_legacy_better_auth
  `)
  console.log(`→ Found ${orgs.length} legacy orgs`)

  const { rows: members } = await pgPool.query<LegacyMember>(`
    SELECT id, "userId", "organizationId", role, title
    FROM public.member_legacy_better_auth
  `)
  console.log(`→ Found ${members.length} legacy members`)

  const { rows: accounts } = await pgPool.query<LegacyAccount>(`
    SELECT "userId", provider, "providerAccountId", "accessToken", "refreshToken"
    FROM public.account
  `)
  console.log(`→ Found ${accounts.length} legacy OAuth accounts`)

  // Map of legacy user id → new auth.users id
  const userIdMap = new Map<string, string>()

  // 1. Migrate users
  console.log("\n— Step 1: migrate users to auth.users —")
  for (const u of users) {
    if (DRY_RUN) {
      console.log(`[dry] Would create auth.users: ${u.email} (verified: ${u.emailVerified})`)
      userIdMap.set(u.id, "<new-uuid>")
      continue
    }

    // Check if already exists (idempotent)
    const { data: existing } = await supabase.auth.admin.listUsers({
      perPage: 1,
      filter: `email.eq.${u.email}`,
    })

    if (existing?.users && existing.users.length > 0) {
      userIdMap.set(u.id, existing.users[0].id)
      console.log(`✓ Already exists: ${u.email}`)
      continue
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      email_confirm: u.emailVerified, // preserve verified status
      user_metadata: {
        full_name: u.name ?? undefined,
        avatar_url: u.image ?? undefined,
      },
    })

    if (error || !data.user) {
      console.error(`✗ Failed to create user ${u.email}: ${error?.message}`)
      continue
    }

    userIdMap.set(u.id, data.user.id)
    console.log(`✓ Created: ${u.email} → ${data.user.id}`)

    // Send password reset email (users must reset — their old Better Auth hashes aren't compatible)
    // This is critical: existing users get email "Set your password" flow.
    if (!DRY_RUN) {
      const { error: resetErr } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: u.email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password` },
      })
      if (resetErr) console.warn(`⚠ Could not send recovery link to ${u.email}: ${resetErr.message}`)
    }
  }

  // 2. Migrate OAuth identities (if any Google users)
  console.log("\n— Step 2: OAuth identities —")
  console.log(
    "OAuth users will need to re-auth via Google on first login. " +
    "Supabase Auth does not support importing OAuth refresh tokens without user consent. " +
    "When they sign in via Google, Supabase creates the identity link automatically if emails match.",
  )

  // 3. Migrate organizations
  console.log("\n— Step 3: migrate orgs to public.organization —")
  for (const o of orgs) {
    if (DRY_RUN) {
      console.log(`[dry] Would upsert org: ${o.slug}`)
      continue
    }
    await pgPool.query(
      `INSERT INTO public.organization (id, name, slug, plan, max_seats, logo_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [o.id, o.name, o.slug, o.plan, o.maxSeats, o.logoUrl, o.createdAt],
    )
    console.log(`✓ Upserted org: ${o.slug}`)
  }

  // 4. Migrate members
  console.log("\n— Step 4: migrate members —")
  for (const m of members) {
    const newUserId = userIdMap.get(m.userId)
    if (!newUserId) {
      console.warn(`⚠ Member ${m.id} references missing user ${m.userId}; skipping`)
      continue
    }
    if (DRY_RUN) {
      console.log(`[dry] Would upsert member: ${newUserId} in org ${m.organizationId} as ${m.role}`)
      continue
    }
    await pgPool.query(
      `INSERT INTO public.member (user_id, organization_id, role, title)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [newUserId, m.organizationId, m.role, m.title],
    )
  }

  // 5. Set active org for each user (first org they're member of)
  console.log("\n— Step 5: set active orgs —")
  for (const [oldUserId, newUserId] of userIdMap.entries()) {
    const firstMember = members.find((m) => m.userId === oldUserId)
    if (!firstMember) continue
    if (DRY_RUN) {
      console.log(`[dry] Would set active org for ${newUserId} = ${firstMember.organizationId}`)
      continue
    }
    await pgPool.query(
      `INSERT INTO public.user_active_org (user_id, organization_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id`,
      [newUserId, firstMember.organizationId],
    )
  }

  // 6. Map old domain table user references (created_by_user_id)
  console.log("\n— Step 6: update domain tables (created_by_user_id) —")
  const DOMAIN_TABLES = [
    "properties",
    "leads",
    "appointments",
    "ai_contents",
    "lead_property_queue",
  ]

  for (const table of DOMAIN_TABLES) {
    for (const [oldId, newId] of userIdMap.entries()) {
      if (DRY_RUN) {
        console.log(`[dry] UPDATE ${table} SET created_by_user_id = ${newId} WHERE created_by_user_id = ${oldId}`)
        continue
      }
      await pgPool.query(
        `UPDATE public.${table} SET created_by_user_id = $1 WHERE created_by_user_id = $2`,
        [newId, oldId],
      )
    }
  }

  // 7. Update platform_admins
  console.log("\n— Step 7: platform_admins —")
  for (const [oldId, newId] of userIdMap.entries()) {
    if (DRY_RUN) {
      console.log(`[dry] UPDATE platform_admins: ${oldId} → ${newId}`)
      continue
    }
    await pgPool.query(
      `UPDATE public.platform_admins SET user_id = $1 WHERE user_id = $2`,
      [newId, oldId],
    )
  }

  // Done
  console.log("\n✅ Migration complete" + (DRY_RUN ? " (DRY RUN — no changes applied)" : ""))
  console.log(`Migrated ${userIdMap.size} users, ${orgs.length} orgs, ${members.length} members.`)

  if (!DRY_RUN) {
    console.log("\nNext steps:")
    console.log("1. Verify user count: SELECT count(*) FROM auth.users;")
    console.log("2. Send all migrated users a 'please reset your password' email (done automatically).")
    console.log("3. Proceed to Fase 12 cleanup.")
  }

  await pgPool.end()
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
```

## Re-wiring de FKs de tablas dominio (crítico)

10 tablas dominio (`properties`, `leads`, `appointments`, `ai_contents`, `lead_property_queue`, `bot_config`, `bot_conversations`, `bot_messages`, `analytics_events`, `agent_profiles`) tienen FK `organization_id → organization(id)`.

Tras Fase 01 rename, esas FKs automáticamente pasaron a apuntar a `organization_legacy_better_auth` (Postgres las traquea por OID, no por nombre). La nueva `public.organization` está vacía.

Fase 11 debe incluir SQL para:

### Paso 8: Re-wire FKs de dominio a nueva `organization`

```sql
-- drizzle/sql/011_rewire_fks.sql
-- Ejecutar DESPUÉS de que la migration haya copiado todas las rows de
-- organization_legacy_better_auth → organization.

BEGIN;

-- Por cada tabla dominio: drop old FK, add new FK apuntando a public.organization.
-- Nombres actuales (del output de investigación Fase 01):
ALTER TABLE public.properties DROP CONSTRAINT properties_org_id_fkey;
ALTER TABLE public.properties ADD CONSTRAINT properties_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.leads DROP CONSTRAINT leads_org_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.appointments DROP CONSTRAINT appointments_org_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.ai_contents DROP CONSTRAINT ai_contents_org_id_fkey;
ALTER TABLE public.ai_contents ADD CONSTRAINT ai_contents_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.lead_property_queue DROP CONSTRAINT lpq_org_id_fkey;
ALTER TABLE public.lead_property_queue ADD CONSTRAINT lpq_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.bot_config DROP CONSTRAINT bot_config_org_id_fkey;
ALTER TABLE public.bot_config ADD CONSTRAINT bot_config_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.bot_conversations DROP CONSTRAINT bot_conv_org_id_fkey;
ALTER TABLE public.bot_conversations ADD CONSTRAINT bot_conv_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.bot_messages DROP CONSTRAINT bot_msg_org_id_fkey;
ALTER TABLE public.bot_messages ADD CONSTRAINT bot_msg_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.analytics_events DROP CONSTRAINT analytics_org_id_fkey;
ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

ALTER TABLE public.agent_profiles DROP CONSTRAINT agent_profiles_org_id_fkey;
ALTER TABLE public.agent_profiles ADD CONSTRAINT agent_profiles_org_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organization(id);

COMMIT;
```

**Pre-requisitos:**
- Las rows de `organization_legacy_better_auth` deben haberse copiado a `public.organization` preservando UUIDs.
- Después de este rewire, `DROP TABLE organization_legacy_better_auth CASCADE` funciona limpio (Fase 12).

## Alternativa — opción PURGE

Si la decisión es borrar todo:

```sql
-- drizzle/sql/011_purge_legacy_auth.sql

-- Confirm no users we care about
SELECT email, "createdAt" FROM public."user" ORDER BY "createdAt" DESC;

-- Purge in dependency order
TRUNCATE public.invitation_legacy_better_auth CASCADE;
TRUNCATE public.member_legacy_better_auth CASCADE;
TRUNCATE public.organization_legacy_better_auth CASCADE;
TRUNCATE public.account CASCADE;
TRUNCATE public.session CASCADE;
TRUNCATE public."user" CASCADE;

-- Also clear domain tables if they had data tied to deleted users
-- (or update created_by_user_id to a new seed user)
DELETE FROM public.properties;
DELETE FROM public.leads;
DELETE FROM public.appointments;
DELETE FROM public.ai_contents;
DELETE FROM public.lead_property_queue;
DELETE FROM public.bot_conversations CASCADE;
DELETE FROM public.bot_messages;
DELETE FROM public.bot_config;
DELETE FROM public.analytics_events;
DELETE FROM public.agent_profiles;
-- platform_admins: update manually after re-signup
```

## Pasos

- [ ] **1.** Decidir con usuario: migrar o purgar.
- [ ] **2.** Backup completo de DB:
  ```bash
  pg_dump $DATABASE_URL > backup-pre-migration-$(date +%Y%m%d).sql
  ```
- [ ] **3.** Si migrar:
  - [ ] Crear `scripts/migrate-auth-data.ts` con el código arriba.
  - [ ] Instalar dotenv si no está: `npm i -D dotenv`.
  - [ ] Dry run: `npx tsx scripts/migrate-auth-data.ts`
  - [ ] Revisar output, verificar mappings esperados.
  - [ ] Execute: `npx tsx scripts/migrate-auth-data.ts --execute`
  - [ ] Verificar count en `auth.users` matches expected.
  - [ ] Verificar `public.member` populated.
  - [ ] Test sign-in con uno de los users migrados (vía password reset link en email).
- [ ] **4.** Si purgar:
  - [ ] Ejecutar `drizzle/sql/011_purge_legacy_auth.sql` via MCP.
  - [ ] Confirmar que todas las tablas quedan limpias.
- [ ] **5.** Commit.
  ```bash
  git add scripts/migrate-auth-data.ts
  git commit -m "feat(auth-migration): phase 11 — migrate legacy Better Auth data"
  ```

## Checklist

- [ ] Backup DB creado
- [ ] Dry run ejecutado y revisado (si migra)
- [ ] Migration executed (si migra)
- [ ] Verification queries pasan
- [ ] Users migrados reciben password reset email (si migra)

## Rollback

Restaurar backup:
```bash
psql $DATABASE_URL < backup-pre-migration-YYYYMMDD.sql
```

Destructive pero completo.

## Notas

- **Passwords:** Better Auth y Supabase Auth usan hashes INCOMPATIBLES. No se pueden migrar passwords. Usuarios migrados deben reset via recovery email.
- **OAuth (Google):** no se migra directamente. Si user tiene cuenta con Google, en primer sign-in via Google Supabase crea la identity link (match por email). Funciona transparente si email matches.
- **Session invalidation:** todas las sessions de Better Auth se invalidan (tablas legacy se purgan en Fase 12). Users deben re-logueaar.
- **Data domain:** `created_by_user_id` en tablas dominio está en text (Better Auth UUIDs as text). Después de migrar user IDs ya son UUIDs consistentes con `auth.users.id`. Cambiar columna tipo si hace falta (script Fase 07 alter column).
- **Test users:** durante dev, si el flujo es "purgar", es la opción más limpia y rápida. Script de migration queda para cuando haya usuarios reales.
