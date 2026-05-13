# Plan: Arquitectura unificada de mailing — Black Estate

**Creado:** 2026-05-12
**Prioridad:** P1 — bloquea flow de invitaciones a org (sub-task #27)
**Estado:** 🟡 En curso — Fase 1 arrancando
**Sub-plan relacionado:** `2026-05-11-realtime-membership-revocation.md` (G37: invite link `?inv=`)

> **Estrategia de commits:** Por fase. Cada fase es una rama. Commits atómicos dentro de cada fase agrupados por concepto (módulo / primitives / template / wiring / docs).

---

## 1. Visión final

**Un solo módulo de email para todo el proyecto.** Un solo proveedor (Resend). Un solo renderer (React Email). Templates versionados en el repo. Auditable y reusable.

### Arquitectura objetivo (post Fase 2)

```
┌─────────────────────────────────────────────────────────────┐
│                      lib/email/                              │
│                                                              │
│  transport.ts   ← Resend SDK client (singleton)              │
│  render.ts      ← @react-email/render → HTML inline-styled   │
│  send.ts        ← sendEmail({ to, subject, react, text? })   │
│  env.ts         ← requireEmailEnv literal access             │
│  components/    ← React Email primitives reusables           │
│    BrandLayout.tsx                                           │
│    Button.tsx                                                │
│    InfoSection.tsx                                           │
│    Footer.tsx                                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┴──────────┐
       │                      │
       ▼                      ▼
┌──────────────┐      ┌────────────────────────────────┐
│ Auth emails  │      │ Custom emails (invitations,    │
│ (signup,     │      │  welcome, lead alerts, etc.)   │
│  recovery,   │      │                                │
│  email       │      │ Server Actions / Workflows     │
│  change…)    │      │ llaman directo a sendEmail()   │
│              │      │ con su template feature-       │
│ Send Email   │      │ específico                     │
│ Hook →       │      │                                │
│ /api/auth/   │      │                                │
│ send-email-  │      │                                │
│ hook         │      │                                │
│              │      │                                │
│ Renderiza    │      │                                │
│ template     │      │                                │
│ React Email  │      │                                │
│ por type     │      │                                │
└──────────────┘      └────────────────────────────────┘
```

**Por qué esta arquitectura:**
- Una sola fuente de verdad para templates (repo, versionables, code-reviewables)
- UI estandarizada garantizada en TODOS los emails (auth + custom)
- Un solo proveedor → un dominio sender → un DKIM/SPF/DMARC = deliverability óptima
- Migración a otro proveedor (futura) = swap del transport, templates intactos
- Audit trail: cada email enviado pasa por logs server-side

---

## 2. Fases

### Fase 1 — Foundation + Invitations (NOW)

**Objetivo:** Levantar el módulo con la API final, integrar React Email, mandar el primer email custom (invitations).

**Auth emails siguen usando Supabase Auth + Custom SMTP Mailtrap (configurado al Dashboard).** No los tocamos en esta fase porque requieren Resend + dominio para migrar bien.

#### 1.1 Setup del módulo

- [x] Crear directorio `lib/email/`
- [x] Instalar deps:
  - `nodemailer` + `@types/nodemailer` (transport SMTP)
  - `@react-email/components` (primitives Html/Head/Body/Container/Button/Heading/Text/Section/etc)
  - `@react-email/render` (renderer)
- [x] `lib/email/env.ts` — `requireEmailEnv(name)` con accesos literales tipo `requireSupabaseEnv`. Vars:
  - `EMAIL_FROM` — "Black Estate <noreply@example.com>"
  - `SMTP_HOST` — sandbox.smtp.mailtrap.io
  - `SMTP_PORT` — 2525
  - `SMTP_USER`
  - `SMTP_PASS`
- [x] `lib/email/transport.ts` — singleton nodemailer Transporter + EMAIL_FROM resuelto al init en `globalThis` (sobrevive HMR). `getEmailRuntime()` retorna `{ transporter, from }`. No re-exportado desde index.ts.
- [x] `lib/email/render.ts` — single-pass: `render()` → HTML, luego `toPlainText(html)` → text. Sin doble render.
- [x] `lib/email/send.ts` — función pública `sendEmail({ to, subject, react, replyTo? })`. Lee runtime fuera del try/catch (config errors fail loud); transport errors retornan discriminated union `{ success, ... }`. Log redacta recipients a count (PII).

#### 1.2 React Email primitives

- [x] `lib/email/components/tokens.ts` — colores, fontStack inline-friendly. Reusados por todos los primitives. Mitiga Outlook Desktop que no hereda font-family.
- [x] `lib/email/components/BrandLayout.tsx` — wrapper top-level. Container 600px, fondo gris suave, padding. Header con marca de texto "Black Estate" (sin logo image — asset hostado lo agregamos cuando tengamos branding final). Footer slot opcional (default `<Footer />`). Comment explícito de fallback Outlook para borderRadius.
- [x] `lib/email/components/EmailButton.tsx` — CTA estandarizado wrapping React Email Button. Estilos inline, fontFamily explícito para Outlook.
- [x] `lib/email/components/InfoSection.tsx` — sección con título opcional + body (string o ReactNode).
- [x] `lib/email/components/Footer.tsx` — pie con copyright + slot `extra` para disclaimers per-template.

#### 1.3 Template de invitación

- [x] `features/shared/infrastructure/email/invitation-email.tsx`:
  - Props: `{ inviterName, inviterEmail, orgName, role, acceptUrl, expiresAtIso }`
  - Subject builder export aparte: `invitationSubject({ inviterName, orgName })` → `"${inviterName} te invitó a unirte a ${orgName} en Black Estate"`
  - Body: BrandLayout + heading "Te invitaron a un equipo" + InfoSection con texto explicativo + Button "Aceptar invitación" → acceptUrl + fallback "O copia este enlace:" con el URL plano + Footer con disclaimer de seguridad ("Si no reconoces esta invitación o prefieres no aceptarla, simplemente ignora este mensaje. No se realizará ninguna acción.")
  - Expira el dd/mm/yyyy (formato es-BO)

#### 1.4 Wiring en `sendInvitationAction`

- [x] Importar `sendEmail` + template + subject builder
- [x] Resolver `inviterName` (del JWT claim `user_name` via `ctx.userName`, fallback al email local-part). Helper `resolveInviterName`
- [x] Resolver `orgName` (vía `DrizzleOrganizationRepository.findById(ctx, ctx.orgId)` — RLS-honrado)
- [x] Construir `acceptUrl` con `NEXT_PUBLIC_APP_URL` + `/accept-invite?inv=${token}` (memoria G37: param `?inv=` ✅)
- [x] Llamar `sendEmail` DESPUÉS de `sendInvitationUseCase` exitoso. Best-effort vía `after()` — la action retorna primero, el SMTP roundtrip ocurre después. Si falla, log + invitation queda OK (admin puede reenviar)
- [ ] Anotar TODO/FUTURO en código: "cuando exista resend, swap transport en lib/email/transport.ts" — postergado, la migración a Resend es Fase 2 entera, no un TODO inline

#### 1.5 Env vars y .env.template

- [x] Actualizar `.env.template` con las 5 vars EMAIL_*/SMTP_*
- [x] Confirmar usuario que `.env.local` ya las tiene cargadas
- [ ] Documentar en CLAUDE.md sección Environment Variables las nuevas vars

#### 1.6 Tests Fase 1

- [ ] tsc + eslint + build clean
- [ ] Code review feature-dev:code-reviewer (módulo + primitives + template + wiring)
- [ ] Smoke E2E manual: enviar invitación real desde dev → ver en Mailtrap sandbox
- [ ] Verificar render HTML vs Gmail/Outlook (cliente preview en Mailtrap)
- [ ] Tabla de tests obligatoria

#### 1.7 Docs Fase 1

- [ ] Marcar Fase 1 ✅ en este plan
- [ ] Actualizar CLAUDE.md sección Environment Variables
- [ ] Anotar G37 cerrado (invite link usa `?inv=`)

#### 1.8 Bloqueos para Fase 1

Ninguno. Mailtrap dev funciona sin dominio propio.

---

### Fase 2 — Resend + Send Email Hook (BLOQUEADO por dominio propio)

**Objetivo:** Mover TODOS los emails (auth + custom) al módulo + Resend. Una sola fuente de verdad de templates en el repo.

#### 2.1 Pre-requisitos (usuario)

- [ ] Dominio propio comprado (ej. `blackestate.app`)
- [ ] Cuenta Resend creada
- [ ] Dominio verificado en Resend (DNS records: SPF, DKIM, DMARC)
- [ ] Resend API key generada
- [ ] Decisión: dirección sender (`noreply@blackestate.app`, `equipo@blackestate.app`, etc.)

#### 2.2 Migración del transport

- [ ] Reemplazar nodemailer por Resend SDK en `lib/email/transport.ts`
- [ ] Env vars nuevas: `RESEND_API_KEY`, `EMAIL_FROM` (con dominio propio)
- [ ] Quitar env vars SMTP_* (ya no se usan)
- [ ] `send.ts` API permanece igual (objetivo del refactor desde Fase 1)
- [ ] Tests: invitations sigue funcionando con el transport nuevo

#### 2.3 Send Email Hook endpoint

- [ ] Endpoint nuevo: `app/api/auth/send-email-hook/route.ts`
  - Método POST
  - Valida firma del webhook con secret de Supabase Dashboard (HMAC SHA-256, header `webhook-signature`)
  - Lee payload: `{ user: { email, ... }, email_data: { token, token_hash, redirect_to, email_action_type, site_url, ... } }`
  - Mapea `email_action_type` → template React Email correspondiente:
    - `signup` → `SignupVerificationEmail`
    - `recovery` → `PasswordRecoveryEmail`
    - `email_change_current` → `EmailChangeCurrentEmail`
    - `email_change_new` → `EmailChangeNewEmail`
    - `magiclink` → `MagicLinkEmail` (si lo activamos en futuro)
    - `invite` → `SupabaseInviteEmail` (no usamos Supabase invite para org invites, pero por completitud)
  - Renderiza con datos del payload + envía vía `sendEmail`
  - Retorna 200 OK / 400 si payload inválido / 401 si firma falla / 500 si transport falla
- [ ] Env var nueva: `SUPABASE_AUTH_HOOK_SECRET`
- [ ] Documentar en CLAUDE.md el nuevo endpoint + flow

#### 2.4 Templates auth React Email

- [ ] `features/shared/infrastructure/email/auth/signup-verification-email.tsx`
- [ ] `features/shared/infrastructure/email/auth/password-recovery-email.tsx`
- [ ] `features/shared/infrastructure/email/auth/email-change-current-email.tsx`
- [ ] `features/shared/infrastructure/email/auth/email-change-new-email.tsx`
- [ ] (Opcional) `features/shared/infrastructure/email/auth/magic-link-email.tsx`
- [ ] Todos comparten BrandLayout + footer estándar — UI consistente con invitaciones
- [ ] Cada template incluye disclaimer de seguridad cuando aplica

#### 2.5 Configuración Supabase Dashboard

- [ ] Activar "Send Email Hook" en Dashboard → Authentication → Hooks
- [ ] Configurar URL del hook: `https://blackestate.app/api/auth/send-email-hook`
- [ ] Generar y guardar secret → setear en env var `SUPABASE_AUTH_HOOK_SECRET`
- [ ] Deshabilitar la rúbrica SMTP built-in si Send Email Hook está activo (verificar comportamiento exacto en docs Supabase)

#### 2.6 Tests Fase 2

- [ ] tsc + eslint + build clean
- [ ] Code review
- [ ] Smoke E2E:
  - Sign-up nuevo user → recibe verification email del módulo (no de Supabase)
  - Password reset → recibe recovery email del módulo
  - Email change → recibe both emails del módulo
  - Invite a org → recibe invitation email del módulo (sin cambio en el flow ya funcional)
- [ ] Verificar deliverability (no spam folder) con Mail Tester / mail-tester.com
- [ ] Tabla de tests obligatoria

#### 2.7 Docs Fase 2

- [ ] Marcar Fase 2 ✅
- [ ] CLAUDE.md: actualizar Environment Variables (quitar SMTP_*, agregar RESEND_API_KEY, SUPABASE_AUTH_HOOK_SECRET)
- [ ] CLAUDE.md: sección "Mailing" describiendo el flow completo (hook → módulo → Resend)
- [ ] Memoria actualizar: `email_notifications_decision.md` — confirmar implementación final

#### 2.8 Riesgos Fase 2

- **Lock-in con Supabase Send Email Hook**: si Supabase cambia el contrato del payload, hay que adaptar el endpoint. Mitigación: tipar el payload con un schema Zod en el endpoint → falla loud si cambia.
- **Deliverability inicial**: dominio fresco puede caer en spam. Mitigación: warm-up gradual + monitoreo de bounce rate Resend.
- **Doble envío si Supabase no respeta el hook como override**: testear exhaustivamente que el built-in está apagado.

---

## 3. Estado actual del proyecto (pre-Fase 1)

| Componente | Estado |
|---|---|
| Email module en repo | ❌ No existe |
| Auth emails (signup, recovery) | ✅ Funciona vía Supabase Auth + Custom SMTP Mailtrap (Dashboard config) |
| Invitation emails | ❌ No se envían — la invitación se crea en DB pero el invitee no recibe nada |
| React Email | ❌ No instalado |
| Resend | ❌ No configurado (esperando dominio propio) |
| Send Email Hook | ❌ No configurado |

---

## 4. Decisiones tomadas

| # | Decisión | Razón |
|---|---|---|
| D-1 | Un solo módulo de email para toda la app | Estándar de UI, audit, reusable |
| D-2 | React Email desde Fase 1 | Templates con componentes reusables. Cuando swap a Resend, templates intactos |
| D-3 | Resend como provider final único (auth + custom) | UI consistente, una sender, un DKIM/SPF |
| D-4 | Send Email Hook en Fase 2 (no Fase 3) | Templates auth versionados en repo desde día 1 de Resend. Una sola arquitectura final, no migración intermedia |
| D-5 | nodemailer como transport interim Fase 1 | Estándar SMTP, swap fácil a Resend SDK |
| D-6 | Mailtrap sandbox como dev SMTP | Ya configurado por user, captura emails sin enviarlos realmente |
| D-7 | Templates en `features/<feature>/infrastructure/email/` | Colocación con la feature dueña. Primitives compartidos en `lib/email/components/` |
| D-8 | Send emails best-effort en Server Actions | Si SMTP falla, log + return OK. Admin/user puede reenviar. No bloquea flow primario |
| D-9 | Disclaimer de seguridad en TODOS los emails con CTAs | "Si no reconoces este mensaje, ignóralo" — estándar Stripe/GitHub/Linear |
| D-10 | Plain text fallback derivado del HTML | @react-email/render con `plainText: true` para clientes que no rendean HTML |

---

## 5. Open questions

- **OQ-1:** ¿Domain warm-up necesario en Resend? Depende del volumen estimado al ir live. Si <100 emails/día primer mes, no es crítico.
- **OQ-2:** ¿Tracking de open/click rates? Resend lo soporta nativo. Decidir si queremos métricas o privacidad por defecto.
- **OQ-3:** ¿Email change flow nuestro (`email_change_current` + `email_change_new`) ya está activado en Supabase Auth? Si no se usa hoy, podemos omitir esos templates en Fase 2 y agregarlos cuando se active.
- **OQ-4:** ¿Magic link login activado? Si no, omitir template en Fase 2.

---

## 6. Sub-tasks fuera de scope (futuro)

- Emails transaccionales de leads (alerta "nueva lead asignada")
- Email welcome/onboarding nuevo usuario
- Email digest semanal de actividad
- Bounce / complaint handling (webhook desde Resend)
- Unsubscribe handling real (no placeholder)
- A/B testing de subject lines

Todos heredan el módulo `lib/email/` + Resend + React Email = trabajo incremental, no rearquitectura.

---

## 7. Histórico

| Fecha | Fase | Notas |
|---|---|---|
| 2026-05-12 | Plan creado | Visión final: Resend + Send Email Hook + React Email + módulo único. Fase 1 arrancando con Mailtrap interim. Fase 2 bloqueada por dominio propio. |
