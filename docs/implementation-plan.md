# Black Estate — Plan de Implementación

> Plan de ejecución granular para llevar Black Estate de frontend con datos mock a producto funcional con backend real.
>
> **Creado:** 2026-04-13
> **Estado:** En planificación. Ejecutar capa por capa en orden.

---

## Resumen de capas

| Capa | Nombre | Dependencias | Estado |
|------|--------|-------------|--------|
| 1 | Fundación (Auth + DB) | Ninguna | ⬜ Pendiente |
| 2 | Data Layer Real | Capa 1 | ⬜ Pendiente |
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
| 1.1.18 | Geolocalización en sessions | Enriquecer sessions con país, ciudad y dispositivo usando headers de Vercel (`x-vercel-ip-country`, etc.) | ⬜ (implementar en deploy a producción) |

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
| 2.1.1 | Elegir herramienta de migraciones | Drizzle ORM + Drizzle Kit (recomendado) o Supabase CLI | ⬜ |
| 2.1.2 | Extender tabla `organization` | Better Auth ya crea esta tabla. Agregar campos: `plan`, `max_seats`, `stripe_customer_id`, `logo_url` | ⬜ |
| 2.1.3 | Extender tabla `member` | Better Auth ya crea esta tabla. Verificar que los campos de role son suficientes | ⬜ |
| 2.1.4 | Diseñar tabla `properties` | Basarse en `lib/types/property.ts`: todos los campos del tipo `Property` | ⬜ |
| 2.1.5 | Diseñar tabla `property_media` | Diferida — media se almacena como `photos text[]`, `blueprints text[]`, `video_url`, `virtual_tour_url` en `properties`. Tabla separada con metadata por archivo se crea cuando se implemente Supabase Storage (tarea 2.3) | ⏭️ Diferida |
| 2.1.6 | Diseñar tabla `leads` | Basarse en `lib/types/lead.ts`: todos los campos del tipo `Lead` | ⬜ |
| 2.1.7 | Diseñar tabla `lead_property_queue` | `id`, `lead_id`, `property_id`, `status`, `sent_at`, `opened_at` | ⬜ |
| 2.1.8 | Diseñar tabla `appointments` | Basarse en `lib/types/bot.ts`: tipo `Appointment` | ⬜ |
| 2.1.9 | Diseñar tabla `bot_conversations` | `id`, `lead_id`, `org_id`, `status`, timestamps | ⬜ |
| 2.1.10 | Diseñar tabla `bot_messages` | `id`, `conversation_id`, `sender`, `content`, `content_type`, timestamps | ⬜ |
| 2.1.11 | Diseñar tabla `bot_config` | `id`, `org_id`, configuración del bot por organización | ⬜ |
| 2.1.12 | Diseñar tabla `analytics_events` | `id`, `org_id`, `event_type`, `metadata` (JSONB), `created_at` | ⬜ |
| 2.1.13 | Diseñar tabla `ai_contents` | `id`, `property_id`, `org_id`, `type`, `platform`, `content`, timestamps | ⬜ |
| 2.1.14 | Diseñar tabla `agent_profiles` | `id`, `user_id`, `org_id`, datos del perfil del agente | ⬜ |
| 2.1.15 | Escribir RLS policies | Policies para CADA tabla: filtrar por `org_id` usando `auth.jwt() -> 'org_id'` | ⬜ |
| 2.1.16 | Crear índices | Índices en `org_id`, `status`, `created_at` para queries frecuentes | ⬜ |
| 2.1.17 | Ejecutar migraciones | Correr las migraciones contra Supabase (dev y luego prod) | ⬜ |
| 2.1.18 | Seed data de desarrollo | Script de seed para tener datos de prueba en la DB real | ⬜ |

### 2.2 Reemplazar `/lib/data/` — Queries reales

| # | Tarea | Detalle | Estado |
|---|-------|---------|--------|
| 2.2.1 | Crear capa de acceso a datos | `lib/db/` con funciones que usan el cliente Supabase (o Drizzle) | ⬜ |
| 2.2.2 | Migrar `lib/data/properties.ts` | Reemplazar CRUD mock por queries reales: `getProperties()`, `getPropertyById()`, `createProperty()`, `updateProperty()`, `deleteProperty()` | ⬜ |
| 2.2.3 | Migrar `lib/data/leads.ts` | Reemplazar CRUD mock: `getLeads()`, `getLeadById()`, `createLead()`, `updateLeadStatus()`, queue operations | ⬜ |
| 2.2.4 | Migrar `lib/data/bot.ts` | Reemplazar mock: `getBotActivities()`, `getBotMessages()`, `getBotConfig()`, `updateBotConfig()` | ⬜ |
| 2.2.5 | Migrar `lib/data/analytics.ts` | Reemplazar mock: queries agregadas contra `analytics_events`, `leads`, `properties` | ⬜ |
| 2.2.6 | Migrar `lib/data/dashboard.ts` | Reemplazar mock: stats del dashboard con queries reales | ⬜ |
| 2.2.7 | Migrar `lib/data/ai-contents.ts` | CRUD real para contenido generado por IA | ⬜ |
| 2.2.8 | Migrar `lib/data/settings.ts` | CRUD real para configuración del agente/org | ⬜ |
| 2.2.9 | Migrar `lib/data/hashtags.ts` | CRUD real para la librería de hashtags | ⬜ |
| 2.2.10 | Actualizar Server Actions | `app/p/[id]/actions.ts` — conectar `submitLeadAction` y `trackVisitAction` a Supabase | ⬜ |
| 2.2.11 | Crear Server Actions nuevas | Actions para property CRUD, lead CRUD, bot config, etc. | ⬜ |
| 2.2.12 | Verificar tipos | Asegurar que los tipos en `lib/types/` matchean con el schema de DB | ⬜ |

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
