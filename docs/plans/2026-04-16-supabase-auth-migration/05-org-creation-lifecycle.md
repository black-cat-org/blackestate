# Sub-plan 05 — Organization Creation Lifecycle

> **Depends on:** 01, 03
> **Unlocks:** 07, 09, 10
> **Status:** ✅ Block A Completed — 2026-04-16 (Block B moved to sub-plan 09)
> **Branch:** `feat/auth-migration-phase-05`

## Scope split (importante)

Este sub-plan se dividió en dos bloques durante ejecución:

**Block A — DB layer (esta fase, completada):**
- Trigger `on_auth_user_created` sobre `auth.users`
- Function `public.handle_new_user()` que crea `organization` + `member(owner)` + `user_active_org`
- Partial index `member_active_user_org_idx` + drop del `member_deleted_at_idx` redundante (tarea deferida del review de sub-plan 01)

**Block B — Server Actions TypeScript (movido a sub-plan 09):**
- `switchActiveOrgAction(newOrgId)`
- `createOrganizationAction({ name, slug })`
- `updateOrganizationAction(id, patch)`

**Motivo del split:** Block B depende de `getSupabaseServerClient()` (no existe hasta sub-plan 09) y de la versión Supabase-Auth-aware de `getSessionContext()` (también sub-plan 09). Implementarlo acá resultaría en build roto o stubs sin valor. Sub-plan 09 landea ambos simultáneamente para mantener `npm run build` verde en cada merge.

Las secciones de este documento que describen los Server Actions se conservan como **referencia de diseño** para cuando sub-plan 09 los implemente.

## Resumen ejecución Block A

- `public.handle_new_user()` creada con `SECURITY DEFINER` + `set search_path = ''`
- Display name coalesce: `full_name → name → email → 'User'` (alineado con JWT hook de sub-plan 03)
- Slug: `email_local_part` cleaned + timestamp hex suffix + md5 fallback sobre collision via nested `EXCEPTION WHEN unique_violation`
- `EXCEPTION WHEN OTHERS` defensivo: sign-up nunca falla por org creation; `RAISE WARNING` logueado para ops
- Trigger `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW`
- Grants: EXECUTE a `supabase_auth_admin`; INSERT belt-and-suspenders a las 3 tablas target (defense contra ownership drift futuro)
- Revokes: `authenticated/anon/public` no pueden ejecutar la function directamente

**Post-review fixes aplicados (1 blocker + 1 major + 3 minor):**
- **Blocker:** documentar SECURITY DEFINER ownership assumption + agregar grants INSERT defensivos
- **Major:** race-safe slug via nested `EXCEPTION WHEN unique_violation` (antes era `EXISTS + INSERT` con TOCTOU window)
- **Minor:** removido `deletedAtIdx` de `lib/db/schema/member.ts` (evita drift con `drizzle-kit generate`)
- **Minor:** null email guard en slug + name derivation (futuro-proof para phone/anon auth)
- **Minor:** alineado fallback de name con JWT hook (full email, no solo local part)

**Tests post-fix (3/3 PASSED):**
- Test 1 — email sin metadata → name = email, slug = local-part + timestamp
- Test 2 — `full_name` metadata → org.name = "Jane Doe"
- Test 3 — `name` metadata (Google OAuth pattern) → org.name = "John Smith"
- Para cada test, verificación: `member(role=owner)`, `user_active_org` consistente, `org(plan=free, max_seats=1)`.
- Cleanup completo (CASCADE al borrar user elimina las 3 rows derivadas).

## Goal

Reemplazar la 3-layer defense de Better Auth por:

1. **DB trigger** sobre `auth.users` que auto-crea `organization` + `member` + `user_active_org` cuando un usuario nuevo se registra.
2. **Server Actions TS** para: `createOrganization`, `switchActiveOrg` (cambiar org activa), `updateOrganization`.

Elimina `lib/auth-utils.ts` (Fase 12).

## Trigger SQL

### `drizzle/sql/005_org_creation_trigger.sql`

