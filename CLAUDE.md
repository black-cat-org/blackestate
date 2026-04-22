# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Black Estate** — SaaS B2B para el mercado inmobiliario LATAM. Next.js 16, React 19, TypeScript 5, Tailwind CSS 4. App Router architecture. Frontend MVP completo (~160 componentes). Auth migración Better Auth → Supabase Auth completada (2026-04-17). Backend data layer real con Clean Architecture + RLS.

**Modelo de negocio:** Multi-tenant B2B. Agentes inmobiliarios individuales y agencias con equipos.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is configured yet.

## Software Architecture: Clean Architecture + DDD + Feature-Based Modules

This project follows **Clean Architecture** principles adapted for Next.js, organized by **feature-based modules** with **Domain-Driven Design** (DDD) patterns. Every feature is a self-contained vertical slice with clear layer separation.

### Core Principles

1. **Dependency Rule**: Domain ← Application ← Infrastructure ← Presentation. Inner layers NEVER import from outer layers.
2. **Feature isolation**: Each business domain (properties, leads, appointments, etc.) is a self-contained module under `features/`.
3. **Null safety**: DB speaks `null`. App speaks `undefined`. Mappers translate. Components NEVER see `null`.
4. **Port/Adapter pattern**: Domain defines repository interfaces (ports). Infrastructure implements them (adapters).

### Layer Responsibilities

| Layer | Location | Responsibility | Does NOT |
|---|---|---|---|
| **Domain** | `features/*/domain/` | Entity interfaces, repository interfaces (ports), value objects, business rules | Import from infrastructure, know about DB, Drizzle, or frameworks |
| **Application** | `features/*/application/` | Use cases that orchestrate business logic. One file per action. | Know about DB, Drizzle, HTTP, or UI. Only calls repository interfaces |
| **Infrastructure** | `features/*/infrastructure/` | Drizzle queries, DB mappers, repository implementations (adapters) | Contain business logic. Only translates between DB and domain |
| **Presentation** | `features/*/presentation/` | Server Actions (thin), React components specific to this feature | Contain business logic. Only calls use cases and renders UI |

### Data Flow (Read)

```
Component (renders Entity)
  ↑ returns Entity
Server Action (thin: auth + delegate)
  ↑ returns Entity
Use Case (orchestrates, applies business rules)
  ↑ returns Entity
Repository Implementation (queries DB via withRLS)
  ↑ maps Model → Entity
Mapper (converts null → undefined, flat → nested)
  ↑ returns Model (DB row)
Drizzle + Postgres (via RLS transaction)
```

### Data Flow (Write)

```
Component (submits form data)
  ↓ calls
Server Action (validates with Zod at boundary, gets SessionContext)
  ↓ calls
Use Case (business rules: can this user do this? is data valid?)
  ↓ calls
Repository Implementation (maps Entity/DTO → Model, inserts via withRLS)
  ↓ mapper converts
Mapper (converts undefined → null, nested → flat)
  ↓ inserts
Drizzle + Postgres (via RLS transaction)
  ↓ returns row
Mapper (converts Model → Entity)
  ↓ returns
Entity (back to component)
```

### Feature Module Structure

```
features/
  shared/
    domain/
      value-objects.ts                  # CurrencyAmount, SurfaceArea, PropertyAddress, etc.
    infrastructure/
      rls.ts                            # withRLS() — RLS transaction wrapper
      session-context.ts                # getSessionContext() — Better Auth session extraction

  properties/
    domain/
      property.entity.ts                # Property interface (domain type, uses undefined)
      property.repository.ts            # IPropertyRepository interface (port/contract)
    application/
      get-properties.use-case.ts        # Use case: list properties
      get-property-by-id.use-case.ts    # Use case: get single property
      create-property.use-case.ts       # Use case: create property
      update-property.use-case.ts       # Use case: update property
      delete-property.use-case.ts       # Use case: soft delete property
      duplicate-property.use-case.ts    # Use case: duplicate property
    infrastructure/
      property.model.ts                 # Type alias for Drizzle $inferSelect (uses null)
      property.mapper.ts                # Model ↔ Entity conversion (null ↔ undefined)
      drizzle-property.repository.ts    # IPropertyRepository implementation with Drizzle
    presentation/
      components/                       # React components specific to properties
      actions.ts                        # Server Actions (thin: auth + call use case)

  leads/
    domain/...
    application/...
    infrastructure/...
    presentation/...

  appointments/...
  bot/...
  analytics/...
  ai-contents/...
  settings/...
```

