# Sub-plan 09 — Server Actions + Session Context Refactor

> **Depends on:** 01, 02, 03, 05 (Block A), 07
> **Unlocks:** 10

## Goal

Reescribir la infrastructure de auth en el proyecto:

1. `lib/supabase/server.ts` — separar `getSupabaseServerClient()` (auth cookies) vs `getSupabaseAdmin()` (service_role).
2. `lib/supabase/proxy.ts` — nuevo middleware `updateSession()` para refresh de cookies.
3. `proxy.ts` en raíz — usa `updateSession` de `@supabase/ssr` pattern.
4. `features/shared/infrastructure/session-context.ts` — reescrito para leer de Supabase Auth (via `supabase.auth.getClaims()`).
5. Eliminar `withRLS()` — ya no necesario. Drizzle queries siguen directo, RLS se aplica por cookies auth.
6. Actualizar call sites: todas las Server Actions llaman `getSessionContext()` como antes (API compatible).
7. **Block B absorbido de sub-plan 05** (ver abajo) — Server Actions de organization lifecycle.

## Block B absorbido desde sub-plan 05

Sub-plan 05 quedó reducido a Block A (DB trigger + indexes) por dependencia: los Server Actions de organization lifecycle necesitan `getSupabaseServerClient()` que esta fase crea. Implementación acá landea ambos simultáneamente.

Archivo a crear en esta fase: `features/shared/presentation/organization-actions.ts` con 3 Server Actions:

- **`switchActiveOrgAction(newOrgId: string)`** — valida que el user es member del newOrgId vía Drizzle query con `withRLS` (o cliente Supabase, según decisión final de esta fase); upsert en `public.user_active_org`; fuerza `supabase.auth.refreshSession()` para que el próximo JWT refleje el cambio; `revalidatePath("/dashboard")`.

- **`createOrganizationAction({ name, slug })`** — valida slug format + uniqueness; transaction Drizzle: insert `organization` + insert `member(owner)` + upsert `user_active_org`; `supabase.auth.refreshSession()`.

- **`updateOrganizationAction(orgId, patch: { name?, logoUrl? })`** — valida que `ctx.orgId === orgId` (solo active org) + `ctx.role IN ('owner','admin')`; UPDATE en `organization`; `revalidatePath("/dashboard/settings")`.

El diseño detallado de estos Server Actions está en **`05-org-creation-lifecycle.md` Block B section** (reference). Esta fase implementa ese diseño con las dependencies ya presentes.

## Archivos

### Crear

- `lib/supabase/proxy.ts`
- `lib/supabase/client.ts` (cliente browser)

### Modificar

- `lib/supabase/server.ts`
- `features/shared/infrastructure/session-context.ts`
- `proxy.ts` (raíz)
- Todas las Server Actions que consumían `withRLS()` — se elimina el wrapper (ver lista)

### Eliminar

- `features/shared/infrastructure/rls.ts`
- `lib/db/rls.ts` (duplicado)
- `lib/db/session-context.ts` (duplicado)

## Código

### `lib/supabase/server.ts` (rewrite)

```ts
import "server-only"
import { createServerClient, type SupabaseClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`[supabase] Missing env var ${name}`)
  return v
}

function assertSecretKey(key: string): void {
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is set to a publishable key. Replace with secret key.",
    )
  }
  // ... (keep existing validation)
}

/**
 * Supabase client with authenticated user JWT via session cookies.
 * Use for RLS-protected operations in Server Actions, Server Components.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Safe to ignore — proxy.ts handles session refresh.
          }
        },
      },
    },
  )
}

/**
 * Admin client using service_role key. BYPASSES RLS.
 * Use ONLY for admin operations: auth.admin.*, Inngest cross-org jobs, seed scripts.
 */
const globalForAdmin = globalThis as typeof globalThis & {
  supabaseAdmin?: SupabaseClient
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!globalForAdmin.supabaseAdmin) {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
    const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    assertSecretKey(key)
    globalForAdmin.supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return globalForAdmin.supabaseAdmin
}
```

### `lib/supabase/client.ts` (nuevo)

```ts
"use client"
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
```

