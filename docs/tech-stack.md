# Black Estate — Stack Tecnológico

> Documento de referencia con todas las decisiones de stack tomadas para Black Estate, las razones detrás de cada elección, costos esperados y rol de cada pieza dentro del producto.
>
> **Última actualización:** 2026-04-11
> **Estado:** Stack cerrado para MVP. Las decisiones de evolución futura están al final del documento.

---

## 1. Contexto del producto

**Black Estate** es una plataforma SaaS B2B para el mercado inmobiliario LATAM. Ofrece a agentes inmobiliarios y a inmobiliarias completas un sistema integrado de:

- Gestión de propiedades (CRUD, multimedia, GPS, status).
- CRM de leads con scoring y atribución de fuente.
- Bot conversacional WhatsApp 24/7 que califica leads y agenda citas.
- Generador de contenido y brochures con IA.
- Landings públicas de propiedades con tracking de canal.
- Analítica avanzada (marketing, leads, propiedades, conversión, finanzas).
- Sistema de citas con calendario.
- Módulo financiero (comisiones, ROI, rentabilidad).

**Modelo de tenancy:** multi-tenant con soporte dual para agente individual (organización de 1 miembro) y agencias con múltiples agentes (organización con roles `owner`/`admin`/`agent`). Single DB en Supabase con Better Auth Organization Plugin para identidad, roles y permissions.

**Etapa actual:** MVP. Frontend completo con datos mock; backend e infraestructura en construcción.

**Perfil del equipo:** Solo founder bootstrapped, mercado LATAM, presupuesto ajustado, prioridad absoluta en velocidad de envío.

---

## 2. Resumen ejecutivo del stack

| Categoría                    | Herramienta                       | Costo MVP | Rol principal                                          |
| ---------------------------- | --------------------------------- | --------- | ------------------------------------------------------ |
| Hosting & runtime            | **Vercel**                        | $0        | Deploy del Next.js + edge/serverless functions         |
| Base de datos                | **Supabase** (Postgres)           | $0–25/mes | DB + Storage + Realtime + RLS                          |
| Autenticación e identidad    | **Better Auth** (open source)     | $0        | Users, organizations, roles custom, invitaciones       |
| Email transaccional          | **Resend**                        | $0        | Envío de emails desde el producto                      |
| Templates de email           | **React Email**                   | $0        | Composición de templates en JSX                        |
| Notificaciones multi-canal   | **Knock**                         | $0        | Orquestación in-app + email + push + preferencias      |
| Monitoreo de errores         | **Sentry**                        | $0        | Error tracking + performance monitoring                |
| Product analytics            | **PostHog**                       | $0        | Eventos, funnels, recordings, flags, web analytics     |
| Customer support             | **Crisp**                         | $0        | Inbox unificado (chat web + WhatsApp + email)          |
| Marketing site               | **Next.js** (mismo proyecto)      | $0        | Landing pública, blog, pricing                         |
| LLM                          | **Claude Haiku 4.5** (Anthropic)  | ~$10–50/mes | Modelo de IA para bot, copy, brochures              |
| LLM SDK                      | **Vercel AI SDK**                 | $0        | Wrapper TypeScript con streaming y server actions      |
| Background jobs / workflows  | **Inngest**                       | $0        | Jobs durables, colas, webhooks, schedulers             |
| Testing automatizado         | **TestSprite**                    | $0        | AI testing agent: genera, ejecuta y debuggea tests     |
| Billing / MoR                | **Paddle**                        | $0        | Merchant of Record, suscripciones, tax compliance      |
| Payouts                      | **Payoneer**                      | $0        | Recepción de pagos de Paddle en Bolivia                |

**Costo total estimado en MVP:** **$10–75 / mes** (todo en free tier excepto el uso del LLM y opcionalmente Supabase Pro). Paddle cobra 5% + $0.50 por transacción (sin costo fijo mensual).

---

## 3. Arquitectura general

```
                ┌─────────────────────┐
                │   Vercel (Next.js)  │
                │   - App + Marketing │
                │   - Edge functions  │
                │   - API routes      │
                └──────────┬──────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐   ┌──────────────┐
│ Better Auth │    │   Supabase   │   │   Inngest    │
│ Auth + Orgs │───►│  Postgres    │   │  Background  │
│ (in-app)    │    │  + Storage   │   │  jobs        │
└─────────────┘    │  + Realtime  │   └──────┬───────┘
                   └──────────────┘          │
                                             ▼
                                  ┌─────────────────────┐
                                  │ Anthropic (Haiku)   │
                                  │ Resend, Knock,      │
                                  │ WhatsApp/Meta APIs  │
                                  └─────────────────────┘

Observabilidad transversal: Sentry (errores) + PostHog (analytics)
Soporte: Crisp (inbox unificado de clientes)
```

**Flujo principal de auth y datos:**

1. Usuario hace sign-in en el app Next.js → Better Auth valida credenciales y crea session en Postgres.
2. Las API routes y Server Actions usan `auth.api.getSession()` para verificar la session y obtener user/org context.
3. Las queries contra Supabase Postgres se ejecutan via Drizzle ORM, filtrando por `organization_id` de la session activa.
4. Las tablas de auth (`user`, `session`, `account`, `organization`, `member`, `invitation`) viven directamente en Postgres — sin webhooks ni sincronización.
5. Eventos del producto (lead nuevo, cita agendada, mensaje del bot) disparan funciones Inngest.
6. Inngest llama a Claude Haiku via Vercel AI SDK, envía notificaciones via Knock, escribe resultados en Supabase.

---

## 4. Detalle por herramienta

---

### 4.1 Vercel — Hosting y runtime

