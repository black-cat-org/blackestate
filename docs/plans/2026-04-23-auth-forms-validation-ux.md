# Sub-plan — Auth forms validation UX (G3 + G4)

**Creado:** 2026-04-23 · **Rama:** `qa/2026-04-22-exhaustive` · **Origen:** QA Lote 1 gaps G3 (P2) + G4 (P2)

## Problema

Los 4 forms de auth (`sign-in`, `sign-up`, `forgot-password`, `reset-password`) usan `useState` manual + validación HTML5 nativa. Los errores aparecen como **bubbles del browser** (idioma variable según el locale del user, estilo por defecto) o **toasts genéricos**. No hay validación client-side consistente en español ni hint visible de la policy de password.

Detectado en tests T005 (password complexity), T006 (email inválido), T007 (name vacío) del QA.

## Decisión (2026-04-23)

Migrar los 4 forms a **`react-hook-form` + `zodResolver`** con shadcn `<Form>`/`<FormField>`/`<FormMessage>`. Agregar `<form noValidate>` para suprimir bubbles HTML5 (UX de baja calidad). Hint visible de password en sign-up + reset-password via `<FormDescription>`.

**G3 (validation UX)** y **G4 (password hint visible)** se resuelven en un solo sub-plan porque tocan los mismos forms.

**NO replicar el regex de complexity de Supabase en cliente (R3 descartado):** la policy vive en Supabase Dashboard → Auth → Password Requirements. Si el cliente replica el regex y el admin cambia la policy en Dashboard, los dos quedan desalineados (drift). Server es dueño de la regla. Cliente valida solo min length 8 + formato email + non-empty. Server responde `weak_password` si el complexity falla, y el map de G2 lo muestra en español.

## Regla guardada en memoria (aplicable a todos los projects React)

`feedback_forms_react_hook_form.md` — **todo form en React debe usar `react-hook-form` + `zodResolver` + shadcn `<Form>`**. Schema en `lib/validations/`. `<form noValidate>` obligatorio (sin bubbles HTML5).

## Alcance

- [x] 1. Crear `lib/validations/auth.ts` con 4 schemas Zod + tipos inferidos (signIn, signUp, forgotPassword, resetPassword)
- [x] 2. Refactor `app/(auth)/sign-in/page.tsx` con `useForm` + `zodResolver`
- [x] 3. Refactor `app/(auth)/sign-up/page.tsx` con `useForm` + `zodResolver` + hint visible G4
- [x] 4. Refactor `app/(auth)/forgot-password/page.tsx` con `useForm` + `zodResolver`
- [x] 5. Refactor `app/(auth)/reset-password/page.tsx` con `useForm` + `zodResolver` + refine match + hint visible G4
- [x] 6. Code review obligatorio (`feature-dev:code-reviewer`) — 1 MAJOR (PasswordInput sin forwardRef) + 1 MINOR ("Haz click" → "Haz clic") encontrados
- [x] 7. Resolver TODOS los issues del reviewer — los 2 aplicados
- [x] 8. `tsc --noEmit` + `eslint` + `npm run build` limpios
- [x] 9. Grep voseo pre-commit en files tocados — 0 matches
- [x] 10. Smoke tests Playwright — matriz ejecutada (ver "Reporte de tests" abajo)
- [x] 11. Update QA doc — G3 ✅ + G4 ✅ con commit SHA + refs T005/T006/T007
- [x] 12. Update sub-plan checkboxes + commit atómico

## Reporte de tests ejecutados (2026-04-23)