```sql
-- Auto-create default organization on new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
  base_slug text;
  final_slug text;
  user_email text;
  user_name text;
  slug_collision_count integer;
  timestamp_suffix text;
begin
  user_email := new.email;
  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1)
  );

  -- Base slug from email prefix
  base_slug := lower(regexp_replace(split_part(user_email, '@', 1), '[^a-z0-9]+', '-', 'g'));
  base_slug := substr(base_slug, 1, 30);
  timestamp_suffix := lower(to_hex(extract(epoch from now())::bigint));
  final_slug := base_slug || '-' || timestamp_suffix;

  -- Check for unlikely collision
  select count(*) into slug_collision_count from public.organization where slug = final_slug;
  if slug_collision_count > 0 then
    final_slug := final_slug || '-' || substr(md5(new.id::text), 1, 6);
  end if;

  -- Create org
  insert into public.organization (id, name, slug, plan, max_seats)
  values (gen_random_uuid(), user_name, final_slug, 'free', 1)
  returning id into new_org_id;

  -- Create member (owner)
  insert into public.member (user_id, organization_id, role, title)
  values (new.id, new_org_id, 'owner', null);

  -- Set active org
  insert into public.user_active_org (user_id, organization_id)
  values (new.id, new_org_id);

  return new;
exception
  when others then
    -- Log but do not fail sign-up (defensive)
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Trigger on new user insertion
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grants needed
grant execute on function public.handle_new_user() to supabase_auth_admin;
```

## Server Actions

### `features/shared/presentation/organization-actions.ts` (NUEVO)

```ts
"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { db } from "@/lib/db"
import { eq, and, sql } from "drizzle-orm"
import { organization, member, userActiveOrg } from "@/lib/db/schema"

/**
 * Switch active organization for the current user.
 * Updates public.user_active_org and forces JWT refresh so claims reflect new org.
 */
export async function switchActiveOrgAction(newOrgId: string): Promise<void> {
  const ctx = await getSessionContext()

  // Verify membership
  const [membership] = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, ctx.userId),
        eq(member.organizationId, newOrgId),
      ),
    )
    .limit(1)

  if (!membership) {
    throw new Error("No sos miembro de esta organización")
  }

  // Update active org (upsert)
  await db
    .insert(userActiveOrg)
    .values({ userId: ctx.userId, organizationId: newOrgId })
    .onConflictDoUpdate({
      target: userActiveOrg.userId,
      set: { organizationId: newOrgId, updatedAt: new Date() },
    })

  // Force JWT refresh so hook re-emits with new active_org_id
  const supabase = await getSupabaseServerClient()
  await supabase.auth.refreshSession()

  revalidatePath("/dashboard")
}

/**
 * Create a new organization for the current user (plan permitting).
 * User becomes owner. Org becomes their new active org.
 */
export async function createOrganizationAction(input: {
  name: string
  slug: string
}): Promise<{ id: string; slug: string }> {
  const ctx = await getSessionContext()

  // Validate slug uniqueness + format
  if (!/^[a-z0-9-]{3,50}$/.test(input.slug)) {
    throw new Error("El slug debe tener entre 3 y 50 caracteres alfanuméricos o guiones")
  }

  const existing = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, input.slug))
    .limit(1)

  if (existing.length > 0) {
    throw new Error("Ese slug ya está en uso")
  }

  // Create org + member + switch active, atomically
  const result = await db.transaction(async (tx) => {
    const [newOrg] = await tx
      .insert(organization)
      .values({
        name: input.name,
        slug: input.slug,
        plan: "free",
        maxSeats: 1,
      })
      .returning({ id: organization.id, slug: organization.slug })

    await tx.insert(member).values({
      userId: ctx.userId,
      organizationId: newOrg.id,
      role: "owner",
    })

    await tx
      .insert(userActiveOrg)
      .values({ userId: ctx.userId, organizationId: newOrg.id })
      .onConflictDoUpdate({
        target: userActiveOrg.userId,
        set: { organizationId: newOrg.id, updatedAt: new Date() },
      })

    return newOrg
  })

  // Force JWT refresh
  const supabase = await getSupabaseServerClient()
  await supabase.auth.refreshSession()

  revalidatePath("/dashboard")
  return result
}

/**
 * Update organization metadata (name, logo, etc.). Only owner/admin.
 */
export async function updateOrganizationAction(
  orgId: string,
  patch: { name?: string; logoUrl?: string | null },
): Promise<void> {
  const ctx = await getSessionContext()

  if (ctx.orgId !== orgId) {
    throw new Error("Organización no coincide con la activa")
  }
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new Error("No tenés permisos para actualizar la organización")
  }

  await db
    .update(organization)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
    })
    .where(eq(organization.id, orgId))

  revalidatePath("/dashboard/settings")
}
```

## Use cases (opcional, si querés mantener Clean Arch layering)

