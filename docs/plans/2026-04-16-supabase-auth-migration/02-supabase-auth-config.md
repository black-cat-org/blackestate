# Sub-plan 02 — Supabase Auth Configuration

> **Depends on:** 00-master.md
> **Unlocks:** 03, 10

## Goal

Configurar Supabase Auth en el dashboard: habilitar email/password, Google OAuth con los mismos credentials actuales, SMTP via Resend para emails transaccionales, email templates custom en español, env vars locales actualizados.

Estado final: usuarios pueden autenticarse via Supabase Auth aunque la UI del app aún no esté migrada (Fase 10). Se puede probar vía dashboard Supabase o curl.

## Archivos

### Modificar

- `.env.local` — agregar nuevas env vars, mantener las existentes que se reutilizan

### Crear

- `.env.template` — template actualizado (si existe actualmente)
- (No se tocan archivos de código fuente en esta fase; todo es config en Supabase dashboard)

## Dashboard Supabase — pasos

### 1. Auth providers

Dashboard → Authentication → Providers:

- **Email:** enable. Confirm email: yes (decisión: forzar email verification desde inicio).
- **Password:** minimum length 8 (match actual Better Auth behavior).
- **Google:** enable. Paste `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (mismos que hoy).
  - Authorized redirect URI (copiar de Supabase dashboard): `https://<project-ref>.supabase.co/auth/v1/callback`
  - Agregar esa URI a Google Cloud Console → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs.
  - **Importante:** mantener también la URI antigua de Better Auth (`/api/auth/callback/google`) hasta Fase 12, por si hay rollback.

### 2. SMTP config

Dashboard → Authentication → Emails → Settings:

- **Custom SMTP server:** enable.
- **Sender name:** `Black Estate`
- **Sender email:** `no-reply@mail.blackestate.com` (o dominio que uses; verificar DNS DKIM/SPF en Resend)
- **SMTP host:** `smtp.resend.com`
- **SMTP port:** `465` (SSL) o `587` (TLS)
- **SMTP user:** `resend`
- **SMTP pass:** Resend API key (`re_...`)

**Pre-requisito:** cuenta Resend creada, dominio verificado. Si no existe, crear en el camino (no bloqueante, Supabase tiene fallback SMTP limitado a 4 emails/hora).

### 3. Email templates

Dashboard → Authentication → Emails → Templates. Editar cada template a español. Templates a ajustar:

**Confirm signup:**
```
Subject: Confirmá tu cuenta en Black Estate

Hola,

Gracias por registrarte en Black Estate. Hacé click en el siguiente enlace para confirmar tu cuenta:

{{ .ConfirmationURL }}

Si no creaste esta cuenta, ignorá este email.

— Equipo Black Estate
```

**Invite user:**
```
Subject: Te invitaron a unirte a {{ .SiteURL }}

Hola,

Fuiste invitado a unirte a una organización en Black Estate.

Hacé click acá para aceptar la invitación:

{{ .ConfirmationURL }}

Si no esperabas esta invitación, ignorá este email.

— Equipo Black Estate
```

**Magic link:** — no se usa, dejar default o deshabilitar.

**Change email address:**
```
Subject: Confirmá tu nuevo email en Black Estate

Hola,

Pedimos confirmar el cambio de tu email. Hacé click acá:

{{ .ConfirmationURL }}

Si no pediste este cambio, contactá soporte inmediatamente.

— Equipo Black Estate
```

**Reset password:**
```
Subject: Restablecé tu contraseña en Black Estate

Hola,

Recibimos un pedido para restablecer tu contraseña. Hacé click acá para elegir una nueva:

{{ .ConfirmationURL }}

Si no pediste esto, ignorá el email (tu contraseña sigue igual).

— Equipo Black Estate
```

**Reauthentication:** — dejar default si no se usa.

### 4. URL configuration

Dashboard → Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000` (dev) / `https://<tu-dominio>.com` (prod) / preview URL patterns.
- **Redirect URLs:** whitelist (permite rubros de rutas):
  - `http://localhost:3000/**`
  - `https://<tu-dominio>.com/**`
  - `https://<tu-dominio>-*.vercel.app/**` (preview deploys)

### 5. JWT config

Dashboard → Authentication → JWT Keys:

- **JWT expiry:** 3600 seconds (1 hour) — default, deja así.
- **JWT Secret:** visible. No lo cambies. Tomá nota de que existe (lo usa el hook).
- **Refresh token expiry:** 7 días — default.
- **Reuse interval:** 10 segundos — default.

### 6. Security configs

Dashboard → Authentication → Advanced (o similar):

- **Minimum password length:** 8
- **Require special character:** no (o sí según política)
- **Require uppercase:** no
- **Rate limits:** defaults están bien para MVP. Ajustar si hay spam en prod.
- **Captcha:** diferir (no hoy).

### 7. User metadata — reservar campos

Supabase guarda `user_metadata` (user-editable) y `app_metadata` (server-only, privileged). Definir qué va dónde:

- `app_metadata.is_super_admin` — booleano, server-only.
- `user_metadata.full_name` — string, puede estar, se usa en UI.
- `user_metadata.avatar_url` — string, opcional.

Este es convención, no config. El hook (sub-plan 03) y las Server Actions usarán esto.

## Env vars locales (`.env.local`)

Agregar:

```bash
# Supabase — Auth client
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Supabase — Admin (server-only)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  # ya existe, mantener
```

Los valores de `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` se copian de Dashboard → Settings → API (pestaña "Publishable and secret API keys").