### What stays OUTSIDE features/

| Location | Content | Reason |
|---|---|---|
| `app/` | Pages and layouts (App Router routes) | Next.js requires file-based routing here. Pages import from `features/*/presentation/` |
| `components/ui/` | shadcn/ui base components (Button, Card, Dialog, etc.) | Generic UI, not feature-specific |
| `components/landing/` | Public landing page components | Shared across features |
| `hooks/` | Generic React hooks (useDebounce, useMediaQuery, etc.) | Shared utilities, not feature-specific |
| `lib/db/schema/` | Drizzle table schemas | Shared DB infrastructure |
| `lib/db/pool.ts` | Database connection pool | Shared infrastructure |
| `lib/constants/` | App-wide constants, labels, messages | Shared presentation constants |
| `lib/validations/` | Zod schemas for form validation | Shared at boundary layer |
| `lib/utils/` | Pure utility functions (format, geo, etc.) | Shared utilities |

### Naming Conventions

| File | Pattern | Example |
|---|---|---|
| Entity | `{feature}.entity.ts` | `property.entity.ts` |
| Repository interface | `{feature}.repository.ts` | `property.repository.ts` |
| Repository implementation | `drizzle-{feature}.repository.ts` | `drizzle-property.repository.ts` |
| Model | `{feature}.model.ts` | `property.model.ts` |
| Mapper | `{feature}.mapper.ts` | `property.mapper.ts` |
| Use case | `{action}-{feature}.use-case.ts` | `create-property.use-case.ts` |
| Server Actions | `actions.ts` | One per feature presentation |

### Null Safety: Model → Mapper → Entity (CRITICAL)

This is the most important data integrity rule in the project. Every data boundary must handle nullability correctly.

**The three types:**

| Type | Where | Nullable pattern | Who consumes |
|---|---|---|---|
| **Model** | `features/*/infrastructure/{feature}.model.ts` | `T \| null` for nullable DB columns | Only the mapper |
| **Entity** | `features/*/domain/{feature}.entity.ts` | `field?: T` (optional, NEVER null) | Use cases, components, everything in the app |
| **DTO** (form data) | `lib/types/` or inline | `T \| ""` for form fields | Server Actions at the boundary |

**Mapper rules:**

```typescript
// Reading (Model → Entity): null becomes undefined (absent)
rooms: row.rooms ?? undefined           // number | null → number | undefined
shortDescription: row.shortDescription ?? undefined

// Writing (Entity/DTO → Model): undefined/empty becomes null
rooms: data.rooms ? Number(data.rooms) : null
shortDescription: data.shortDescription || null
```

**Null safety audit checklist (run for EVERY new mapper):**

1. List every nullable column in the Drizzle schema for this table
2. Verify each one maps to an optional field (`field?: T`) in the entity
3. Verify the mapper converts `null → undefined` (read) and `undefined → null` (write)
4. Grep components that consume this entity for direct access without `?.` on optional fields
5. Verify Zod schemas at the boundary handle empty strings → null conversion

**Hard rule:** If a component crashes with "Cannot read property of undefined/null", the mapper or entity type is wrong. Fix the type, not the component.

### Value Objects

Shared domain types used across features. Defined as TypeScript interfaces (not classes — no DI in Next.js).

```typescript
// features/shared/domain/value-objects.ts
interface CurrencyAmount { amount: number; currency: "USD" | "BOB" }
interface SurfaceArea { value: number; unit: "m2" | "ha" }
interface PropertyAddress { street: string; number?: string; city: string; ... }
interface PropertyMedia { photos: string[]; videoUrl?: string; ... }
```

Validation happens at the boundary (Zod in Server Actions), not in value objects.