### `lib/supabase/proxy.ts` (nuevo)

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // CRITICAL: Do not put any code between createServerClient and getClaims()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Protect /dashboard routes
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### `proxy.ts` (raíz, rewrite)

```ts
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

### `features/shared/infrastructure/session-context.ts` (rewrite)

```ts
import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Extract session context from Supabase Auth cookies.
 * Claims come from custom_access_token_hook (Fase 03):
 *   - sub (auth.uid)
 *   - active_org_id
 *   - org_role
 *   - is_super_admin
 *
 * Throws if not authenticated or no active org.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    throw new Error("Not authenticated")
  }

  const claims = data.claims
  const userId = claims.sub as string | undefined
  const orgId = claims.active_org_id as string | null | undefined
  const role = claims.org_role as SessionContext["role"] | null | undefined
  const isSuperAdmin = (claims.is_super_admin as boolean | null | undefined) ?? false

  if (!userId) throw new Error("Invalid session: missing sub claim")
  if (!orgId || !role) {
    throw new Error("No active organization")
  }

  return {
    userId,
    orgId,
    role,
    isSuperAdmin,
  }
}
```

### Eliminar `features/shared/infrastructure/rls.ts`

El archivo se borra. Todas las queries Drizzle ahora corren directo — RLS se aplica porque el cliente Supabase tiene el JWT auth contextual en cookies, y Supabase Postgres aplica RLS sobre ese role.

**Pero wait** — Drizzle NO usa el cliente Supabase. Drizzle usa `pg.Pool` directo con `DATABASE_URL` que es `postgres`/`service_role` role.

**Problema:** Drizzle no es un cliente autenticado. Si borramos `withRLS()`, las queries Drizzle bypasean RLS (conexión postgres = role postgres = superuser).

**Solución:**

Hay dos paths:

**Path A — Mantener `withRLS()` pero leer claims del JWT Supabase:**

`withRLS()` sigue existiendo, pero su claims las obtiene de `getSessionContext()` → que viene de Supabase. Entonces el workaround sigue, pero es consistente con la fuente (Supabase Auth).

**Path B — Usar cliente Supabase para queries simples + Drizzle solo para complejas:**

Reescribir todas las Server Actions que hacen select/insert/update simples para usar `supabase.from('properties').select(...)`. Drizzle queda para queries con joins múltiples / complejas que se ejecutan vía `withRLS()` igual.

**Decisión:** **Path A** — menos disruptivo, menos reescritura.

**Mantener `features/shared/infrastructure/rls.ts`** con modificación:

```ts
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import type { SessionContext } from "@/features/shared/domain/session-context"

interface RLSOptions {
  includeDeleted?: boolean
}