**Qué es.** Plataforma de hosting y runtime serverless construida específicamente para Next.js. Provee deploys automáticos desde Git, edge functions globales, image optimization, ISR (Incremental Static Regeneration), preview deployments por pull request, dominios custom y CDN integrado.

**Rol en Black Estate.** Es el host del proyecto Next.js completo: tanto la app del producto (`/dashboard/*`) como el sitio de marketing (`/`, `/features`, `/pricing`). Las API routes y server actions de Next.js corren como serverless/edge functions y manejan toda la lógica de negocio del MVP: webhooks de WhatsApp/Meta, integraciones con terceros, llamadas al LLM, mutaciones contra Supabase.

**Por qué la elegimos.**
- Vercel construye Next.js. Cada feature nueva del framework (Server Components, Server Actions, Partial Prerendering, Cache API) sale primero optimizada para Vercel.
- Image optimization, ISR, edge middleware y streaming SSR funcionan out-of-the-box, sin configuración.
- Preview deployments por PR son críticos cuando un solo dev necesita validar UX rápido y compartir avances.
- Marketplace integration con Supabase (env vars auto-inyectadas) y con otros servicios del stack.
- Free tier (Hobby) genuinamente usable durante toda la fase pre-launch.

**Costo.**
- **Hobby:** $0/mes — adecuado para MVP y hasta primeras docenas de usuarios beta.
- **Pro:** $20/mes por miembro — necesario al lanzar a producción real (analytics avanzados, password protection, mayor compute, soporte por email).
- **Enterprise:** custom — no aplica en años.

**Notas técnicas.**
- Configurar dominios `blackestate.com` (root, sirve marketing) y `app.blackestate.com` (sub, sirve dashboard) si se decide separar; o servir todo desde un solo dominio con route groups en Next.js.
- Edge functions vs serverless functions: usar edge para requests sensibles a latencia (auth checks, redirects), serverless para todo lo que toque DB o haga llamadas externas.

---

### 4.2 Supabase — Base de datos, storage y realtime

**Qué es.** Plataforma backend-as-a-service open source construida sobre Postgres. Bundle de Postgres + autenticación + storage de archivos + suscripciones realtime + edge functions + dashboard. Self-hosteable como escape hatch.

**Rol en Black Estate.** Es la base de datos primaria del producto. Almacena todas las entidades del dominio: `organizations`, `memberships`, `properties`, `leads`, `appointments`, `bot_conversations`, `analytics_events`, etc. También maneja:
- **Storage**: fotos de propiedades, brochures PDF generados, avatars, planos.
- **Realtime**: suscripciones para métricas en vivo del dashboard (leads entrando, mensajes del bot llegando, conteos de visitas).
- **Row-Level Security**: enforcement de multitenancy a nivel base de datos via políticas RLS.

**Por qué la elegimos.**
- Bundling de DB + Storage + Realtime + RLS en una sola plataforma reduce drásticamente el código glue para un solo dev.
- **Realtime** vía replicación lógica de Postgres es clave para los dashboards en vivo del producto (un agente quiere ver leads entrando sin recargar).
- **Storage con RLS unificada**: las mismas políticas de permisos de la DB aplican a los archivos. Un solo modelo mental.
- Postgres puro: bajo lock-in, `pg_dump` y migrás a cualquier Postgres del mundo.
- Self-hosteable como escape hatch a largo plazo.

**Costo.**
- **Free:** $0/mes — 500 MB DB, 1 GB storage, 50k MAU. Suficiente para fase inicial.
- **Pro:** $25/mes — 8 GB DB, 100 GB storage, 100k MAU, daily backups, no pausing. Recomendado al pasar a producción real.
- **Team:** $599/mes — solo aplica con tracción seria (cumplimiento, SOC2, etc.).

**Notas técnicas.**
- Connection pooling: usar **Supavisor** (incluido) en modo `transaction` para Vercel serverless.
- Migraciones: gestionadas con Better Auth CLI (`npx auth migrate`) y Drizzle Kit para tablas de dominio.
- Better Auth se conecta directamente a Postgres via `pg.Pool` — no usa el cliente `@supabase/supabase-js` para auth.

---

### 4.3 Better Auth — Autenticación, organizations y roles

**Qué es.** Librería open source de autenticación y autorización para TypeScript. Framework-agnostic, con ecosistema de plugins para organizations, 2FA, SSO, y más. Se conecta directamente a tu base de datos (Postgres, MySQL, SQLite, MongoDB). Respaldada por $5M de Y Combinator.

**Rol en Black Estate.** Es la **fuente de verdad para identidad, organizations, roles y permissions**. Maneja:
- Sign-up, sign-in, password reset, verificación de email.
- OAuth con Google y Apple.
- **Organization Plugin**: cada agente individual obtiene una org personal de 1 miembro con rol `owner`; cada inmobiliaria es una org con N miembros y roles diferenciados.
- **Roles custom**: `owner` (full + billing), `admin` (full producto, sin billing), `agent` (operativo).
- **Permissions granulares**: ~20 permissions sobre 7 recursos (property, lead, analytics, bot, settings, billing, org).
- **Invitaciones**: flujo email → token → join.
- **Session management**: cookies con soporte para Server Components y Server Actions via `nextCookies` plugin.

**Por qué la elegimos.**
- **$0 para siempre**: roles custom, permissions, organizations, invitaciones — todo gratis, sin add-ons ni límites de MAU.
- **Organization Plugin completo**: el modelo dual "agente solo / agencia con equipo" con roles custom y RBAC granular funciona out-of-the-box.
- **Sin vendor lock-in**: las tablas viven en nuestra DB (Supabase Postgres), el código vive en nuestro repo. Controlamos todo.
- **Open source**: Apache 2.0, comunidad activa, MCP Server y Skills para AI agents.
- **Framework integration**: soporte nativo para Next.js 16 (App Router, Server Actions, proxy).