### Repository Pattern

```typescript
// Domain defines the contract (port)
// features/properties/domain/property.repository.ts
interface IPropertyRepository {
  findAll(ctx: SessionContext): Promise<Property[]>
  findById(ctx: SessionContext, id: string): Promise<Property | undefined>
  create(ctx: SessionContext, data: CreatePropertyDTO): Promise<Property>
  update(ctx: SessionContext, id: string, data: UpdatePropertyDTO): Promise<Property>
  softDelete(ctx: SessionContext, id: string): Promise<void>
}

// Infrastructure implements the contract (adapter)
// features/properties/infrastructure/drizzle-property.repository.ts
class DrizzlePropertyRepository implements IPropertyRepository {
  async findAll(ctx: SessionContext): Promise<Property[]> {
    const rows = await withRLS(ctx, (tx) => tx.select().from(properties))
    return rows.map(mapRowToEntity)
  }
}
```

### Use Cases

One file per action. Orchestrates business logic without knowing about Drizzle or DB.

```typescript
// features/properties/application/create-property.use-case.ts
export async function createPropertyUseCase(
  ctx: SessionContext,
  data: CreatePropertyDTO
): Promise<Property> {
  const repository = new DrizzlePropertyRepository()
  return repository.create(ctx, data)
}
```

### Server Actions (Presentation Layer)

Thin layer. Only does: auth + validate + delegate to use case.

```typescript
// features/properties/presentation/actions.ts
"use server"
export async function createPropertyAction(formData: PropertyFormData): Promise<Property> {
  const ctx = await getSessionContext()
  // Zod validation at boundary if needed
  return createPropertyUseCase(ctx, formData)
}
```

### Import Rules (ENFORCED)

| From → To | Allowed? | Example |
|---|---|---|
| Domain → Domain | Yes | Entity imports value objects |
| Application → Domain | Yes | Use case imports entity + repository interface |
| Infrastructure → Domain | Yes | Repository impl imports entity + interface |
| Infrastructure → Application | No | Never |
| Presentation → Application | Yes | Server Action imports use case |
| Presentation → Domain | Yes | Component imports entity type |
| Presentation → Infrastructure | No | Never directly. Use cases mediate |
| `app/` pages → Presentation | Yes | Page imports feature components + actions |
| `app/` pages → Domain | Yes | Page imports entity types for props |
| `app/` pages → Infrastructure | No | Never |
| `app/` pages → Application | No | Server Actions mediate |
| Any layer → `lib/*` | Yes | Shared utilities (`lib/supabase/*`, `lib/db/*`, `lib/utils/*`, `lib/constants/*`) are cross-cutting. Callable from Application, Presentation, or `app/`. Feature-specific `features/*/infrastructure/` still cannot be imported from Presentation |

## Database Layer

- **ORM:** Drizzle ORM + Drizzle Kit for domain tables
- **Connection:** Shared `pg` pool in `lib/db/pool.ts` (with `globalThis` guard to prevent leaks in dev)
- **Drizzle instance:** `lib/db/index.ts` exports `db`
- **Schemas:** `lib/db/schema/` — one file per table, barrel in `index.ts`
- **Migrations:** `drizzle/` — `.sql` files generated by Drizzle Kit
- **Config:** `drizzle.config.ts` points to `lib/db/schema/index.ts`
- **RLS:** `features/shared/infrastructure/rls.ts` exports `withRLS()` — transaction wrapper that calls `set_config('role', 'authenticated', true)` + `set_config('request.jwt.claims', <json>, true)` (NOT `SET LOCAL $1` — Postgres does not parametrise SET statements). Injected claims: `sub`, `active_org_id`, `org_role`, `is_super_admin`, `email` (the last is carried by `SessionContext.email` so `auth.email()` works inside invitee-side policies). ALL user queries MUST go through `withRLS()`.
- **Session Context:** `features/shared/infrastructure/session-context.ts` exports `getSessionContext()` and `getAuthState()` — both read Supabase Auth JWT claims via `supabase.auth.getClaims()`.
- **RLS Policies:** Applied via Supabase migrations — ENABLE + FORCE RLS on all domain tables, SELECT/INSERT/UPDATE policies per table.