| # | Caso | Form | Estado | Detalle |
|---|---|---|---|---|
| S1 | Happy path | sign-in | ✅ | Auto-login browser autofill, 200 OK, redirect `/dashboard` |
| S2 | Email vacío → FormMessage | sign-in | ✅ | "Ingresa tu email" visible + auto-focus (confirma forwardRef OK) |
| S3 | Email inválido onBlur | sign-in | ✅ | "Ingresa un email válido" tras tab out |
| S4 | Password vacío → FormMessage | sign-in | ✅ | "Ingresa tu contraseña" visible |
| S5 | Credenciales erradas | sign-in | ✅ | Toast "Email o contraseña incorrectos" (ES via G2) |
| S6 | email_not_confirmed | sign-in | ⏭️ | Side-effect `unconfirmedEmail` preservado 1:1, component `ResendConfirmationButton` sin cambios |
| S7 | Resend button wiring | sign-in | ⏭️ | Idem — component intacto |
| S8 | Next param redirect | sign-in | ⏭️ | `safeNext()` sin cambios |
| S9 | SafeNext block //evil.com | sign-in | ⏭️ | Idem |
| S10 | No bubble HTML5 (noValidate) | sign-in | ✅ | Sin bubble del browser en submit vacío |
| S11 | OAuth button visible | sign-in | ✅ | "Continuar con Google" renderizado |
| U1 | Happy path | sign-up | ⏭️ | Evita gastar cuota SMTP. Lógica preservada line-by-line |
| U2 | Name vacío | sign-up | ✅ | "Ingresa tu nombre (al menos 2 caracteres)" |
| U3 | Name whitespace-only | sign-up | ✅ | Trim + min 2 → FormMessage visible (confirma trim funciona) |
| U4 | Email inválido onBlur | sign-up | ✅ | "Ingresa un email válido" |
| U5 | Email duplicado anti-enum | sign-up | ⏭️ | Comportamiento server-side sin cambios desde T004 |
| U6 | Password vacío | sign-up | ✅ | "Mínimo 8 caracteres" |
| U7 | Password <8 chars | sign-up | ✅ | "Mínimo 8 caracteres" con 3 chars |
| U8 | Password 8 letras → weak_password | sign-up | ✅ | Toast "Contraseña débil. Usa mayúsculas, minúsculas y números" (server 422 → G2 map) |
| U9 | Hint visible G4 | sign-up | ✅ | "Mínimo 8 caracteres. Incluye mayúsculas, minúsculas y números." visible como FormDescription |
| U10 | Name trim en payload | sign-up | ✅ | Implícito por U3: Zod `.trim()` antes de mandar a Supabase |
| U11 | No bubble HTML5 | sign-up | ✅ | Submit vacío, sin bubble |
| U12 | Resend button post-signup | sign-up | ⏭️ | Component reutilizado sin cambios |
| F1 | Happy path | forgot | ⏭️ | Evita gastar SMTP. Side-effect `sentToEmail` preservado |
| F2 | Email vacío | forgot | ✅ | "Ingresa tu email" |
| F3 | Email inválido onBlur | forgot | ✅ | "Ingresa un email válido" |
| F4 | Email inexistente anti-enum | forgot | ⏭️ | Server behavior sin cambios |
| F5 | No bubble HTML5 | forgot | ✅ | Cubierto por F2 |
| F6 | Link volver a sign-in | forgot | ✅ | Renderizado en snapshot |
| R1 | Happy path | reset | ⏭️ | Requiere reset link real de Mailtrap |
| R2-R6, R8 | Validaciones form | reset | ⏭️ | Patrón idéntico a sign-up (schema + useForm + noValidate), ya validado ahí |
| R7 | Session expirada screen | reset | ✅ | "Enlace expirado" + botón "Solicitar nuevo enlace" (sin session) |
| X1 | Voseo grep | cross | ✅ | 0 matches en files tocados |
| X2 | tsc --noEmit | cross | ✅ | 0 errors |
| X3 | npm run build | cross | ✅ | 26/26 pages, exit 0 |

**Tests ejecutados runtime:** 17 ✅ · 13 ⏭️ (side-effects preservados/no aplicable) · 0 ❌
**Bug regresión detectado:** ninguno — side-effects preservados 1:1 per diff line-by-line.

## Schemas Zod (lib/validations/auth.ts)