Si el proyecto requiere que las Server Actions llamen a use cases, mover la lógica a:
- `features/shared/application/switch-active-org.use-case.ts`
- `features/shared/application/create-organization.use-case.ts`
- `features/shared/application/update-organization.use-case.ts`

Y las actions solo hacen auth + delegate.

**Decisión (opinada):** mantener la lógica inline en Server Actions para estas 3 operaciones. No hay lógica de dominio compleja — es CRUD directo. Evita over-engineering.

## Pasos

- [ ] **1.** Crear `drizzle/sql/005_org_creation_trigger.sql` con el SQL de arriba.
- [ ] **2.** Ejecutar via MCP/psql.
- [ ] **3.** Verificar trigger:
  ```sql
  SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```
- [ ] **4.** Smoke test:
  ```sql
  -- Desde dashboard: crear user nuevo vía Add User
  -- Después:
  SELECT o.name, m.role, uao.organization_id
  FROM public.organization o
  JOIN public.member m ON m.organization_id = o.id
  JOIN public.user_active_org uao ON uao.user_id = m.user_id
  WHERE m.user_id = '<new-user-id>';
  ```
  Expected: 1 fila, m.role = owner, todo consistente.
- [ ] **5.** Crear `features/shared/presentation/organization-actions.ts` con el código de arriba.
  - Nota: `getSupabaseServerClient` y `getSessionContext` se crean/actualizan en Fase 09.
- [ ] **6.** Build check (temporal): las imports desde módulos que aún no existen romperán. Comentar las líneas que dependen de Fase 09, o dejar el archivo con TODO explícito y retomar en Fase 09.
  - **Decisión:** mover el contenido de este archivo a Fase 09 commit, donde ya existen sus dependencias. Esta fase solo SQL.

  → **En esta Fase 05, solo se ejecuta el SQL. Las Server Actions TS quedan documentadas acá pero se committean en Fase 09.**

- [ ] **7.** Commit
  ```bash
  git add drizzle/sql/005_org_creation_trigger.sql docs/plans/2026-04-16-supabase-auth-migration/05-org-creation-lifecycle.md
  git commit -m "feat(auth-migration): phase 05 — org creation trigger on auth.users

- Trigger on_auth_user_created auto-creates organization, member (owner), user_active_org
- Server Actions TS (switchActiveOrg, createOrganization, updateOrganization) documented; code landed in phase 09
- Replaces Better Auth 3-layer defense pattern

Ref: docs/plans/2026-04-16-supabase-auth-migration/05-org-creation-lifecycle.md"
  ```

## Checklist

- [ ] Trigger existe en DB
- [ ] Smoke test: user nuevo → org + member + user_active_org en 1 acción
- [ ] Error handling en trigger (EXCEPTION WHEN OTHERS) no rompe sign-up

## Rollback

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```

## Tarea adicional — partial index para hot path

Code review de sub-plan 01 detectó que `member_deleted_at_idx` (full index) no sirve para queries `WHERE deleted_at IS NULL`. El JWT hook (sub-plan 03) y este trigger leen `member` por user/org en cada refresh. Agregar partial index optimizado:

```sql
-- Agregar al final de drizzle/sql/005_org_creation_trigger.sql
CREATE INDEX IF NOT EXISTS member_active_user_org_idx
  ON public.member (user_id, organization_id)
  WHERE deleted_at IS NULL;

-- Optional cleanup: drop el full index ahora redundante
DROP INDEX IF EXISTS member_deleted_at_idx;
```

## Notas

- El trigger corre `security definer` → tiene privilegios para insertar en las 3 tablas sin pasar por RLS (porque RLS aún no está enabled en estas tablas hasta sub-plan 07, y después del enable el trigger usa security definer bypass).
- El slug usa timestamp hex para uniqueness rápida. Colisión es casi imposible pero se maneja defensivamente con sufijo md5 extra.
- Si una org creation falla (defensive), el user queda sin org y el hook (Fase 03) devuelve `active_org_id: null`. La UI debe detectarlo y mostrar "crear organización" como fallback (Fase 10 skeleton del OrgSwitcher).
- Este trigger reemplaza las 3 layers de Better Auth:
  - Layer 1 (`hooks.after`) → este trigger
  - Layer 2 (`databaseHooks.session.create.before`) → unnecessary, el JWT hook lee `user_active_org` cada refresh
  - Layer 3 (`ensureOrganization()` fallback en dashboard layout) → unnecessary, trigger garantiza creación en sign-up