### ⚠️ RLS: Critical Rules

- **EVERY user query** must go through `withRLS(ctx, (tx) => ...)`. NEVER use `db` directly for user data — all multitenancy tables have `FORCE RLS`, so even the `postgres` superuser gets zero rows without the session config.
- `db` direct (no RLS) only for: Inngest background jobs cross-org, public queries (landing pages), and bootstrapping helpers that explicitly need to bypass scope.
- No hard DELETE. Soft delete = `UPDATE SET deleted_at = now()`. No GRANT DELETE on any table.
- `created_by_user_id` is NOT NULL on: properties, leads, appointments, ai_contents, lead_property_queue.
- Agent can only UPDATE own records (`created_by_user_id = sub`). Owner/admin can UPDATE anything in their org.

### ⚠️ DANGER: Never use `drizzle-kit push`

The database contains Supabase-managed schemas (`auth.*`, `storage.*`) not defined in Drizzle. `drizzle-kit push` would drop anything not in the Drizzle schema, destroying Supabase Auth users and storage metadata.

- **NEVER use `drizzle-kit push`** — `npm run db:push` exits with an error guard.
- **NEVER use `DROP SCHEMA CASCADE`** without verifying what it contains.
- For schema changes use ONLY: `drizzle-kit generate` + `drizzle-kit migrate`, or manual SQL via Supabase MCP.
- If `drizzle-kit generate` asks for TTY interactive, apply SQL manually and register the migration.

### Safe Drizzle Kit Commands

```bash
npx drizzle-kit generate   # Generate SQL migration (safe, only creates files)
npx drizzle-kit migrate    # Apply pending migrations (safe, only executes SQL)
npx drizzle-kit check      # Verify config (safe, read-only)
# FORBIDDEN: npx drizzle-kit push
```

## Tenancy & Auth Model

- **Pattern:** "Everything is an org" — every user belongs to at least one organization
- **Auth:** Supabase Auth + custom `public.*` multitenancy tables (organization, member, invitation, user_active_org, role_permissions)
- **`organization_id`** is `NOT NULL` on every domain table
- **Custom roles:** `owner` (1 per org), `admin` (N), `agent` (N) — enum `member_role` + `role_permissions` table
- **Plans:** `free` (1 member), `pro` (1 member), `enterprise` (N members) — plan lives on the org
- **Visibility:** Agents can see other agents' data in the same org (read-only, cannot edit)
- **Multi-org:** A user can belong to multiple orgs with different roles
- **Billing:** Paddle (MoR) + Payoneer (payout to Bolivia)
- **Full reference:** `docs/roles-and-permissions.md`

### Org Creation Flow

**DB trigger `handle_new_user()`** fires on INSERT to `auth.users`. Creates `organization` + `member (owner)` + `user_active_org` atomically (slug race-safe via nested EXCEPTION). Defined in `drizzle/sql/005_org_creation_trigger.sql`. No application-level fallback — if the trigger fails, session-context throws `[auth] JWT is missing active_org_id / org_role` to surface the infra failure instead of masking it with on-read creation.

**SECURITY DEFINER RPCs for RLS-crossing flows** (`drizzle/sql/007_rls_helpers_and_bootstrap.sql` + `008_accept_invitation_fixes.sql` + `009_check_user_exists_by_email.sql`):
- `public.bootstrap_organization(p_name, p_slug, p_email, p_name_user?, p_avatar_url?)` — subsequent-org creation for users who already have an `active_org_id`. Used by `createOrganizationAction` when a user adds another org. Validates slug format + uniqueness + email, inserts org + owner member + flips `user_active_org` atomically. Raises SQLSTATE 23505 `slug_taken`, 22023 `name_required`/`invalid_slug`/`email_required`, 28000 `not_authenticated`.
- `public.accept_invitation(p_token)` — invitation acceptance. Validates token, email match against `auth.jwt() ->> 'email'`, and expiry; then creates the member row (or restores a soft-deleted one) + flips `user_active_org` + marks the invitation accepted. Idempotent for already-active memberships. Raises 02000 `invitation_not_found`, 22023 `invitation_not_pending` / `invitation_expired`, 28000 `not_authenticated` / `email_missing` / `invitation_email_mismatch`.
- `public.check_user_exists_by_email(p_email)` — returns BOOLEAN. Used by the send-invitation flow to reject invites aimed at emails that do not have a Black Estate account (invitations are for existing users; onboarding newcomers happens through sign-up or the future referral link flow). Returns only a boolean — no metadata leaks.