export async function withRLS<T>(
  ctx: SessionContext,
  callback: (tx: typeof db) => Promise<T>,
  opts: RLSOptions = {},
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set role to authenticated (enable RLS policies)
    await tx.execute(sql`SET LOCAL ROLE authenticated`)

    // Inject JWT claims matching Supabase Auth format
    const claims = {
      sub: ctx.userId,
      role: "authenticated",
      aud: "authenticated",
      active_org_id: ctx.orgId,
      org_role: ctx.role,
      is_super_admin: ctx.isSuperAdmin ?? false,
    }
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`,
    )

    if (opts.includeDeleted) {
      await tx.execute(sql`SELECT set_config('app.include_deleted', 'true', true)`)
    }

    return callback(tx)
  })
}
```

**Diferencia vs anterior:** claims usan `active_org_id` en vez de `org_id` para match con el hook y las nuevas policies. Role es `authenticated` (no `anon`), con `aud` también `authenticated` para respetar policies `TO authenticated`.

**Eliminar duplicados:**

- `lib/db/rls.ts` — duplicado, borrar.
- `lib/db/session-context.ts` — duplicado, borrar.

Imports updates:
- Todas las referencias a `@/lib/db/rls` o `@/lib/db/session-context` → actualizar a `@/features/shared/infrastructure/*`.

## Updates en Server Actions

Todas las actions ya hacen:

```ts
const ctx = await getSessionContext()
return someUseCase(ctx, ...)
```

Como `getSessionContext` mantiene su API, **no requieren cambios en las actions**.

Use cases que llaman `withRLS(ctx, (tx) => ...)` siguen igual — `withRLS` mantiene su API.

Los que llaman storage requieren actualización (cliente explícito, ver Fase 08).

## Pasos

- [x] **1.** Reescribir `lib/supabase/server.ts` con `getSupabaseServerClient` + `getSupabaseAdmin`. ✅ (tarea #62)
- [x] **2.** Crear `lib/supabase/client.ts`. ✅ (tarea #62)
- [x] **3.** Crear helper Supabase para middleware. ✅ (tarea #62 — archivo nombrado `lib/supabase/middleware.ts` para distinguirlo del `proxy.ts` raíz y seguir convención oficial Supabase; export `updateSupabaseSession(request)`). Shared env helper extraído a `lib/supabase/env.ts` (DRY).
- [ ] **4.** Reescribir `proxy.ts` raíz. ← tarea #63
- [ ] **5.** Reescribir `features/shared/infrastructure/session-context.ts`. ← tarea #63
- [ ] **6.** Actualizar `features/shared/infrastructure/rls.ts` con claim names nuevos. ← tarea #64
- [ ] **7.** Eliminar `lib/db/rls.ts` y `lib/db/session-context.ts`. ← tarea #68
- [ ] **8.** `rg "from \"@/lib/db/rls\"` → reemplazar por `@/features/shared/infrastructure/rls`. Grep + fix todos. ← tarea #68
- [ ] **9.** `rg "from \"@/lib/db/session-context\""` → reemplazar. Grep + fix. ← tarea #68
- [ ] **10.** Drizzle queries en Fase 06 (invitation-actions, organization-actions) → agregar `withRLS(ctx, async (tx) => ...)` donde corresponda. ← tareas #66, #67
- [ ] **11.** Build check.
- [ ] **12.** Test manual: sign-in → dashboard renders → properties page lista. Cada Server Action corre sin errores.
- [ ] **13.** Commit.

### Tarea #62 — notas de implementación

- Code review robusto aplicado pre-merge. Reviewer flagged cookie options parity + JSDoc accuracy + DRY `requireEnv`. Resoluciones:
  - `NextRequest.cookies.set` es 2-arg only (TS enforcement). Mantenemos `(name, value)` ahí. `response.cookies.set` sí recibe `options`. Esto matchea Supabase reference canónico.
  - JSDoc de `updateSupabaseSession` suavizado — describe el contrato que aplicará al wirearse en tarea #63. Evita aserciones falsas sobre estado actual.
  - `requireEnv` extraído a `lib/supabase/env.ts` — tipo `SupabaseEnvVar` centralizado. Tres copias → una fuente de verdad.
  - `CookieOptions` re-export quitado de `client.ts` (dead export).
- `@supabase/ssr@0.8.x` instalado como peer de `@supabase/supabase-js@2.103.2` (ya presente).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` requeridas en `.env.local` (confirmado por usuario).

## Checklist

- [ ] `getSupabaseServerClient` + `getSupabaseAdmin` separados
- [ ] Proxy refresca cookies via `getClaims()`
- [ ] `/dashboard` redirect si no auth
- [ ] `getSessionContext` lee del JWT Supabase
- [ ] `withRLS` usa claims `active_org_id`
- [ ] Duplicados eliminados
- [ ] Todas las imports actualizadas
- [ ] Build + lint pass

## Rollback

- `git revert` del commit.
- Recuperar archivos duplicados borrados (están en git history).

## Notas

- El pattern `Path A` (mantener `withRLS`) es una concesión de arquitectura — Supabase Auth no hace automagic RLS sobre conexiones Postgres directas. Solo sobre el cliente Supabase. Drizzle queda fuera de ese loop.
- Alternativa futura: migrar queries simples a usar `supabase.from(...).select()` y quedarse solo con `withRLS()` para queries complejas. Evaluar en Fase posterior cuando storage+auth sean estables.
- El `withRLS` actual (Better Auth era) usa claim `org_id`. El nuevo usa `active_org_id`. Las policies viejas leían `org_id`, las nuevas leen `active_org_id`. Sub-plan 07 reescribe policies. Sub-plan 09 reescribe withRLS. Mismo tiempo, mismo commit paralelo. Sin desync.