**Costo.** $0 — es open source. Sin límites de MAU, orgs, ni features detrás de paywall.

**Notas técnicas.**
- Instancia server en `lib/auth.ts`, cliente React en `lib/auth-client.ts`.
- Roles y permissions definidos en `lib/auth-permissions.ts` usando `createAccessControl()`.
- API route handler en `app/api/auth/[...all]/route.ts`.
- Proxy (Next.js 16) en `proxy.ts` protegiendo `/dashboard/*`.
- Las tablas de auth (`user`, `session`, `account`, `organization`, `member`, `invitation`) se crean con `npx auth migrate`.
- Para el flujo "agente individual": hook `afterCreate` en sign-up que crea automáticamente una org personal con rol `owner`.

---

### 4.4 Resend — Email transaccional

**Qué es.** API moderna de envío de emails transaccionales, construida por el equipo que también hace React Email. Foco en developer experience: SDKs limpios, dashboard claro, deliverability monitoreada, manejo de bounces y complaints, soporte para domains custom con DKIM/SPF/DMARC.

**Rol en Black Estate.** Es el provider de envío para **todos los emails transaccionales del producto**. Específicamente:
- Notificación "tienes un lead nuevo" al agente.
- Recordatorio de cita 2h antes (al agente y al cliente).
- Reporte semanal de actividad por agente.
- Invitaciones a unirse a una agencia.
- Comprobantes y facturas (cuando llegue el módulo de billing).
- Cualquier otro email transaccional.

Resend se conecta a **Knock** como provider del canal email — la mayoría de envíos pasan por Knock para respetar preferencias del usuario; los pocos sistemáticos (comprobantes) van directo a Resend.

**Por qué la elegimos.**
- Mejor DX del mercado en su categoría: `await resend.emails.send({ react: <Template /> })` literal.
- Hecho por el mismo equipo que React Email → integración perfecta entre composición y envío.
- Free tier generoso (3k/mes + 100/día).
- Conexión nativa con Knock como provider — sin código glue.

**Costo.**
- **Free:** $0/mes — 3.000 emails/mes + 100/día. Suficiente para todo el MVP.
- **Pro:** $20/mes — 50.000 emails/mes, dominios custom ilimitados.
- **Scale:** $90/mes en adelante para volúmenes mayores.

**Notas técnicas.**
- Verificar el dominio (`mail.blackestate.com` o similar) con DKIM/SPF/DMARC para evitar caer en spam.
- Resend respeta el header `X-Entity-Ref-ID` para tracking de eventos.

---

### 4.5 React Email — Templates de email en JSX

**Qué es.** Librería open source de componentes React especializados para construir emails responsive y compatibles con clientes de email (Gmail, Outlook, Apple Mail, etc.). Provee primitivas (`<Container>`, `<Heading>`, `<Text>`, `<Button>`, `<Img>`) que renderizan a HTML compatible con la maraña de quirks de los clientes de email.

**Rol en Black Estate.** Es el sistema de **composición** de todos los templates de email del producto. Los templates viven en `emails/` (o similar) como archivos `.tsx` que se renderizan en runtime cuando Resend o Knock los necesitan.

Templates esperados:
- Welcome email post-signup.
- Lead nuevo notification.
- Recordatorio de cita.
- Reporte semanal.
- Invitación a unirse a una agencia.
- Reset de password.

**Por qué la elegimos.**
- Mismo mental model que el resto del proyecto (React + JSX + Tailwind-like styling).
- Hecho por el equipo de Resend → integración 1ra clase.
- Templates pre-construidos open source que sirven como punto de partida (welcome, OTP, receipt, alert).
- Permite preview local antes de enviar (`react-email dev`).

**Costo.** Gratis. Es una librería open source.

**Notas técnicas.**
- Los componentes se renderizan a HTML inline-styled compatible con clientes de email.
- No usa Tailwind clases directamente — tiene su propio sistema de styling, similar pero adaptado.
- Permite preview local con un servidor de desarrollo (`npm run email`).

---

### 4.6 Knock — Notificaciones multi-canal

**Qué es.** Plataforma de orquestación de notificaciones multi-canal para SaaS. Centraliza la lógica de "qué notificación, a quién, por qué canal, con qué template, respetando qué preferencias". Soporta email (vía providers como Resend), in-app feeds, push, SMS, Slack y webhooks. Provee dashboard para definir workflows, gestionar templates, ver entregas y métricas.

**Rol en Black Estate.** Es la **capa de orquestación** entre el código del producto y todos los canales de notificación. El producto dispara eventos al estilo `knock.workflows.trigger('new_lead', { user, data })` y Knock decide:
- Por qué canales notificar (email, in-app, push, etc.) según las preferencias del usuario.
- Cuándo (respeta do-not-disturb, batching, digesting).
- Con qué template (vincula al template de React Email apropiado).
- Vía qué provider (Resend para email, su propio sistema para in-app, etc.).

Eventos esperados:
- `new_lead` — agente recibe notificación cuando entra un lead nuevo.
- `appointment_confirmed` — cliente y agente reciben confirmación de cita.
- `appointment_reminder_2h` — recordatorio 2 horas antes.
- `weekly_report` — reporte semanal del agente.
- `bot_conversation_handoff` — cuando el bot escala a humano.
- `team_invitation` — invitación a unirse a una agencia.

Además provee el componente `<NotificationFeed />` (in-app campanita) que reemplaza la necesidad de construir una tabla `notifications` propia + suscripción Realtime.