All three are `SECURITY DEFINER` with `SET search_path = ''`, EXECUTE revoked from `anon`/`public`, granted only to `authenticated`. Mutations run against `auth.uid()` (never a caller-supplied id). Callers use `supabase.rpc('<name>', {...})` and map the raised `message` token to a domain error (see `translateBootstrapError` and `translateAcceptError` in the infrastructure repos).

**RLS policy addition** (`drizzle/sql/010_organization_select_via_pending_invitation.sql`): `organization_select_via_pending_invitation` grants SELECT on an `organization` row to an authenticated caller while they have a pending, non-expired invitation for it (email matched via `auth.email()`). Enables invitees to see the inviting org in a JOIN without being a member yet. Scoped to the invitation lifecycle; no write access.

### Auth Infrastructure

- **Server client**: `lib/supabase/server.ts` — `getSupabaseServerClient()` (per-request, cookie-aware) + `getSupabaseAdmin()` (service_role singleton).
- **Browser client**: `lib/supabase/client.ts` — `getSupabaseBrowserClient()` (singleton on `globalThis`).
- **Middleware helper**: `lib/supabase/middleware.ts` — `updateSupabaseSession(request)` returns `{ response, claims }`. Edge Runtime safe (no `server-only`).
- **Proxy**: `proxy.ts` (Next.js 16 naming, equivalent to `middleware.ts`). Refreshes session, redirects unauthed `/dashboard/*` → `/sign-in?next=X`, redirects authed `/sign-in|/sign-up` → `/dashboard`. Redirect responses copy refreshed cookies from the updated response.
- **Session context**: `features/shared/infrastructure/session-context.ts` — `getSessionContext()` (ctx only) and `getAuthState()` (`{ ctx, claims }` — use when UI also needs email/name/avatar). Both call `getClaims()` once.
- **Custom JWT claims** (injected by `custom_access_token` hook in `drizzle/sql/003`): `active_org_id`, `org_role`, `is_super_admin`, `user_name`. RLS policies and `rls.ts` read these.
- **Env var access**: ALWAYS use `requireSupabaseEnv(literal_name)` from `lib/supabase/env.ts`. The function uses a switch over LITERAL `process.env.NAME` accesses because Turbopack/Webpack only inline env vars on literal property access — dynamic `process.env[name]` returns `undefined` in the browser bundle.
- **Auth pages**: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` (grupo `(auth)`). `/auth/callback` (PKCE `exchangeCodeForSession`), `/auth/confirm` (token_hash `verifyOtp` — fix Gmail pre-fetch), `/auth-code-error`. OAuth via `signInWithOAuth({ provider: 'google' })`.

### Storage

- **Supabase Storage** via `@supabase/supabase-js` (server-side only). Helpers accept `SupabaseClient` as first param — callers pass authenticated client (RLS-enforced) or admin (Inngest).
- **Helpers:** `lib/supabase/storage.ts` — `uploadFile(client, ...)`, `uploadFiles`, `deleteFile`, `deleteFiles`, `getSignedUrl`
- **Buckets:** `property-media` (public, 10MB images), `avatars` (public, 2MB images), `brochures` (private, 20MB PDF)
- **Path format:** `{orgId}/{entityId}/{uuid}.{ext}` — org isolation via folder structure
- **RLS:** 10 policies on `storage.objects` — public SELECT for property-media/avatars, org-scoped writes
- **Image optimization:** `next.config.ts` dynamically adds Supabase hostname from `SUPABASE_URL` env var

## Project Structure

```
app/                        # Pages and layouts (App Router) — imports from features/*/presentation/
  dashboard/                # Dashboard pages
  p/[id]/                   # Public property landing pages
