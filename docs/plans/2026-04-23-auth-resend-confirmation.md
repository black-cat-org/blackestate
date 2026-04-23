# Sub-plan — Auth resend confirmation flow

**Creado:** 2026-04-23 · **Rama:** `qa/2026-04-22-exhaustive` · **Origen:** QA Lote 1 gap G1 (P1)

## Problema

User que no confirma email dentro del TTL del token (24h default Supabase) queda **stuck permanentemente**:
- Click link expirado → `/auth-code-error` con solo "Volver a sign-in" / "Crear cuenta nueva"
- Sign-in intento → `email_not_confirmed` (copy crudo EN, sin CTA)
- Re-signup → anti-enumeration fake success → loop infinito

Sin una vía de reenviar confirmación, la cuenta es irrecuperable sin soporte manual.

## Decisión (2026-04-23)

Alineado con industry standard (Stripe/Auth0/Clerk/Vercel/Slack): **botón manual con cooldown 30s**. No auto-trigger (evita spam + consumo innecesario de email).

## Alcance

- [x] 1. Crear `components/auth/resend-confirmation-button.tsx` — reusable, props `{ email, type, variant?, className? }`, cooldown 30s visible, llama `supabase.auth.resend({ type, email })` via browser client
- [x] 2. Wire en `/sign-in` — handler del error `email_not_confirmed` setea state `unconfirmedEmail` + botón inline bajo el form
- [x] 3. Wire en `/auth-code-error` — input email + `aria-describedby` hint + botón (oculto hasta que hay email)
- [x] 4. Wire en sign-up post-submit screen ("Revisa tu correo") — botón inline
- [x] 5. Copy ES custom en todos los toasts + estados (including 429 rate-limit message)
- [x] 6. Code review obligatorio (`feature-dev:code-reviewer`) — 3 MAJOR + 3 MINOR + 1 security issue encontrados
- [x] 7. Resolver issues — todos aplicados:
  - M1 `isMountedRef` para guard async setState post-unmount
  - M2 `typeof window` guard antes de `setInterval`
  - M3 quitar `loading` de deps useCallback + inner guard redundante
  - M4 hide button en auth-code-error cuando email vacío
  - M5 `aria-describedby` link en input
  - M6 `aria-live` polite region separada (anuncia solo start/end del cooldown, no cada tick)
  - M7 **SECURITY**: gate debug interceptor (`lib/supabase/client.ts`) a `NODE_ENV==='development'` — sin este gate, si se forget revertir en prod, los passwords de sign-in se loguearían en console
- [x] 8. Runtime test: Playwright MCP se desconectó post-G11 sub-plan; smoke test runtime diferido (ver nota abajo)
- [x] 9. tsc ✅ + eslint ✅ (files modificados limpios) + build ✅ (pass end-to-end)
- [x] 10. Update QA doc (G1 ✅)
- [x] 11. Commit atómico

**Runtime test pendiente:** Playwright MCP perdió conexión post-commit G11. Build pasa y tsc/eslint limpios. Smoke manual pending post-commit: (a) signup user G + "Revisa tu correo" screen muestra resend button; (b) sign-in sin confirmar muestra resend inline; (c) `/auth-code-error` con email vacío oculta el botón; escribir email + click = cooldown 30s visible. Marcar después en el QA doc.

## Diseño del componente

```tsx
// components/auth/resend-confirmation-button.tsx
"use client"
interface Props {
  email: string
  type?: "signup" | "email_change"  // Supabase.auth.resend types
  variant?: "default" | "link"      // inline link vs full button
}
```

Estado interno:
- `loading` — disabled mientras se hace el request
- `cooldownUntil` (timestamp) — disabled hasta ese tiempo, muestra countdown
- persist cooldown en `sessionStorage` (key: `resend_cooldown_{email}`) para sobrevivir refresh

UX:
- Idle: "Reenviar correo de confirmación"
- Sending: "Enviando..."
- Cooldown: "Reenviar en 29s..." (countdown live)
- Success: toast "Te enviamos un nuevo enlace a {email}", cooldown 30s arranca
- Error: toast "No pudimos reenviar. Intentá de nuevo" + link "¿Necesitás ayuda?"

## Wiring en 3 lugares

### 1. `/sign-in` — error handler `email_not_confirmed`

`app/(auth)/sign-in/page.tsx` — al recibir error.code `email_not_confirmed`, setear state `unconfirmedEmail` y mostrar inline después del form:

```
Tu email no está confirmado. Revisá tu bandeja de entrada.
[Reenviar correo de confirmación]
```

### 2. `/auth-code-error`

`app/(auth)/auth-code-error/page.tsx` — agregar input email opcional + botón "Reenviar enlace". User que llega acá por token expirado puede pedir nuevo sin volver a signup.

### 3. Pantalla "Revisa tu correo" post-signup

`app/(auth)/sign-up/page.tsx` — ya tiene el state `awaitingVerification` con el email. Agregar botón al final:

```
¿No recibiste el correo?
[Reenviar correo de confirmación]
```

## Riesgos + mitigación

| Riesgo | Mitigación |
|---|---|
| User spam click | Cooldown 30s visible + disabled |
| Rate limit Supabase | Custom SMTP Mailtrap dev (ilimitado). En prod Resend — 3k/mes free |
| Email inválido | API devuelve success por anti-enumeration; no revela si email existe |
| User olvida email en `/auth-code-error` | Input explícito con validación HTML5 `type=email` |
| Cooldown no persiste refresh | `sessionStorage` |

## Out of scope

- G8 (rate limit sign-in via Cloudflare) — Vercel deploy task
- G10 (OAuth account picker) — "Auth UX polish"
- Resto de gaps