**Por qué la elegimos.**
- Cubre desde MVP los flujos multi-canal con preferencias por usuario que de otra forma habría que construir manualmente.
- Componente in-app feed listo para usar — ahorra trabajo de UI.
- Integración nativa con Resend como provider de email.
- Alineado con la preferencia "buy over build" — Gonzalo prefiere usar una solución pre-hecha.

**Costo.**
- **Developer:** $0/mes — hasta 10.000 notificaciones/mes, 1.000 MAU.
- **Starter:** ~$99/mes (precio aproximado, varía) — ~25.000 notifs/mes, MFAs, in-app feeds.
- **Scale:** custom según volumen.

**Notas técnicas.**
- En Knock, Resend se configura como Email Channel Provider con la API key.
- Los templates pueden definirse en Knock UI o referenciarse desde código (preferible: vivir en el repo como componentes React Email).
- Para el feed in-app: instalar `@knocklabs/react`, usar `<NotificationFeedProvider>` y `<NotificationFeed />`.

---

### 4.7 Sentry — Monitoreo de errores

**Qué es.** Plataforma de error tracking y performance monitoring para aplicaciones. Captura excepciones del frontend y backend con stack traces enriquecidos, contexto del usuario, breadcrumbs de las acciones previas al error, y permite alertas en tiempo real (Slack, email).

**Rol en Black Estate.** Captura errores en producción de:
- Frontend Next.js (React error boundaries, errores de runtime en browser).
- Backend (API routes, Server Actions, Edge functions).
- Inngest functions (workflows que fallan).
- Webhooks (Meta/WhatsApp, Paddle).

Cada error se enriquece con `userId`, `organizationId`, feature/route, y se alertan los críticos a Slack o email. Es la red de seguridad para no perder bugs silenciosos siendo solo dev.

**Por qué la elegimos.**
- No-negociable desde día 1: sin esto, los bugs en producción se descubren cuando un usuario se queja (tarde).
- Integración oficial con Next.js (`@sentry/nextjs`), incluye instrumentation automática.
- Free tier suficiente para MVP.
- Dashboard limpio, alertas confiables, replay de sesiones (en planes pagos).

**Costo.**
- **Developer:** $0/mes — 5.000 errors + 10.000 performance units + 50 replays.
- **Team:** $26/mes — más volumen, retention 90 días.
- **Business:** $80/mes — custom dashboards, SAML, etc.

**Notas técnicas.**
- Configurar `sentry.client.config.ts`, `sentry.server.config.ts` y `sentry.edge.config.ts`.
- Source maps subidos automáticamente en build de Vercel.
- Tags custom: `userId`, `organizationId`, `feature`.
- Instrumentar también las Inngest functions vía middleware.

---

### 4.8 PostHog — Product analytics, flags y recordings

**Qué es.** Plataforma open source de product analytics todo-en-uno. Combina event tracking, funnels, retention cohorts, feature flags, A/B tests, session replay, heatmaps y web analytics en una sola herramienta. Cloud-hosted o self-hosteable.

**Rol en Black Estate.** Es el cerebro de **todo lo que hay que medir** del producto:
- **Eventos**: `landing_view`, `signup_started`, `signup_completed`, `property_created`, `lead_received`, `bot_message_sent`, `appointment_booked`, `deal_won`.
- **Funnels**: medición del funnel core `landing → form filled → lead created → bot conversation → appointment → deal`.
- **Retention**: cohorts de usuarios activos por semana/mes.
- **Feature flags**: gating por plan (`free` vs `pro` vs `enterprise`), releases progresivos sin redeploy, kill switches para features riesgosas.
- **Session recordings**: para entender por qué un agente abandonó el wizard de carga de propiedad.
- **Heatmaps**: para optimizar la landing y el dashboard.
- **Web analytics**: tracking del sistema de links segmentados (`/p/[id]?src=facebook|instagram|tiktok|whatsapp`).
- **A/B tests**: experimentar copy, layouts, flujos de onboarding.

**Por qué la elegimos.**
- Colapsa 4-5 herramientas distintas (Mixpanel + Plausible + LaunchDarkly + FullStory) en una sola.
- Free tier muy generoso (1M eventos/mes + 5k recordings/mes).
- Integración con Better Auth: pasa `userId` y `organizationId` a cada evento, permitiendo segmentación por org.
- Open source — escape hatch a self-host si llegara el caso.

**Costo.**
- **Free:** $0/mes — 1M eventos/mes + 5k recordings/mes + flags ilimitados.
- **Paid (usage-based):** comienza ~$0.00031 por evento adicional. Para 5M eventos/mes: ~$50–100/mes.

**Notas técnicas.**
- SDK: `posthog-js` para frontend, `posthog-node` para backend.
- Configurar identification con `posthog.identify(userId, { organizationId, plan, ... })`.
- Feature flags se evalúan client-side (rápido) o server-side (consistente con SSR).
- Session recordings respetan privacidad enmascarando inputs por defecto.

---

### 4.9 Crisp — Customer support

**Qué es.** Plataforma de customer messaging que ofrece chat widget para sitios web, inbox compartido para equipo, integración multi-canal (WhatsApp, email, Messenger, Telegram), knowledge base pública, chatbot y app móvil para atender desde el celular.

**Rol en Black Estate.** Es el inbox unificado para soporte de los **clientes de pago** (los agentes inmobiliarios). Centraliza:
- Chat widget en el dashboard del producto.
- Chat widget en las landing públicas de propiedades (`/p/[id]`).
- WhatsApp Business connection para que los agentes puedan escribir directo desde su WhatsApp.
- Email a `support@blackestate.com` que cae en el mismo inbox.
- Knowledge base pública para FAQs.

Importante distinguir: Crisp atiende a los **agentes (clientes de Black Estate)**. El bot WhatsApp del producto, que atiende a los **leads finales (clientes de los agentes)**, es un sistema distinto construido con Claude Haiku + Inngest + Meta WhatsApp Business API.