**Mantener por ahora (hasta Fase 12):**
- `DATABASE_URL` (sigue siendo usado por Drizzle y Better Auth durante la transición)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (reutilizados por Supabase Auth + aún por Better Auth durante transición)

**Comentar / no borrar aún:**
- `BETTER_AUTH_SECRET` (si existe) — se borra en Fase 12
- `BETTER_AUTH_URL` (si existe) — se borra en Fase 12

## `.env.template` (opcional, si existe en repo)

Actualizar para reflejar los nuevos env vars. Ejemplo:

```bash
# ─── Supabase ────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# ─── OAuth ────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─── Resend (via Supabase SMTP) ──────────────────
# Resend API key se configura en Supabase dashboard, no en .env
```

## Pasos de ejecución

- [ ] **1. Verificar dominio en Resend** (prerequisito)
  - Si Resend no está, crear cuenta, agregar dominio `mail.blackestate.com` (o el que uses), confirmar DKIM/SPF/DMARC.
  - Si `blackestate.com` no existe aún, usar tu email personal + Supabase SMTP default (limitado pero funcional para dev).

- [ ] **2. Dashboard Supabase → Providers**
  - Enable email/password.
  - Enable Google OAuth (paste credentials).
  - Copiar redirect URI mostrada → Google Cloud Console → actualizar authorized redirect URIs.

- [ ] **3. Dashboard Supabase → SMTP** (si Resend listo)
  - Configurar custom SMTP con Resend credentials.
  - Test: enviar email de invite vía dashboard ("Invite user" → email tuyo) y verificar que llegue.

- [ ] **4. Dashboard Supabase → Templates**
  - Editar los 5 templates listados arriba con texto en español.
  - Test: re-enviar email de verify a user de prueba → verificar texto en español.

- [ ] **5. Dashboard Supabase → URL Configuration**
  - Setear Site URL para dev.
  - Whitelist redirect URLs.

- [ ] **6. Copiar env vars del Dashboard**
  - Settings → API → copiar `Project URL` y `Publishable key`.
  - Agregar a `.env.local`:

    ```
    NEXT_PUBLIC_SUPABASE_URL=<copiado>
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<copiado>
    ```

  - `SUPABASE_SERVICE_ROLE_KEY` ya existe — no tocar.

- [ ] **7. Actualizar `.env.template`** si está en repo.

- [ ] **8. Prueba smoke — sign up via dashboard**
  - Dashboard → Authentication → Users → "Add user" → crear test user (email + pass).
  - Verificar que row aparece en `auth.users`.
  - Intentar sign-in via SQL:

    ```sql
    SELECT id, email, email_confirmed_at, raw_user_meta_data FROM auth.users ORDER BY created_at DESC LIMIT 5;
    ```

  - Si el user no tiene `email_confirmed_at`, confirmarlo vía dashboard o SQL:

    ```sql
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = '<user-id>';
    ```

- [ ] **9. Prueba smoke — Google OAuth**
  - En Supabase dashboard → Authentication → Providers → Google → "Test sign in" si está disponible.
  - Alternativa: ejecutar curl contra `/auth/v1/authorize?provider=google&redirect_to=...` y confirmar que redirige correctamente.

- [ ] **10. Commit**

  ```bash
  git add .env.template
  git commit -m "feat(auth-migration): phase 02 — supabase auth config

- Dashboard: email/password + Google OAuth enabled
- Dashboard: custom SMTP via Resend
- Dashboard: email templates translated to Spanish
- .env.template: document new NEXT_PUBLIC_SUPABASE_* vars

Ref: docs/plans/2026-04-16-supabase-auth-migration/02-supabase-auth-config.md"
  ```

**Nota:** `.env.local` NO se commitea (está en `.gitignore`). Solo `.env.template` si existe.

## Checklist de verificación

- [ ] Supabase dashboard → Providers → Email enabled, Google enabled con credentials OK
- [ ] Google Cloud Console → redirect URI de Supabase agregada (mantener la vieja también)
- [ ] SMTP configurado (Resend o default Supabase)
- [ ] 5 templates editados en español
- [ ] Site URL + redirect URLs whitelisted
- [ ] `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] Test user creado vía dashboard manualmente, aparece en `auth.users`
- [ ] `.env.template` actualizado (si aplica)

## Rollback de esta fase

- Dashboard → Providers → disable Google OAuth (email/password queda).
- Borrar template overrides (volver a default).
- Desconfigurar SMTP (volver al default).
- Quitar `NEXT_PUBLIC_SUPABASE_*` del `.env.local`.

La tabla `auth.users` mantiene los test users creados; si querés borrarlos, vía dashboard o SQL:

```sql
DELETE FROM auth.users WHERE email LIKE 'test%@%';
```

## Notas

- Este sub-plan NO toca código del app. Toda la config es dashboard + env.
- Las dos Better Auth y Supabase Auth CONVIVEN durante la transición (Fases 03-11). Usuarios nuevos irán a Better Auth hasta Fase 10; solo después se switcheo el flow al dashboard.
- Los callbacks de Google OAuth van a dos lugares distintos (Better Auth `/api/auth/callback/google` vs Supabase `/auth/v1/callback`). Ambas autorizadas en Google Console.
- **Advertencia:** no habilitar "Auto confirm users" en Supabase (queremos email verification). Para dev, usar SQL para confirmar manualmente o disable email verification temporalmente y re-habilitarla pre-prod.