features/                   # Feature-based modules (Clean Architecture)
  shared/                   # Shared domain + infrastructure
    domain/                 # Value objects, shared interfaces
    infrastructure/         # rls.ts, session-context.ts
  properties/               # Property feature module
    domain/                 # Entity, repository interface
    application/            # Use cases
    infrastructure/         # Drizzle repository, mapper, model
    presentation/           # Server Actions, components
  leads/                    # Lead feature module
  appointments/             # Appointment feature module
  bot/                      # Bot feature module
  analytics/                # Analytics feature module
  ai-contents/              # AI content feature module
  settings/                 # Settings feature module
components/                 # Shared React components
  ui/                       # shadcn/ui base components
  landing/                  # Public landing components
  dashboard-header.tsx      # Shared dashboard components
hooks/                      # Shared React hooks
lib/
  db/                       # Database connection + Drizzle schemas
    schema/                 # Drizzle table definitions
    pool.ts                 # pg Pool
    index.ts                # Drizzle instance
  constants/                # App-wide constants, labels
  utils/                    # Pure utility functions
  validations/              # Zod schemas
docs/                       # Project documentation
```

## Configuration

- `next.config.ts` — Next.js config (image remotePatterns: unsplash)
- `eslint.config.mjs` — ESLint 9+ flat config extending `core-web-vitals` and `typescript`
- `tsconfig.json` — Strict mode enabled, target ES2017, bundler module resolution
- `components.json` — shadcn/ui config (new-york style, RSC enabled)

## Environment Variables

Listado de env vars actuales en `.env.local` (ver `.env.template`). Algunas son legacy y se borran en sub-plans futuros de la migración Supabase Auth.

| Variable | Uso | Exposición | Estado |
|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps embed | Browser | Activa |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Maps styled map | Browser | Activa |
| `NEXT_PUBLIC_APP_URL` | Base URL para OAuth redirect + invitation links | Browser | **Nueva (sub-plan 02)** |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente `@supabase/ssr` (browser + SSR) | Browser | **Nueva (sub-plan 02)** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente frontend Supabase (RLS-safe) | Browser | **Nueva (sub-plan 02)** |
| `SUPABASE_URL` | Admin client (Storage, admin ops) | Server-only | Activa |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (secret, bypasea RLS) | Server-only | Activa |
| `DATABASE_URL` | Drizzle pooled connection (app runtime) | Server-only | Activa |
| `DIRECT_URL` | Drizzle direct connection (migrations) | Server-only | Activa |
| `GOOGLE_CLIENT_ID` | OAuth Google (configurado en Supabase Dashboard → Auth Providers) | Server-only | Activa |
| `GOOGLE_CLIENT_SECRET` | OAuth Google secret (configurado en Supabase Dashboard) | Server-only | Activa |
| `BONEYARD_SESSION_TOKEN` | Dev tool — skeletons gen | Server-only | Dev only |

**Reglas:**
- `NEXT_PUBLIC_*` siempre se expone al browser — nunca meter secrets ahí.
- `SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_URL` tienen mismo valor — redundancia intencional (el browser no accede a env vars sin prefix público).
- Rotación de keys: `sb_secret_...` se rota desde Dashboard → Settings → API Keys sin downtime (múltiples keys activas a la vez).

## Key Decisions

- **Full stack:** `docs/tech-stack.md`
- **Implementation plan:** `docs/implementation-plan.md`
- **Roles and permissions:** `docs/roles-and-permissions.md`
- **Product language:** Spanish neutro con imperativo "tú" (haz, copia, ve — no voseo argentino). Formato fechas/moneda `es-BO` (Bolivia; dd/mm/yyyy). Evitar modismos regionales — el producto apunta a LATAM wide.
- **Code language:** Strict English — variables, enums, routes, files, schemas, ALL in English. Spanish ONLY for user-facing content (labels, messages). Mapping via `LABELS`/`MESSAGES` constants.