**Por qué la elegimos.**
- Free tier real y usable (2 seats, conversaciones ilimitadas).
- UI y soporte propio en español → crítico para LATAM.
- Integración WhatsApp nativa.
- App móvil decente (iOS/Android) para atender siendo solo founder.
- Knowledge base incluida en el plan free.

**Costo.**
- **Basic:** $0/mes — 2 seats, conversaciones ilimitadas, 1 chatbot.
- **Pro:** $25/mes/workspace — triggers, automations, MagicReply IA, 4 seats.
- **Unlimited:** $95/mes/workspace — todo desbloqueado.

**Notas técnicas.**
- Instalar el snippet de Crisp en el layout del dashboard y de las landings públicas.
- Configurar identification para pasar `userId`, `email` y plan al chat — Crisp lo asocia al historial.
- Conectar WhatsApp Business desde el dashboard de Crisp (requiere número verificado).

---

### 4.10 Next.js — Marketing site (mismo proyecto)

**Qué es.** Framework de React construido por Vercel. App Router, Server Components, Server Actions, Streaming SSR, Image Optimization, ISR, Middleware. Ya en uso para todo el producto Black Estate.

**Rol en Black Estate (sección marketing).** El sitio público de marketing (`/`, `/features`, `/pricing`, `/about`, `/blog`) se construye **dentro del mismo proyecto Next.js existente**, en un route group `app/(marketing)/...` que tiene su propio layout (sin sidebar de dashboard, con nav público, footer marketing). Reusa el design system `components/ui/*` con shadcn + Tailwind 4 para mantener coherencia visual con el producto.

**Por qué se construye acá y no en Framer/Webflow.**
- Black Estate ya tiene **~160 componentes** en shadcn + Tailwind 4 listos para componer la landing.
- Para un dev con design system existente, "build" en Next.js es composición sobre piezas existentes, no construcción desde cero.
- Una sola codebase, un solo deploy, un solo dominio (mejor SEO).
- A/B tests del hero/pricing vía PostHog Feature Flags sin redeploy.
- $0 incremental, cero curva de aprendizaje.
- La regla "buy over build" aplica a features de producto complejas (auth, notificaciones), NO a composición de páginas sobre design system existente.

**Costo.** $0 incremental — ya está incluido en Vercel.

**Notas técnicas.**
- Estructura: `app/(marketing)/page.tsx`, `app/(marketing)/pricing/page.tsx`, etc.
- Layout marketing distinto al de dashboard (compartido en `app/(marketing)/layout.tsx`).
- Blog: empezar con MDX local; evaluar Sanity/Contentlayer solo si crece la complejidad editorial.

---

### 4.11 Claude Haiku 4.5 — LLM provider

**Qué es.** Modelo de lenguaje de Anthropic, parte de la familia Claude 4.5. Haiku es la variante optimizada para velocidad y costo, manteniendo calidad alta en tareas conversacionales y de generación de texto. Particularmente fuerte en español y en conversaciones largas.

**Rol en Black Estate.** Es el **cerebro de todas las funcionalidades de IA** del producto:

- **Bot WhatsApp con leads** — calificación, FAQs, resolución de dudas, agendamiento de citas, follow-up.
- **Generador de descripciones** de propiedades en estilo profesional inmobiliario.
- **Generador de copy multi-plataforma** — versiones específicas para Facebook (largo), Instagram (corto + hashtags), TikTok (script de video), WhatsApp (mensaje directo).
- **Generador de texto para brochures PDF**.
- **Resúmenes automáticos** de conversaciones del bot ("este lead pidió zona X, presupuesto Y, urgencia Z").
- **Mejora de descripciones** existentes (botón "Optimizar con IA").

**Por qué la elegimos.**
- **Costo bajo**: ~3-5x más barato que GPT-4o por la mayoría de tareas similares.
- **Velocidad alta**: latencia significativamente menor que modelos premium → mejor UX en streaming de respuestas del bot.
- **Excelente en español**: Anthropic se ha enfocado en multilingüe; Haiku 4.5 tiene calidad muy alta en LATAM Spanish.
- **Conversaciones largas**: el bot WhatsApp puede tener histories largas; Haiku las maneja bien sin degradar.
- **Vía Vercel AI SDK**: el swap a otro modelo (Sonnet, Opus, GPT-4o, Gemini) es trivial el día que se necesite.

**Costo.**
- **Pay-per-token**: precios aproximados en USD por millón de tokens (verificar dashboard de Anthropic para precios actuales).
  - Input: ~$0.80 / 1M tokens
  - Output: ~$4.00 / 1M tokens
- **Estimación MVP** (con uso moderado del bot): **$10–50/mes**.
- **Estimación a 1.000 tenants activos**: $200–800/mes.

**Notas técnicas.**
- Modelo ID: `claude-haiku-4-5`.
- Acceso vía API key de Anthropic (no via OpenAI).
- Para casos donde Haiku no alcance (razonamiento muy complejo), evaluar Sonnet — el SDK permite el swap por feature.
- Rate limits: respetarlos vía retry con backoff (Inngest lo hace automático).

---

### 4.12 Vercel AI SDK — Wrapper TypeScript para LLMs

**Qué es.** SDK open source de Vercel que abstrae múltiples providers de LLM (Anthropic, OpenAI, Google, Mistral, Groq, etc.) bajo una API unificada. Provee streaming token-por-token, integración con React (`useChat`, `useCompletion`), helpers para Server Actions, soporte para tool calling, y capa de tipos TypeScript estricta.

