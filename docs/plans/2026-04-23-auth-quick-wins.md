# Sub-plan — Auth quick wins (G2 + G9 + G10 + G13)

**Creado:** 2026-04-23 · **Rama:** `qa/2026-04-22-exhaustive` · **Origen:** QA Lote 1 gaps P2/P3 triviales

## Problema

Después de cerrar G1, G11 y G12, quedan 4 gaps de bajo esfuerzo (1 línea a 15 min cada uno) que acumulan tech debt si se posponen. Batch fix en un solo sub-plan para cerrar Lote 1 limpio.

## Alcance

- [x] **G2 (P2) — Error mapping ES**: `lib/auth/error-messages.ts` con `AUTH_ERROR_MESSAGES` (14 códigos GoTrue) + helper `getAuthErrorMessage(code, fallback?)` + dev-mode warning para códigos no mapeados. Wired en los 4 forms auth + `social-buttons`. **+ fix voseo** (5 strings existentes corregidas a neutro "tú").
- [x] **G9 (P2) — Invalidate other sessions en password reset**: `await supabase.auth.signOut({ scope: "others" })` tras `updateUser` exitoso. Error swallow + `console.warn` (best-effort — el password ya cambió).
- [x] **G10 (P2) — OAuth account picker**: `queryParams: { prompt: "select_account" }` en `signInWithOAuth`. Google ahora siempre muestra picker.
- [x] **G13 (P3) — custom_access_token_hook nullif/trim**: 2 migrations Supabase aplicadas (`custom_access_token_hook_nullif_trim` + `custom_access_token_hook_review_fixes`). Canonical source `drizzle/sql/012_custom_access_token_hook_nullif_trim.sql`. `003` marcado SUPERSEDED.
- [x] Code review obligatorio (`feature-dev:code-reviewer`) — 2 MAJOR + 3 MINOR encontrados
- [x] Resolver issues:
  - M1 debug interceptor en `lib/supabase/client.ts` — ya gated `NODE_ENV!=dev`, tracked para revert al cerrar QA
  - M2 migration 012 sin grants — fix: inline full grant/revoke block para fresh DB safety
  - m1 error-messages.ts sin comments — fix: inline comments en aliases + anti-enumeration rationale
  - m2 display_name null guard — fix: `coalesce(display_name, 'User')` unconditional + jsonb_set siempre
  - m3 social-buttons setLoading(false) OAuth success path — pre-existing, out of scope
- [x] tsc ✅ + eslint ✅ (fix extra: unused `Input` import removido de reset-password) + build ✅
- [x] Runtime smoke test — sign-in con pw malo → 400 `invalid_credentials` → map aplicado (tabla de tests en reporte)
- [x] Update QA doc (G2, G9, G10, G13 ✅)
- [x] Commit atómico

## Implementación detallada

### G2 — Error mapping

`lib/auth/error-messages.ts`:

```ts
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos",
  email_not_confirmed: "Confirma tu email antes de iniciar sesión",
  weak_password: "Contraseña débil. Usa mayúsculas, minúsculas y números",
  over_email_send_rate_limit: "Demasiados intentos. Espera unos minutos antes de intentar de nuevo",
  email_address_invalid: "El email ingresado no es válido",
  user_already_exists: "Ya existe una cuenta con este email",
  same_password: "La nueva contraseña debe ser diferente a la actual",
  session_not_found: "Tu sesión expiró. Pide un nuevo enlace de recuperación",
}

export function getAuthErrorMessage(code: string | undefined, fallback?: string): string {
  if (code && code in AUTH_ERROR_MESSAGES) return AUTH_ERROR_MESSAGES[code]
  return fallback ?? "Ocurrió un error. Intenta de nuevo."
}
```

Wire en los 4 forms — reemplazar `toast.error(error.message || "...")` por `toast.error(getAuthErrorMessage(error.code, error.message))`.

### G9 — SignOut others

`app/(auth)/reset-password/page.tsx` — tras `updateUser` exitoso y antes de `setSuccess(true)`:

```ts
const { error } = await supabase.auth.updateUser({ password })
if (error) { ... return }

// Invalidate any other sessions the user might have (data breach recovery).
// Matches OWASP/NIST password change guidance + Stripe/GitHub/Google UX.
await supabase.auth.signOut({ scope: "others" })

setSuccess(true)
```

Silent error tolerance — si `signOut scope:others` falla, no bloqueamos el success del password change. Best-effort.

### G10 — OAuth account picker

`components/auth/social-buttons.tsx:14-19`:

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    queryParams: { prompt: "select_account" },
  },
})
```

Efecto: Google siempre muestra account picker, aunque haya 1 solo account activo. Consistente con industry (Clerk/Auth0 defaults).

### G13 — Custom access token hook nullif/trim

Nueva migration `012_custom_access_token_hook_nullif_trim.sql`. Mirror en repo. Match `handle_new_user` fallback chain (full_name → name → email → 'User').

```sql
-- Pseudocode:
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb as $$
declare
  user_name_value text;
begin
  user_name_value := coalesce(
    nullif(trim(event #>> '{user_metadata,full_name}'), ''),
    nullif(trim(event #>> '{user_metadata,name}'), ''),
    nullif(split_part(event #>> '{claims,email}', '@', 1), ''),
    'User'
  );
  -- ... rest of hook logic: set user_name claim + active_org_id + org_role
end $$;
```

Verificar código actual de `003_custom_access_token_hook.sql` primero para no romper otros claims.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| G2 map pierde `error.message` específicos del SDK | Fallback a `error.message` si code no está en map |
| G9 signOut others falla silencioso | Best-effort — no bloquea password reset success |
| G10 cambia UX OAuth abruptamente | Industry standard, user no pierde nada |
| G13 modifica hook JWT core — rompe sign-in si mal | Code review estricto + runtime test sign-in happy path |

## Out of scope

- G3/G4 (forms validation UX) — sub-plan propio post este
- G5/G6/G7/G8 — diferidos o infra (Vercel/Cloudflare)
- Revert debug interceptor — al cerrar todo QA
