# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Black Estate** — SaaS B2B para el mercado inmobiliario LATAM. Next.js 16, React 19, TypeScript 5, Tailwind CSS 4. App Router architecture. Frontend MVP completo con datos mock (~160 componentes). Backend e infraestructura en construcción.

**Modelo de negocio:** Multi-tenant B2B. Agentes inmobiliarios individuales y agencias con equipos.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is configured yet.

## Architecture

- **Next.js App Router** with file-based routing in `app/`
- **Server Components by default** — add `"use client"` directive for client components
- **Tailwind CSS 4** via `@tailwindcss/postcss` plugin (configured in `postcss.config.mjs`)
- **Path alias:** `@/*` maps to the project root (e.g., `import Foo from "@/app/components/Foo"`)
- **Fonts:** Geist Sans and Geist Mono loaded via `next/font` with CSS variables
- **Dark mode:** CSS custom properties with `prefers-color-scheme` media queries in `app/globals.css`
- **UI Components:** shadcn/ui (Radix UI + Tailwind) in `components/ui/`
- **Charts:** Recharts in `components/analytics/charts/`
- **Forms:** react-hook-form + Zod validation
- **Tables:** @tanstack/react-table
- **Icons:** lucide-react
- **Skeletons:** Boneyard (`boneyard-js`) — TODO componente que carga datos async debe usar `<Skeleton>` de Boneyard. No usar placeholders hardcodeados ni texto de fallback. Correr `npx boneyard-js build` después de cambios en UI.

## Database Layer

- **ORM:** Drizzle ORM + Drizzle Kit para tablas de dominio
- **Conexión:** Pool compartido `pg` en `lib/db/pool.ts` (con guard `globalThis` para evitar leaks en dev)
- **Instancia Drizzle:** `lib/db/index.ts` exporta `db`
- **Schemas:** `lib/db/schema/` — un archivo por tabla, barrel en `index.ts`
- **Migraciones:** `drizzle/` — archivos `.sql` generados por Drizzle Kit
- **Config:** `drizzle.config.ts` apunta a `lib/db/schema/index.ts`
- **RLS:** `lib/db/rls.ts` exporta `withRLS()` — transaction wrapper que aplica `SET LOCAL role = 'authenticated'` + claims. Todas las queries de usuario DEBEN pasar por `withRLS()`.
- **Session Context:** `lib/db/session-context.ts` exporta `getSessionContext()` — extrae userId, orgId, role de Better Auth session.
- **RLS Policies:** `drizzle/0002_rls_policies.sql` — ENABLE + FORCE RLS en todas las tablas de dominio, policies SELECT/INSERT/UPDATE por tabla.

### ⚠️ RLS: Reglas Críticas

- **TODA query de usuario** debe pasar por `withRLS(ctx, (tx) => ...)`. NUNCA usar `db` directo para datos de usuario.
- `db` directo (sin RLS) solo para: Better Auth internals, Inngest background jobs cross-org, `getSessionContext()`.
- No existe hard DELETE. Soft delete = `UPDATE SET deleted_at = now()`. No hay GRANT DELETE en ninguna tabla.
- `created_by_user_id` es NOT NULL en: properties, leads, appointments, ai_contents, lead_property_queue.
- Agent solo puede UPDATE sus propios registros (`created_by_user_id = sub`). Owner/admin pueden UPDATE todo en su org.

### ⚠️ PELIGRO: Drizzle Kit + Better Auth coexisten en la misma DB

Better Auth maneja sus propias tablas (`user`, `session`, `account`, `organization`, `member`, `invitation`, `verification`) que NO están definidas en los schemas de Drizzle. Esto significa:

- **NUNCA usar `drizzle-kit push`** — elimina tablas que no están en Drizzle, destruyendo TODAS las tablas de Better Auth y los datos de usuarios/organizaciones.
- **NUNCA usar `DROP SCHEMA CASCADE`** sin verificar qué contiene.
- Para cambios de schema usar SOLO: `drizzle-kit generate` + `drizzle-kit migrate`, o SQL manual via Supabase MCP.
- Si `drizzle-kit generate` pide TTY interactivo, aplicar SQL manualmente y registrar la migración.

### Comandos seguros de Drizzle Kit

```bash
npx drizzle-kit generate   # Genera migración SQL (seguro, solo crea archivos)
npx drizzle-kit migrate    # Aplica migraciones pendientes (seguro, solo ejecuta SQL)
npx drizzle-kit check      # Verifica config (seguro, read-only)
# PROHIBIDO: npx drizzle-kit push
```

## Tenancy & Auth Model

- **Patrón:** "Everything is an org" — todo usuario pertenece a al menos una organización
- **Auth:** Better Auth (open source) con Organization Plugin + Supabase (Postgres)
- **`organization_id`** es `NOT NULL` en toda tabla de dominio
- **Roles custom:** `owner` (1 por org), `admin` (N), `agent` (N) — definidos en Better Auth Organization Plugin
- **Planes:** `free` (1 miembro), `pro` (1 miembro), `enterprise` (N miembros) — plan vive en la org
- **Visibilidad:** Agentes pueden ver datos de otros agentes de la misma org (read-only, no editar)
- **Multi-org:** Un usuario puede pertenecer a múltiples orgs con roles distintos
- **Billing:** Paddle (MoR) + Payoneer (payout a Bolivia)
- **Referencia completa:** `docs/roles-and-permissions.md`

## Project Structure

```
app/                    # Pages and layouts (App Router)
  dashboard/            # Dashboard pages (properties, leads, bot, analytics, etc.)
  p/[id]/               # Public property landing pages
components/             # React components
  ui/                   # shadcn/ui base components
  properties/           # Property domain components
  contacts/             # Lead/contact domain components
  analytics/            # Charts and analytics components
  bot/                  # Bot configuration components
  ai/                   # AI marketing components
  landing/              # Public property landing components
  settings/             # Settings components
  maps/                 # Google Maps components
hooks/                  # Custom React hooks
lib/
  types/                # TypeScript type definitions
  constants/            # Application constants
  data/                 # Mock data layer (to be replaced with Supabase)
  utils/                # Utility functions
  validations/          # Zod schemas
docs/                   # Project documentation
  tech-stack.md         # Stack decisions and rationale
  implementation-plan.md # Granular implementation plan
  roles-and-permissions.md # Tenancy, roles, and permissions design
```

## Configuration

- `next.config.ts` — Next.js config (image remotePatterns: unsplash)
- `eslint.config.mjs` — ESLint 9+ flat config extending `core-web-vitals` and `typescript`
- `tsconfig.json` — Strict mode enabled, target ES2017, bundler module resolution
- `components.json` — shadcn/ui config (new-york style, RSC enabled)

## Key Decisions

- **Stack completo:** `docs/tech-stack.md`
- **Plan de implementación:** `docs/implementation-plan.md`
- **Roles y permisos:** `docs/roles-and-permissions.md`
- **Idioma del producto:** Español (es-AR para formateo de fechas y moneda)
- **Idioma del código:** Inglés estricto — variables, enums, rutas, archivos, schemas, TODO en inglés. Español SOLO para contenido visible al usuario final (labels, mensajes). Mapeo vía constantes `LABELS`/`MESSAGES`.