**Rol en Black Estate.** Es la **capa de aplicación** entre el código del producto y Claude Haiku. Toda llamada al LLM pasa por el SDK:

```ts
import { generateText, streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const result = await streamText({
  model: anthropic('claude-haiku-4-5'),
  prompt: '...',
})
```

Casos de uso del SDK:
- `streamText` para respuestas del bot WhatsApp en streaming.
- `generateText` para generación de copy de marketing.
- `useChat` (React hook) para cualquier interfaz de chat dentro del dashboard.
- Tool calling para que el bot pueda invocar funciones (consultar propiedades, agendar cita, etc.).

**Por qué la elegimos.**
- **Provider-agnostic**: cambiar de Claude Haiku a Sonnet, GPT-4o, Gemini Flash, etc. es **una línea de código**. Crítico para evitar lock-in.
- **Diseñado para Next.js 16**: hooks de React nativos, Server Actions, RSC streaming.
- **Streaming first-class**: respuestas token-por-token sin código glue.
- **Tool calling estandarizado**: el bot puede llamar a funciones del producto de forma uniforme independiente del modelo subyacente.
- Open source, mantenido por Vercel, ampliamente adoptado.

**Costo.** Gratis — es una librería open source. El único costo es el del LLM subyacente (Anthropic).

**Notas técnicas.**
- Packages: `ai` (core) + `@ai-sdk/anthropic` (provider).
- Integración con Inngest: las llamadas al LLM se envuelven dentro de Inngest functions para retry automático ante rate limits.
- Tipado fuerte: los tools/funciones se definen con esquemas Zod.

---

### 4.13 Inngest — Background jobs y workflows durables

**Qué es.** Plataforma de workflow durable y background jobs code-first para TypeScript/Python. Define funciones en tu codebase, Inngest las ejecuta de forma confiable: retries con backoff, scheduling, fan-out, throttling, dead-letter queues, replay desde dashboard, observabilidad. Sin servidor que mantener — es SaaS.

**Rol en Black Estate.** Es la **capa de orquestación de todo lo asíncrono y todo lo que debe ser confiable**. Todos los workflows técnicos del producto son Inngest functions:

| Workflow                                                          | Tipo                |
| ----------------------------------------------------------------- | ------------------- |
| Cola "envía propiedades poco a poco al lead" (descrito en specs)  | Throttled job       |
| Recordatorio de cita 2h antes (cliente y agente)                  | Scheduled job       |
| Webhook Paddle → sync plan/subscription                           | Event-driven        |
| Webhook WhatsApp/Meta → procesar mensaje entrante                 | Event-driven        |
| Optimización/resize async de fotos cargadas                       | Fan-out             |
| Reporte semanal por email a cada agente                           | Cron + fan-out      |
| Llamada a Claude Haiku con retry ante rate-limit                  | Wrapped step        |
| Publicación automática de propiedad en redes (futuro)             | Multi-step workflow |
| Análisis de lead "matching" con propiedades nuevas (futuro)       | Event-driven        |

Cada función es código TypeScript en `inngest/functions/*.ts`, con steps idempotentes y observable desde el dashboard de Inngest.

**Por qué la elegimos.**
- **Code-first**: los workflows viven en el repo, hacen code review, se versionan con git, escalan con la complejidad del producto. Lo opuesto a n8n (visual).
- **Durabilidad real**: si una step falla, Inngest la reintenta; si Vercel reinicia la function, Inngest preserva el estado.
- **Sin infra propia**: no requiere Redis/BullMQ/workers en Railway. Es SaaS.
- **Replay desde dashboard**: para debuggear flows que salieron mal en producción, podés literalmente volver a ejecutar el job con los mismos inputs.
- **Integración con Vercel AI SDK**: envolver llamadas al LLM en steps para retries automáticos.
- Free tier amplio (50k runs/mes).

**Costo.**
- **Free:** $0/mes — 50.000 runs/mes, 7 días de retention de logs.
- **Hobby/Pro:** $20–50/mes — más runs, más retention, más concurrencia.
- **Enterprise:** custom.

**Notas técnicas.**
- SDK: `inngest` package.
- Endpoint: `app/api/inngest/route.ts` que sirve las functions.
- Cada function se define con `inngest.createFunction({ id, event }, async ({ event, step }) => { ... })`.
- Steps son idempotentes y pueden ser retried individualmente.
- Para llamadas al LLM: envolverlas en `step.run('llm-call', async () => streamText({ ... }))`.

---

### 4.14 TestSprite — Testing automatizado con IA

**Qué es.** Plataforma de testing automatizado impulsada por un agente de IA que cubre el workflow completo de QA: planificación de tests, generación de código de tests, ejecución y debugging automático. Ofrece un MCP Server que se integra directamente con el IDE y los coding assistants, analiza el codebase y los PRDs del producto, y genera tests comprehensivos cubriendo lógica, edge cases, error handling y performance. Soporta testing de frontend (UI/E2E) y backend (API, lógica de negocio).

**Rol en Black Estate.** Es la **capa de testing automatizado** del producto. En un equipo de un solo dev bootstrapped, tener testing manual exhaustivo es inviable. TestSprite actúa como un "QA engineer virtual" que:

- **Genera tests automáticamente** a partir del código existente — cada feature nueva llega con tests sin esfuerzo manual.
- **Valida código generado por IA** — dado que Black Estate usa Claude Haiku para generar copy, descripciones y respuestas del bot, TestSprite cierra el loop verificando que el código producido por IA funcione correctamente.
- **Testing E2E de flujos críticos** — onboarding de agente, carga de propiedad, creación de lead, agendamiento de cita, flujo del bot WhatsApp.
- **Testing de API routes y Server Actions** — validación de los endpoints que conectan con Supabase, Better Auth, Inngest.
- **Integración con CI/CD** — corre tests en cada push/PR antes del deploy en Vercel.
- **Debugging asistido** — cuando un test falla, el agente sugiere y aplica fixes.