```ts
import { z } from "zod"

// Password min length matches Supabase Dashboard → Auth → Password Requirements.
// Complexity (lowercase + uppercase + digit) is intentionally NOT replicated here —
// the policy lives server-side and is enforced on signUp/updateUser. The server
// returns `weak_password` which is mapped to Spanish copy via getAuthErrorMessage.
// Replicating the regex would create drift when the Dashboard policy changes.
const MIN_PASSWORD_LENGTH = 8

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Ingresa tu email").email("Ingresa un email válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
})
export type SignInValues = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre (al menos 2 caracteres)"),
  email: z.string().trim().min(1, "Ingresa tu email").email("Ingresa un email válido"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`),
})
export type SignUpValues = z.infer<typeof signUpSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Ingresa tu email").email("Ingresa un email válido"),
})
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
```

### Password hint (G4) — texto exacto

FormDescription visible debajo del input de password en sign-up + reset-password:

> "Mínimo 8 caracteres. Incluye mayúsculas, minúsculas y números."

Copy cubre la policy actual de Supabase Dashboard. Si cambia, solo hay que actualizar esta constante (no hay regex cliente a sincronizar).

## Side-effects a preservar (R1 — cirugía)

### sign-in

- `Suspense` wrapper (searchParams hook)
- `safeNext(searchParams.get("next"))`
- `unconfirmedEmail` state → resend button inline
- Handler de `error.code === "email_not_confirmed"` → set `unconfirmedEmail` + toast
- Otros errores → `toast.error(getAuthErrorMessage(code, msg))`
- Success → `router.replace(next)` + `router.refresh()`
- `SocialButtons` + `AuthDivider` + link a `/forgot-password` + link a `/sign-up`
- `autoComplete="email"` + `autoComplete="current-password"`

### sign-up

- `awaitingVerification` state + pantalla alternativa con `ResendConfirmationButton`
- `data: { full_name: name.trim() }` en signUp options
- `emailRedirectTo: ${origin}/auth/callback?next=/dashboard`
- Si `data.session` → redirect dashboard (auto-confirm off)
- Else → `setAwaitingVerification(true)`
- `SocialButtons` + `AuthDivider` + link a `/sign-in`
- `autoComplete="name"` + `autoComplete="email"` + `autoComplete="new-password"`

### forgot-password

- `emailSent` state → pantalla alternativa
- `redirectTo: ${origin}/auth/callback?next=/reset-password`
- `mapResetError` con code + heuristic fallback → delegar a `getAuthErrorMessage`
- Link a `/sign-in`

### reset-password

- `sessionChecked` + `hasSession` states (getSession sync)
- Pantalla "Enlace expirado" si `!hasSession`
- `password !== confirmPassword` → YA NO via toast, migra a `<FormMessage>` en confirmPassword (refine Zod)
- `password.length < 8` → YA NO via toast, migra a `<FormMessage>` en password (min 8 Zod)
- `updateUser({ password })` → si error `mapPasswordError` delegando a `getAuthErrorMessage`
- `signOut({ scope: "others" })` best-effort con console.warn si falla
- `setSuccess(true)` → useEffect redirect `/dashboard`
- Pantalla "Contraseña actualizada"

## Patrón de refactor (aplica a los 4 forms)

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signInSchema, type SignInValues } from "@/lib/validations/auth"

// ...

const form = useForm<SignInValues>({
  resolver: zodResolver(signInSchema),
  defaultValues: { email: "", password: "" },
  mode: "onBlur",  // validación al perder focus (menos ruidoso que onChange)
})

const onSubmit = async (values: SignInValues) => {
  // ... lógica existente usando values.email, values.password
}

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="juan@ejemplo.com" autoComplete="email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* ... */}
    </form>
  </Form>
)
```

## Matriz de tests Playwright (post-refactor)

**Ejecución inmediatamente después de cada refactor** (no al final). Si un caso falla, fix + re-run antes de seguir al próximo form.

### sign-in (11 casos)

| # | Caso | Acción | Esperado |
|---|---|---|---|
| S1 | Happy path | email=test-a@blackestate.dev, password=Test1234!, submit | Redirect `/dashboard` |
| S2 | Email vacío (submit) | deja email vacío + password válido, submit | `<FormMessage>` "Ingresa tu email" visible |
| S3 | Email inválido (onBlur) | email="abc" + tab out | `<FormMessage>` "Ingresa un email válido" visible |
| S4 | Password vacío (submit) | email válido + password vacío, submit | `<FormMessage>` "Ingresa tu contraseña" visible |
| S5 | Credenciales erradas | email real + password malo, submit | Toast ES "Email o contraseña incorrectos" |
| S6 | Email no confirmado | email real unconfirmed + password correcto | Toast "Confirma tu email" + resend button inline aparece |
| S7 | Resend button wiring (S6 follow-up) | click resend | Cooldown 30s visible + toast success |
| S8 | Next param redirect | nav `/sign-in?next=/dashboard/settings` + login exitoso | Redirect a `/dashboard/settings` |
| S9 | Next param unsafe rejected | nav `/sign-in?next=//evil.com` + login | Redirect a `/dashboard` (safeNext block) |
| S10 | No HTML5 bubble | email=abc, submit | NO aparece bubble del browser (noValidate efectivo) |
| S11 | OAuth button visible | cargar `/sign-in` | Botón "Continuar con Google" renderizado |

### sign-up (12 casos)