**Por qué la elegimos.**
- **Solo founder sin equipo QA**: TestSprite automatiza lo que de otra forma no se haría (o se haría mal y tarde).
- **MCP Server**: se conecta al IDE y al workflow existente sin fricción — no es una herramienta más a la que ir, vive donde ya trabajás.
- **Validación de código AI-generated**: en benchmarks elevó pass rates de código generado por IA de 42% a 93% en una sola iteración — crítico para un producto que depende de generación con Claude Haiku.
- **Free tier funcional**: 150 créditos/mes permiten cubrir testing básico durante MVP sin costo.
- **Alineado con "buy over build"**: no hay que configurar Playwright + Vitest + CI pipelines manualmente — TestSprite lo abstrae.

**Costo.**
- **Free:** $0/mes — 150 créditos/mes. Suficiente para testing básico en fase de desarrollo.
- **Starter:** $19/mes — 400 créditos/mes. Recomendado al pasar a producción con CI/CD activo.
- **Standard:** $69/mes — 1.600 créditos/mes. Para cuando haya volumen de PRs y features frecuentes.
- **Enterprise:** custom.

**Notas técnicas.**
- Instalar el MCP Server de TestSprite en el IDE para generación de tests inline.
- Configurar integración con el pipeline de CI (GitHub Actions → TestSprite → Vercel deploy).
- Los créditos se consumen por ejecución de test — monitorear uso para no exceder el free tier en MVP.
- Complementar con Vitest para unit tests simples que no requieran IA (utils, helpers, transformaciones puras).

---

### 4.15 Paddle — Billing, suscripciones y Merchant of Record

**Qué es.** Plataforma de billing para SaaS que actúa como Merchant of Record (MoR). Paddle es legalmente el vendedor del software — cobra al cliente, maneja impuestos internacionales (VAT, sales tax, IVA), emite facturas, gestiona refunds y chargebacks. Luego hace payout al desarrollador. 14 años en el mercado, battle-tested, usado por miles de SaaS.

**Rol en Black Estate.** Es la **capa completa de monetización**. Maneja:
- Suscripciones recurrentes (mensual/anual) para los planes Free → Pro → Enterprise.
- Seat-based pricing nativo para el plan Enterprise (precio base + $X por agente adicional).
- Free trials para permitir que agencias prueben Enterprise antes de pagar.
- Checkout embebido (overlay) integrado en la UI del producto.
- Customer portal donde el cliente gestiona su suscripción, método de pago, facturas.
- Dunning automático (recuperación de pagos fallidos) — crítico para LATAM donde las tarjetas fallan con frecuencia.
- Tax compliance global — Paddle calcula, cobra y remite impuestos en todas las jurisdicciones.

**Por qué la elegimos.**
- **Merchant of Record**: resuelve el problema de operar desde Bolivia — Paddle es el vendedor legal, maneja impuestos, y hace payout vía Payoneer/Wise a Bolivia. No necesitamos LLC en USA ni cuenta Stripe.
- **Seat-based pricing nativo**: el plan Enterprise necesita "precio base + $X por seat" — Paddle lo soporta out-of-the-box.
- **Dunning maduro**: flujos automáticos de recuperación de pagos fallidos, superior a alternativas.
- **14 años en el mercado**: la plataforma más battle-tested para SaaS billing.
- **SDK TypeScript oficial**: buena DX para nuestro stack.
- **Fee flat sin sorpresas**: 5% + $0.50 por transacción, sin recargos por tarjetas internacionales ni por renovaciones.

**Costo.**
- **Sin costo fijo mensual.** Solo fee por transacción.
- **Fee:** 5% + $0.50 por transacción (incluye todo: procesamiento, MoR, tax compliance).
- **Ejemplo:** en un plan de $99/mes, Paddle cobra $5.45 → quedan $93.55.

**Notas técnicas.**
- Requiere proceso de aprobación manual (días, no semanas). B2B SaaS inmobiliario aprueba sin problema.
- SDK: `@paddle/paddle-node-sdk` para backend, `@paddle/paddle-js` para frontend (checkout overlay).
- Webhooks: `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`, etc.
- Flujo de integración: checkout de Paddle → webhook → endpoint Next.js → actualiza `organization.plan` en Postgres.
- Payout: configurar Payoneer como método de recepción en el dashboard de Paddle.
- Customer portal: hosted por Paddle, se linkea desde settings del producto.

---

### 4.16 Payoneer — Recepción de pagos en Bolivia

**Qué es.** Plataforma global de pagos que permite recibir transferencias internacionales y retirar a cuentas bancarias locales en LATAM (incluyendo Bolivia).

**Rol en Black Estate.** Es el **puente entre Paddle y la cuenta bancaria en Bolivia**. Paddle hace payout a Payoneer, Payoneer lo deposita en el banco local.

**Costo.**
- Apertura de cuenta: $0.
- Fee de retiro a banco local: variable según país/moneda (~1-2%).
- Fee de recepción de pagos: variable.

**Notas técnicas.**
- Crear cuenta Payoneer antes de configurar Paddle.
- Verificar identidad (KYC) — requiere documento y comprobante de domicilio.
- Configurar en Paddle como método de payout.

---

## 5. Plan de evolución (NO implementar todavía)

Estas decisiones están **diferidas** a futuro. Documentadas acá para que cuando llegue el momento, no se reinvente la rueda.

### 5.1 NestJS + Railway — Cuando edge functions sean limitantes