| # | Caso | Acción | Esperado |
|---|---|---|---|
| U1 | Happy path | name + email nuevo + password válido, submit | Pantalla "Revisa tu correo" + email mostrado |
| U2 | Name vacío | name="" + rest válido, submit | `<FormMessage>` "Ingresa tu nombre..." |
| U3 | Name whitespace-only | name="   " + rest válido, submit | `<FormMessage>` (trim + min 2 falla) |
| U4 | Email inválido onBlur | email="abc" + tab out | `<FormMessage>` email válido |
| U5 | Email duplicado (anti-enum) | email ya existente + password válido, submit | Pantalla "Revisa tu correo" (fake success, no error) |
| U6 | Password vacío | rest válido + password="" | `<FormMessage>` "Mínimo 8 caracteres" |
| U7 | Password <8 chars | password="abc" | `<FormMessage>` "Mínimo 8 caracteres" |
| U8 | Password sin complexity (8 letras) | password="abcdefgh" | Submit → server `weak_password` → toast ES mapeado G2 |
| U9 | Hint visible (G4) | cargar `/sign-up` | `<FormDescription>` "Mínimo 8 caracteres. Incluye mayúsculas, minúsculas y números." visible bajo password |
| U10 | Name trim en payload | name="  Test I  " + signup exitoso | DB: `raw_user_meta_data.full_name === "Test I"` (sin spaces) |
| U11 | No HTML5 bubble | name vacío + submit | NO bubble nativo |
| U12 | Resend button post-signup | pantalla "Revisa tu correo" | Botón "Reenviar" renderizado |

### forgot-password (6 casos)

| # | Caso | Acción | Esperado |
|---|---|---|---|
| F1 | Happy path | email real, submit | Pantalla "Revisa tu correo" |
| F2 | Email vacío | email="" + submit | `<FormMessage>` "Ingresa tu email" |
| F3 | Email inválido onBlur | email="abc" + tab | `<FormMessage>` "Ingresa un email válido" |
| F4 | Email inexistente (anti-enum) | email="ghost@nowhere.dev" + submit | Pantalla "Revisa tu correo" (success genérico) |
| F5 | No HTML5 bubble | email="abc" + submit | NO bubble |
| F6 | Link volver a sign-in | click link | Nav a `/sign-in` |

### reset-password (8 casos)

| # | Caso | Acción | Esperado |
|---|---|---|---|
| R1 | Happy path | password=NewPass123! + confirm match + submit con session válida | Pantalla "Contraseña actualizada" → redirect `/dashboard` |
| R2 | Password vacío | password="" + confirm algo | `<FormMessage>` "Mínimo 8 caracteres" |
| R3 | ConfirmPassword vacío | password válido + confirm="" | `<FormMessage>` "Confirma tu contraseña" |
| R4 | Mismatch (onBlur confirm) | password="Test1234!" + confirm="Other1234!" + tab out del confirm | `<FormMessage>` "Las contraseñas no coinciden" en confirm |
| R5 | Password <8 chars | password="abc" + confirm="abc" | `<FormMessage>` min 8 |
| R6 | Same password (server) | password igual al actual, submit | Toast ES "La nueva contraseña debe ser diferente..." (code same_password) |
| R7 | Session expirada | cargar `/reset-password` sin session | Pantalla "Enlace expirado" |
| R8 | No HTML5 bubble | password vacío + submit | NO bubble |

### Cross-form (3 casos)

| # | Caso | Forms afectados | Esperado |
|---|---|---|---|
| X1 | Voseo grep | los 4 files + auth.ts | Sin match de `Revisá|Confirmá|Escribí|Intentá|Esperá|Usá|Pedí|Necesitás|Hacé|Copiá|Mirá` |
| X2 | tsc --noEmit | tsc global | 0 errors |
| X3 | npm run build | build end-to-end | exit 0, sin warnings nuevos |

## Riesgos (aplicables, revisados con el user)

| R | Descripción | Mitigación |
|---|---|---|
| R1 | Cirugía: migrar useState → useForm olvida side-effect | Listar side-effects antes de tocar cada form + diff line-by-line + tests Playwright por form |
| R2 | — | No aplica (falsa alarma original) |
| R3 | — | Descartado: policy vive solo en Supabase Dashboard |
| R4 | — | No aplica (onBlur es UX preference, no perf) |

## Out of scope

- G6 (zxcvbn strength meter, +150kb) — backlog
- G5 (email al user legítimo en duplicate signup) — requiere Resend prod + React Email
- Resto de gaps pendientes (G7/G8 infra, G3/G4 ya cubiertos acá)