Cuando algún workload no encaje bien en serverless (workers long-running, conexiones persistentes, lógica con cold-start sensible), introducir **NestJS como backend separado en Railway** y migrar endpoint por endpoint **sin urgencia**. No es un rewrite — es una migración incremental cuando el dolor sea real.

**Disparadores típicos:**
- Bot WhatsApp que requiere conexión persistente con Meta (`whatsapp-web.js` o similar).
- Workflows que consistentemente exceden el límite de 10 segundos de las edge functions.
- Procesos que necesitan estado en memoria entre requests.

### 5.2 Beehiiv — Cuando arranque content marketing

Newsletter platform para SaaS. Agregar cuando:
- Se publique el primer blog post.
- Se capture emails desde el sitio para newsletter.
- Típicamente mes 3-6.

### 5.3 Tolt — Cuando haya product-market fit

Programa de afiliados para escalar adquisición. Agregar cuando:
- El churn esté controlado.
- Los clientes existentes recomienden orgánicamente.
- Típicamente mes 6+.

### 5.4 Stripe directo — Cuando haya tracción y LLC en USA

Cuando Black Estate alcance $3K-5K MRR, considerar:
- Formar LLC en USA vía Firstbase/Doola (~$500 + $200/año agente registrado).
- Abrir cuenta bancaria en Mercury.
- Crear cuenta Stripe con la LLC.
- Migrar billing de Paddle a Stripe Billing directo.
- Ahorro: ~1.5-2% por transacción (de 5% + $0.50 a ~3.4%).
- Ganancia: control total sobre facturas (importante para B2B enterprise).

### 5.5 n8n — Solo si se expone "automations" como feature

Workflow visual estilo Zapier. Solo agregar si en el futuro Black Estate quiere ofrecer a sus usuarios la capacidad de armar sus propias automatizaciones desde el dashboard. Mes 12+ típicamente.

---

## 6. Decisiones descartadas (referencia rápida)

| Herramienta evaluada | Por qué se descartó                                                          |
| -------------------- | ---------------------------------------------------------------------------- |
| **Neon**             | Excelente Postgres, pero no aporta sobre Supabase (que ya da DB + Storage + Auth + Realtime). |
| **Clerk**            | Custom roles y permissions requieren add-on de $100/mes (B2B Authentication). Demasiado caro para MVP bootstrapped. Reemplazado por Better Auth (gratis, open source). |
| **Auth.js**          | Demasiada construcción manual para multi-tenancy con roles.                  |
| **WorkOS**           | Enterprise-first (SSO/SAML). Overkill total para MVP B2B LATAM.              |
| **Supabase Auth**    | Funciona bien, pero requiere construir Organizations/roles/invites manualmente. |
| **Loops**            | Marketing email lifecycle. Overlap con Resend para transaccional. Considerar más adelante. |
| **Mixpanel**         | Solo product analytics, más caro. PostHog cubre eso + más.                   |
| **Plausible**        | Solo web analytics. PostHog ya cubre web analytics además de todo lo demás.  |
| **Intercom**         | Premium pricing desproporcionado al ARPU LATAM esperado.                     |
| **Plain**            | Orientado a dev tools, no soporta WhatsApp nativo.                           |
| **Pylon**            | Premisa "tu cliente vive en Slack" — no aplica a agentes inmobiliarios.      |
| **Framer**           | Black Estate ya tiene design system maduro en Next.js — sumar otra herramienta no se justifica. |
| **ReferralHero**     | Premisa "waitlist viral pre-launch" — no aplica al modelo de Black Estate.   |
| **OpenAI API**       | Reemplazado por Claude Haiku 4.5 (más barato, más rápido, mejor en español). |
| **n8n**              | Workflow visual; reemplazado por Inngest (code-first, mejor para devs).      |
| **Cypress**          | E2E manual, requiere escribir todos los tests a mano. No escala para solo dev sin QA. |
| **Playwright**       | Excelente pero requiere configuración manual de tests y CI pipeline. TestSprite lo abstrae con IA. |
| **Stripe (directo)** | No opera en Bolivia. Requiere LLC en USA (~$500+/año). Diferido como plan de migración cuando haya tracción ($3K-5K MRR). |
| **Clerk Billing**    | Usa Stripe como backend (mismo problema Bolivia). Producto inmaduro para billing. Lock-in doble. |
| **Lemon Squeezy**    | MoR viable pero SDK menos maduro, dunning básico, roadmap incierto post-adquisición Stripe. |
| **Polar.sh**         | Fees reales más altos para LATAM (6% + $0.40 con tarjetas intl), seat-based en beta, free trials no disponibles, payout via Stripe Connect (riesgo Bolivia). |

---

## 7. Resumen de costos esperados a 24 meses

| Mes / etapa                       | Costo total infra/mes |
| --------------------------------- | --------------------- |
| **0-3 (dev / pre-launch)**        | $0–10                 |
| **3-6 (beta privada)**            | $10–50                |
| **6-12 (lanzamiento, 100-500 tenants)** | $75–200         |
| **12-18 (1.000-2.000 tenants)**   | $200–500              |
| **18-24 (escala, 5.000+ tenants)** | $500–1.500           |

> Los costos asumen uso moderado del LLM. Si el bot WhatsApp tiene mucho volumen, el costo de Claude Haiku puede dominar.

---

## 8. Mantenimiento de este documento

- **Cuando agregar/cambiar una herramienta del stack:** actualizar la sección correspondiente y agregar entrada en la tabla del resumen ejecutivo.
- **Cuando se descarte una opción:** mover a la sección de "Decisiones descartadas".
- **Cuando llegue el momento de implementar algo del plan de evolución:** mover esa sección al cuerpo del documento como decisión tomada.
- **Verificar precios cada 6 meses** — todos los proveedores cambian pricing periódicamente.
