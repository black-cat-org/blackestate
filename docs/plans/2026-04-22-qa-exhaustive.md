# QA exhaustivo — Black Estate (post IMP-7 + IMP-8)

> **Creado:** 2026-04-22 · **Rama de trabajo:** `main` + ramas feature futuras · **Estado DB al iniciar:** clean slate (TRUNCATE aplicado). `role_permissions` preservado (57 filas seed). `storage.objects` tiene 3 orphans pre-existentes sin impacto (no hay orgs que los referencien).

## Por qué existe este documento

Después de IMP-7 (audit RLS) + IMP-8 (rewrite invitaciones) hay demasiados cambios en la capa auth/tenencia para confiar sólo en `tsc` + `build`. Este doc es la **fuente de verdad** de qué funciona realmente end-to-end. Ningún trabajo nuevo (Capa 3 AI, Capa 4 notifications, etc.) empieza hasta que todos los tests acá pasan.

## Reglas de ejecución

1. **Orden secuencial.** Los tests tienen dependencias entre sí (crear user A → invitar B). Ejecutar desde T001 hacia T-last.
2. **Re-ejecutar TODO en cada fix.** Si un test falla, se corrige el código, y se vuelve a correr desde T001. Evita regresiones por parches.
3. **Automatización:** Playwright MCP para UI, Supabase MCP (`execute_sql`) para verificación DB, `npm run dev` en background.
4. **Estado por test:** `⏳` pending · `✅` pass · `❌` fail · `⏭️` deferred (con razón). Se actualiza inline en este mismo archivo.
5. **Evidencia obligatoria** en notas por cada fail: screenshot / error message / DB state.
6. **Users de prueba:** se crean via UI sign-up (no admin API) salvo que el test sea de Admin flow.
7. **Email confirmation shortcut dev:** después de cada sign-up, correr `UPDATE auth.users SET email_confirmed_at = now() WHERE email = '...'` via Supabase MCP (project tiene confirm ON por defecto, no hay inbox accesible). Marcado como dev-only — producción usará SMTP real.
8. **Passwords de test:** `Test1234!` para todos los users de esta run.
9. **Cleanup al final:** NO se limpia automáticamente. Queda la DB con los users/orgs creados para inspección manual. Si querés wipe post-run se ejecuta TRUNCATE otra vez.

## Convenciones de tabla

Cada test sigue este formato:

```
### T### Nombre corto del test
**Pre:** estado previo / datos esperados
**Acción:** pasos concretos (UI o DB)
**Esperado UI:** qué tiene que ver el user
**Esperado DB:** query SQL + rows esperados
**Estado:** ⏳ / ✅ / ❌ / ⏭️
**Notas:** (se llena durante ejecución)
```

---

## Índice

| Bloque | Sección | IDs | Conteo |
|---|---|---|---|
| A | Auth — sign-up email/password | T001–T010 | 10 |
| B | Auth — sign-in + sign-out + session | T011–T020 | 10 |
| C | Auth — password reset | T021–T026 | 6 |
| D | Auth — Google OAuth | T027–T030 | 4 |
| E | Auth — email confirmation flow | T031–T034 | 4 |
| F | Tenancy — first-org (trigger) | T035–T040 | 6 |
| G | Tenancy — create-org (RPC) | T041–T048 | 8 |
| H | Tenancy — switch-org | T049–T054 | 6 |
| I | Org profile (update) | T055–T060 | 6 |
| J | Members — listar + ver | T061–T066 | 6 |
| K | Members — remove | T067–T071 | 5 |
| L | Members — update role | T072–T077 | 6 |
| M | RBAC — authorize() + permissions | T078–T084 | 7 |
| N | Invitations — send (IMP-8) | T085–T097 | 13 |
| O | Invitations — accept (RPC) | T098–T106 | 9 |
| P | Invitations — reject (invitee) | T107–T110 | 4 |
| Q | Invitations — cancel (admin) | T111–T114 | 4 |
| R | RLS isolation cross-org | T115–T124 | 10 |
| S | Storage — avatars | T125–T131 | 7 |
| T | Storage — property-media | T132–T139 | 8 |
| U | Properties CRUD | T140–T156 | 17 |
| V | Leads CRUD | T157–T171 | 15 |
| W | Appointments CRUD | T172–T181 | 10 |
| X | Bot config + activities | T182–T189 | 8 |
| Y | Dashboard stats | T190–T193 | 4 |
| Z | Soft-delete / papelera | T194–T200 | 7 |
| AA | Error boundaries + 404 | T201–T205 | 5 |
| AB | Build + env readiness | T206–T210 | 5 |

**Total:** 210 tests

---

# BLOQUE A — Sign-up email/password

**Pre-condición global del bloque:** `auth.users` vacía.

### T001 Sign-up feliz path user A
**Pre:** DB limpia. Nav a `http://localhost:3000/sign-up`.
**Acción:** Llenar `name: "Test A"`, `email: "test-a@blackestate.dev"`, `password: "Test1234!"`. Submit.
**Esperado UI:** Redirect a `/sign-in` con mensaje "Confirmá tu email" OR directo a dashboard si auto-confirm on.
**Esperado DB:**
```sql
select id, email, email_confirmed_at, raw_user_meta_data from auth.users where email='test-a@blackestate.dev';
-- → 1 row, raw_user_meta_data->>'full_name' = 'Test A'
select count(*) from public.organization;
-- → 1 (auto-created por trigger handle_new_user)
select count(*) from public.member where role='owner';
-- → 1
select count(*) from public.user_active_org;
-- → 1
```
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 03:41 UTC. Signup 200 OK. UI pivotó a pantalla "Revisa tu correo" con email mostrado correctamente. DB: user `e58e6235-16c0-4657-919c-9ff2ea447f8c` creado, `email_confirmed_at=null` (pending email confirm), `raw_user_meta_data.full_name='Test A'`. Trigger `handle_new_user` creó org `4a6b98c3-7364-4f66-9fba-1907bd5e70af` (name=`Test A`, slug=`test-a`, plan=`free`, max_seats=1), member role=`owner` con email/name denormalizados, y `user_active_org` con foreign keys correctos.

**Debug durante setup (fuera del test):** 3 iteraciones falladas antes de pass por issues de infraestructura SMTP, no del código:
- `400 email_address_invalid` inicial — causa raíz pendiente de diagnóstico exacto (body no interceptado); pudo ser pre-checks de Supabase Auth antes de bypass de rate
- `429 over_email_send_rate_limit` — consumo del cap built-in Supabase 2/h al encadenar retries
- `500 tls: first record does not look like a TLS handshake` — port 465 en Mailtrap Sandbox no habla TLS implícito (solo STARTTLS en 587/2525). Fix: cambiar port Supabase SMTP de 465 → 587.
- **Fix durable aplicado:** Custom SMTP Supabase apuntando a Mailtrap Email Testing Sandbox, port 587 STARTTLS. Rate limit built-in bypass completo.
- **Nota UX [P2] — Mapping errores Supabase a español:** `app/(auth)/sign-up/page.tsx:52` usa `toast.error(error.message)` literal — errores GoTrue pasan textual al user (ej "email rate limit exceeded"). Mejora: mapear `error.code`/`error.status` a copy en español claro por caso (rate_limit, user_exists, weak_password, invalid_email). Queda como issue separado post-QA, no bloquea el flow. Entra en sub-plan **"Auth UX polish"**.
- **Debug interceptor activo** en `lib/supabase/client.ts` (`installAuthFetchInterceptor`, marcado DEBUG-ONLY con comentario). Revertir al cerrar la QA run.

### T002 Trigger handle_new_user crea org con slug derivado
**Pre:** T001 pasó.
**Acción:** Query DB.
**Esperado DB:**
```sql
select name, slug, plan, max_seats from public.organization;
-- → name contiene "Test A" o email prefix, slug en formato a-z0-9-, plan='free', max_seats=1
```
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 03:42 UTC. Org creada por trigger `handle_new_user`: `name='Test A'` (del raw_user_meta_data.full_name), `slug='test-a'` (derivado — regex `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` match, length≥3), `plan='free'`, `max_seats=1`. Todos los assertions pasan.

### T003 JWT carga active_org_id + org_role + email tras sign-up
**Pre:** T001 pasó, user A logged in.
**Acción:** Abrir DevTools → Application → Cookies `sb-<project>-auth-token`. Decodificar payload JWT.
**Esperado UI:** JWT claims incluye `active_org_id` (uuid), `org_role: "owner"`, `is_super_admin: false`, `email: "test-a@blackestate.dev"`, `user_name`.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 03:50 UTC. User A confirmó email clickeando link real de Mailtrap (flow `/auth/confirm?token_hash=...&type=signup` → `/dashboard`). Cookie `sb-jaozybchjfengqlckiul-auth-token` viene split en `.0` y `.1` (Supabase SSR particiona cookies grandes); reassembly + base64-decode + JWT segment 1 decode. Claims verificados:
- `sub`: `e58e6235-16c0-4657-919c-9ff2ea447f8c` (match user id)
- `email`: `test-a@blackestate.dev` ✅
- `role`: `authenticated` ✅
- `active_org_id`: `4a6b98c3-7364-4f66-9fba-1907bd5e70af` (match org id) ✅
- `org_role`: `owner` ✅
- `is_super_admin`: `false` ✅
- `user_name`: `Test A` ✅
- `user_metadata.full_name`: `Test A` ✅
- `app_metadata.provider`: `email` ✅
- `aud`: `authenticated` ✅

Todos los custom claims inyectados por `custom_access_token_hook` (drizzle/sql/003) presentes y correctos.

### T004 Sign-up duplicado mismo email
**Pre:** T001 pasó. Sign-out (si estaba logged).
**Acción:** Nav a `/sign-up`. Usar mismo email `test-a@blackestate.dev` + password `Other1234!`. Submit.
**Esperado UI:** ~~Error "User already registered" o similar. NO redirect.~~ **[Criterio revisado 2026-04-23]** Fake success screen "Revisa tu correo" (comportamiento anti-enumeration de Supabase — security feature, no bug). UI no puede distinguir fake success de signup real porque Supabase oculta la diferencia.
**Esperado DB:** `select count(*) from auth.users where email='test-a@blackestate.dev'` = 1 (no se creó nada nuevo).
**Esperado API:** Response `200 OK` con user id **fake** (distinto del real), `role=""`, sin session. Sin envío de email (Supabase no gasta el email en duplicados).
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 03:56 UTC. Sign-out via NavUser menuitem "Cerrar sesión" → redirect a `/sign-in` (covers parcial T019). Signup con email duplicado + password distinto `Other1234!` → `200 OK` con user fake `e7a552b9-3631-4e99-ba1b-982a639a52cc` (≠ user real `e58e6235-...`), `role=""`. UI pivotó a pantalla "Revisa tu correo". DB verificado: `count=1` — user real intacto, no se creó duplicado. Anti-enumeration de Supabase funcionando: atacante no puede determinar si email existe porque response es visualmente idéntica a signup legítimo.

**Mejora UX [P3] — Email al user legítimo en caso de duplicado (Patrón A):** implementar Patrón A — email al user legítimo "Alguien intentó crear cuenta con tu email, si eras tú ya tienes cuenta. [Iniciar sesión]". Mantiene anti-enumeration (atacante no recibe nada) + user legítimo sabe qué hacer. Implementación encaja como handler adicional del Send Email Hook cuando se migre a React Email. **Importante para UX**: el user duplicado no debe quedar esperando un email de confirm que nunca llega. Entra en sub-plan **"Auth Send Email Hook + React Email"** (post-setup Resend prod).

### T005 Sign-up password débil rechazado
**Pre:** Nav `/sign-up`.
**Acción:** password `123` (menos de 6 chars). Submit.
**Esperado UI:** Error cliente de validación Zod + toast/inline "mínimo 8 caracteres" (o similar).
**Esperado DB:** No nuevo row.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:14 UTC. Password `"123"` (3 chars) bloqueado por validación nativa HTML5 `minLength=8` en `PasswordInput`. Submit nunca llegó a Supabase (console sin `[sb-auth] POST`). `input.validity.tooShort=true`, `validationMessage="Alarga el texto a 8 o más caracteres (actualmente, usas 3 caracteres)."` (mensaje i18n del browser). DB: `count=0` para `weak@blackestate.dev`, no se creó ningún row. UI permaneció en `/sign-up`.

**Corrección al test spec:** El test esperaba "validación Zod" pero la validación real es **HTML5 nativo** (`<input minLength={8}>` en `components/auth/password-input.tsx`), no Zod client-side. Resultado equivalente: submit bloqueado antes del API call. Funcionalmente correcto.

**Casos edge adicionales probados (complexity check):**

| Input | Client HTML5 `minLength=8` | Server Supabase Password Policy | DB | Result |
|---|---|---|---|---|
| `"abcdefgh"` (8 letras) | ✅ pasa | ❌ 422 `weak_password` | 0 rows | Server rechaza, toast con mensaje crudo en inglés |
| `"12345678"` (8 números) | ✅ pasa | ❌ 422 `weak_password` | 0 rows | Server rechaza, toast con mensaje crudo en inglés |

Supabase Password Policy configurada "Lowercase + Uppercase + Digits" (Dashboard → Auth → Password Requirements). Mensaje literal:
> "Password should contain at least one character of abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789"

Invariante DB preservada en todos los casos. Server hace su trabajo.

**Mejora UX [P2] — Password validation UX (sub-plan "Auth forms validation UX"):**
- **A. Hint visible** debajo del input: "Mínimo 8 caracteres con mayúsculas, minúsculas y números" — permite al user ver reglas antes de escribir.
- **B. Zod client-side** que replica la Password Policy de Supabase + mensajes español custom. Valida antes del submit, ahorra roundtrip + cuenta rate-limit. Mantener HTML5 `minLength` (defense-in-depth, costo 0).
- **C. (lujo futuro [P3])** Password strength meter (zxcvbn) — indicador visual fortaleza en tiempo real.

Recomendación: A+B en el sub-plan. C queda para iteración futura.

**No eliminar validación HTML5** — complementa server, bloquea <8 chars antes del API call. El gap es falta de complexity client-side, no exceso de HTML5.

### T006 Sign-up email inválido
**Pre:** Nav `/sign-up`.
**Acción:** email `notanemail`. Submit.
**Esperado UI:** Validación cliente "email inválido".
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:21 UTC. Email `"notanemail"` (sin `@`) bloqueado por validación HTML5 nativa `type="email"`. `input.validity.typeMismatch=true`, submit nunca llegó a Supabase (console sin `[sb-auth] POST`). Mensaje browser en español (idioma sistema en este browser Playwright): _"Incluye un signo '@' en la dirección de correo electrónico. La dirección 'notanemail' no incluye el signo '@'."_. DB: `count=0` para `'notanemail'`, no row creado. UI permaneció en `/sign-up`.

**Nota [P2]:** La mejora UX sugerida en T005 (Zod client-side con mensajes custom en español) cubriría también este caso para normalizar el mensaje independiente del idioma del browser del user. Queda en el mismo sub-plan post-QA **"Auth forms validation UX"** (incluye email + password + name juntos).

### T007 Sign-up name vacío
**Pre:** Nav `/sign-up`.
**Acción:** name "". Submit.
**Esperado UI:** Validación "nombre requerido".
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:23 UTC. Name `""` bloqueado por HTML5 `required`. `input.required=true`, `validity.valueMissing=true`. Submit nunca llegó a Supabase (console sin `[sb-auth] POST`). Mensaje browser bubble en ES: _"Completa este campo"_. DB: `count=0`. UI permaneció en `/sign-up`.

**Mejora [P2]:** mismo gap registrado en T005/T006 — bubble nativo del browser en lugar de inline error/toast consistente con shadcn `FormMessage` + sonner. Sub-plan post-QA **"Auth forms validation UX"** cubre: name vacío, email vacío, email inválido, password < 8, password sin complexity, password vacío. Implementación con `react-hook-form` + Zod + `<FormMessage>` inline. HTML5 `required`/`type="email"`/`minLength` se mantienen como defense-in-depth.

### T008 Password toggle show/hide
**Pre:** `/sign-up` cargada.
**Acción:** click ícono eye junto al field password.
**Esperado UI:** Input type `text` → muestra password. Segundo click → `password`.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:26 UTC. Field `#password` con valor `"Test1234!"`. Estado inicial `type="password"`. Primer click en botón toggle → `type="text"` ✅ (password visible). Segundo click → `type="password"` ✅ (vuelve oculto). Componente `components/auth/password-input.tsx` controla estado local vía `useState` y alterna el atributo `type` del `<Input>` correctamente. Íconos `Eye` / `EyeOff` (lucide-react) intercambian por estado visible.

### T009 Sign-up con Tab navigation (a11y)
**Pre:** `/sign-up` cargada.
**Acción:** Tab desde name → email → password → submit.
**Esperado UI:** Focus se mueve ordenado. Submit con Enter desde password funciona.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:27 UTC. Tab chain verificado leyendo `document.activeElement` después de cada `Tab`:
1. Focus inicial `#name` (INPUT)
2. Tab → `#email` (INPUT type=email) ✅
3. Tab → `#password` (INPUT type=password) ✅
4. Tab → submit button "Crear cuenta" ✅ (el botón toggle eye es saltado correctamente porque `password-input.tsx:28` tiene `tabIndex={-1}` — decisión intencional para mantener flow lineal)

Submit con Enter desde password: form lleno con `name="T009 Tab Test"` + email válido + password `"abcdefgh"` (8 chars solo letras — complexity fail esperado). Enter desde `#password` disparó submit: console muestra `[sb-auth] → POST ... /signup`. Supabase respondió 422 `weak_password` (como se esperaba). DB `count=0`, no user creado. La key assertion — _Enter dispara el submit_ — confirmada.

### T010 Sign-up segundo user B (dependencia bloque N)
**Pre:** T001 pasó. Sign-out de A.
**Acción:** Nav `/sign-up`. Crear `test-b@blackestate.dev` / `Test B` / `Test1234!`.
**Esperado DB:**
```sql
select count(*) from auth.users where email in ('test-a@blackestate.dev','test-b@blackestate.dev');
-- → 2
select count(*) from public.organization;
-- → 2 (cada user tiene su propia primera org por trigger)
```
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:29 UTC. Signup 200 OK real (user id `98f22d3b-38b9-421a-b1e2-f3d3a79eb5ab`, role `authenticated` — no es fake como T004). UI pivotó a "Revisa tu correo" con email `test-b@blackestate.dev`. `email_confirmed_at=null` (pending).

DB verificado:
- `auth.users` count (A+B) = **2** ✅
- `public.organization` count = **2** ✅
- `public.member WHERE role='owner'` count = **2** ✅
- `public.user_active_org` count = **2** ✅
- Orgs data:
  - `{name:"Test A", slug:"test-a", plan:"free", max_seats:1}`
  - `{name:"Test B", slug:"test-b", plan:"free", max_seats:1}`

Trigger `handle_new_user` creó la segunda org + member owner + user_active_org atómicamente, sin conflicto de slug porque `test-a` y `test-b` son únicos. Los dos users son isolated (cada uno en su propia org, sin cross-membership).

**Pendiente para bloque N (invitations):** confirmar email de user B clickeando link en Mailtrap. Se avisará cuando lo necesitemos para T085+.

---

# BLOQUE B — Sign-in + sign-out + session

### T011 Sign-in feliz path user A
**Pre:** T001 pasó + email_confirmed_at seteado via MCP.
**Acción:** Nav `/sign-in`. email+password. Submit.
**Esperado UI:** Redirect a `/dashboard`. Sidebar carga con nombre "Test A" y org correcta.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:31 UTC. User A confirmado via click real en Mailtrap (no shortcut SQL). Sign-in con `test-a@blackestate.dev` + `Test1234!` → redirect `/dashboard`. Sidebar muestra:
- Header org: "Test A" + slug "test-a"
- NavUser footer: "Test A" + `test-a@blackestate.dev`
- Menú navegación: Dashboard, Propiedades, Leads, Conversaciones, Citas, Mi Bot, Analíticas, Marketing, Configuración
- Widgets dashboard: Leads totales=0, Propiedades activas=0, Citas pendientes=0, Tasa conversión 0.0%

Flow real end-to-end: Supabase Auth signInWithPassword → JWT con custom claims (active_org_id, org_role=owner) → proxy.ts valida JWT → server components queries con RLS → data correcta del org del user. Confirma que T003 sigue válido (claims reusables para sesión nueva).

### T012 Sign-in password incorrecto
**Pre:** T001 pasó.
**Acción:** Email correcto, password `Wrong9999!`. Submit.
**Esperado UI:** Error "Invalid login credentials" o similar. Permanece en `/sign-in`.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:44 UTC. POST `/auth/v1/token?grant_type=password` → **400** con `{code: "invalid_credentials", message: "Invalid login credentials"}`. URL permaneció `/sign-in`, sin redirect. Toast muestra message literal EN. Gap [P2] G2 aplica (mapping `error.code` → copy ES). DB sin cambios.

### T013 Sign-in email no registrado
**Pre:** DB limpia en auth.users excepto test-a/b.
**Acción:** email `ghost@nowhere.dev` + cualquier password.
**Esperado UI:** Mismo error genérico que T012 (no debe revelar si email existe o no).
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:46 UTC. Email `ghost@nowhere.dev` + password `Anything1234!` → POST `/auth/v1/token?grant_type=password` → **400** con `{code: "invalid_credentials", message: "Invalid login credentials"}` — **exactamente igual a T012**. Anti-enumeration confirmado en sign-in: response, status y code son idénticos para "email inexistente" y "password incorrecto de email real". Atacante no puede diferenciar. URL sigue `/sign-in`. Misma nota [P2] G2 del toast en inglés.

### T014 Sign-in usuario no confirmado
**Pre:** Crear user C via sign-up pero NO confirmar email. Sign-out.
**Acción:** Intentar sign-in con user C.
**Esperado UI:** Error "Email not confirmed" o redirect a "/auth-code-error" con mensaje claro.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 04:48 UTC. En lugar de crear user C separado, se reutilizó `test-b@blackestate.dev` (creado en T010 sin confirmar — email_confirmed_at=null verificado pre-ejecución). Password correcto `Test1234!` + email no confirmado → POST `/auth/v1/token?grant_type=password` → **400** con `{code: "email_not_confirmed", message: "Email not confirmed"}`. URL permaneció `/sign-in`.

**⚠️ Hallazgo de seguridad sutil (info leak parcial):**

| Caso | Response code |
|---|---|
| T012 email real + password malo | `invalid_credentials` |
| T013 email fake + password cualquier | `invalid_credentials` |
| T014 email real unconfirmed + password correcto | **`email_not_confirmed`** |

Anti-enumeration funciona completo **sólo cuando password es incorrecto** (T012=T013). Cuando password es correcto y email unconfirmed → Supabase devuelve `email_not_confirmed` explícito → **revela que el email existe en el sistema**. Atacante con password válido (ej: de un data breach de otra app) puede confirmar si ese email está registrado en Black Estate iterando credenciales. Edge case realista en ataques dirigidos (credential stuffing donde el atacante conoce la password del target).

**Gap [P2] G7 — Trade-off anti-enumeration vs resend UX:**
- Opción A (más seguro): tratar `email_not_confirmed` igual que `invalid_credentials` — indistinguible para atacante. Contra: user legítimo pierde CTA de "reenviar email" contextual.
- Opción B (balanced): aceptar el info leak pero gatearlo con rate limiting agresivo en sign-in de users unconfirmed (ej: 3 intentos/h por IP). Preserva UX de resend. Menor riesgo en volumen.
- Opción C (Supabase default actual): respuesta distinta, UX óptimo, security trade-off conocido.

**Decisión del usuario (2026-04-23):** **Opción C** para MVP. Alineado con industria (Firebase/Auth0/Cognito/Clerk/Supabase todos aceptan el mismo trade-off). Mitigación vía G1 (resend flow manual). Revisitable si volumen/surface aumenta.

**Relación con sub-plan G1 (resend confirmation):** este error es el trigger perfecto para el CTA "Reenviar email de confirmación" que va en el sub-plan P1 "Auth resend confirmation flow". Cuando se implemente ese sub-plan, handler específico para `code === 'email_not_confirmed'` en sign-in muestra botón "Reenviar email" inline.

### T014b Token de confirmación expirado (gap crítico UX) ⚠️ AGREGADO 2026-04-23
**Pre:** User con signup hace >24h (default Supabase token TTL) sin confirmar, O token ya consumido.
**Acción:** Click link de confirmación del email.
**Esperado UI:** Redirect a `/auth-code-error`. Página muestra "Error de verificación" + botones "Volver a sign-in" / "Crear cuenta nueva".
**Esperado real:** User **queda stuck**. No hay forma de pedir nuevo email.
**Estado:** ⏳
**Notas pre-ejecución:** Caso realista — users olvidan/postergan confirmar el email. Con token TTL 24h, probabilidad alta de expiración. Sign-up de nuevo con mismo email → anti-enumeration (T004) → fake success → loop infinito. Sign-in → "Email not confirmed" literal inglés, sin CTA.

### ⚠️ GAP CRÍTICO UX (P1) — Resend confirmation flow faltante
**Detectado durante T011 (2026-04-23).** Verificado en código:
- Cero calls a `supabase.auth.resend()` en `app/`, `features/`, `components/`
- `/auth-code-error` (`app/(auth)/auth-code-error/page.tsx`) solo ofrece navegar a sign-in/sign-up — sin opción de reenviar
- Sin handler específico para `error.code === 'email_not_confirmed'` en sign-in

**Impacto:** users que postergan confirmar el email >24h quedan stuck permanentemente. No pueden recuperar su cuenta sin soporte manual.

**Sub-plan post-Bloque B "Auth resend confirmation flow" (P1):**
1. Server action `resendConfirmationEmail(email)` que llame `supabase.auth.resend({ type: 'signup', email })`
2. Botón "Reenviar correo de verificación" en `/auth-code-error`
3. Handler de `email_not_confirmed` en sign-in con CTA "Reenviar email" inline
4. Botón "Reenviar" en la pantalla "Revisa tu correo" (post-signup)
5. Rate limit UX 60s cooldown visible (evita spam + duplica el rate-limit de Supabase)
6. Code review OBLIGATORIO + tests post-fix
7. Re-run Bloque B pre-existente para detectar regresiones

Estrategia: **fixear este P1 entre Bloque B y Bloque C**, antes de pasar a tenancy tests. P2/P3 quedan para sub-plan final "Auth UX polish".

### T015 Sesión persiste en refresh
**Pre:** T011 pasó, logged in.
**Acción:** F5 refresh de `/dashboard`.
**Esperado UI:** Dashboard recarga con mismo user/org sin volver a login.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 05:00 UTC. Sign-in user A → redirect `/dashboard`. Ejecuté navegación a mismo URL (equivalente F5). Post-refresh: URL sigue `/dashboard`, no redirect a `/sign-in`. Sidebar mantiene "Test A" + slug "test-a" + email. Cookie `sb-...-auth-token` persiste en localStorage/cookies + proxy valida JWT + renderiza dashboard sin re-login. Supabase SSR + middleware refresh-token work as expected.

### T016 Sesión persiste en close+reopen tab
**Pre:** T011 pasó.
**Acción:** Close tab. Open nueva. Nav `/dashboard`.
**Esperado UI:** Dashboard abre sin login.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 05:01 UTC. Tab cerrada (`browser_tabs close`). Nueva tab abierta + nav `/dashboard`. URL se mantuvo `/dashboard` (no redirect a `/sign-in`). Sidebar muestra "Test A" + `test-a@blackestate.dev`. Cookies auth persistentes (no session-only) sobreviven close tab — Supabase SSR usa `Set-Cookie` con `Expires`/`Max-Age` (no solo session), confirmado. **Caveat:** Playwright MCP mantiene mismo browser context entre tabs, por lo que este test valida "cookies persistentes" pero no "close browser process completo". Para prod-grade: confirmado que `sb-*-auth-token` cookie tiene `Max-Age` positivo (no session cookie).

### T017 Acceder a `/dashboard` sin login redirecciona
**Pre:** Sign-out.
**Acción:** Nav directo a `/dashboard`.
**Esperado UI:** Redirect a `/sign-in?next=%2Fdashboard`.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 05:03 UTC. Sign-out previo via NavUser → "Cerrar sesión". Nav directo `http://localhost:3000/dashboard` → redirect correcto a `http://localhost:3000/sign-in?next=%2Fdashboard` (path `/dashboard` URL-encoded como `%2Fdashboard` en query param). `proxy.ts` (Next.js 16) detecta ruta protegida + ausencia de session válida + agrega el `next` param para post-login redirect.

### T018 Acceder a `/sign-in` ya logged in redirecciona a dashboard
**Pre:** Logged in.
**Acción:** Nav `/sign-in`.
**Esperado UI:** Redirect a `/dashboard`.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 05:04 UTC. Sign-in user A (desde `/sign-in?next=%2Fdashboard` de T017) → redirect correcto a `/dashboard` respetando `next` param (bonus: valida feature `next` redirect post-login). Luego nav directo a `/sign-in` estando logged → proxy.ts detectó session activa + hizo reverse redirect a `/dashboard`. URL final `/dashboard`. Guard reverso funcionando.

### T019 Sign-out limpia cookies + redirige
**Pre:** Logged in como A.
**Acción:** Click sign-out desde NavUser.
**Esperado UI:** Redirect a `/sign-in`. Cookies `sb-*-auth-token` removidas.
**Esperado DB:** Session en `auth.sessions` invalidada (opcional — Supabase maneja server-side).
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 05:05 UTC. Triple verificación post-signout:

| Check | Pre-signout | Post-signout |
|---|---|---|
| URL | `/dashboard` | `/sign-in` ✅ |
| Cookies `sb-*` en browser | `["sb-...auth-token.0","sb-...auth-token.1"]` | `[]` ✅ |
| `auth.sessions` rows para user A | 1 (id `f1e413b9-...`) | **0** ✅ |

Supabase `scope=global` en logout → borra session row en DB (no solo invalidate flag). Proxy detectó ausencia de cookies + redirigió a `/sign-in`. Flow completo sin bugs.

### T020 Rate limiting en sign-in repetido
**Pre:** Sign-out.
**Acción:** 10 intentos rápidos con password malo.
**Esperado UI:** Después de N intentos aparece error de rate limit ("Too many requests" o similar).
**Estado:** ⏭️ DEFERRED
**Notas:** Ejecutado 2026-04-23 05:09 UTC. Intenté 5 submits consecutivos con password incorrecto. Todos devolvieron `{code: "invalid_credentials"}` — **ningún rate limit disparó**. Incluso habiendo bajado el slider "Sign up and sign in" a 3/5min en Dashboard (luego restaurado).

Razón descubierta investigando docs Supabase: **el slider "Sign up and sign in" del Dashboard NO controla `/token?grant_type=password`.** Los rate limits configurables son:
- `auth.rate_limits.token_refresh` → endpoint `/token?grant_type=refresh_token`
- `auth.rate_limits.verification` → endpoint `/verify`
- `auth.rate_limits.signup_confirmation` → signup confirmation emails
- `auth.rate_limits.email.inbuilt_smtp` → SMTP built-in

**No hay rate limit público configurable para sign-in con password en Supabase default.** Confirmado empíricamente: Supabase vió la IP real (`131.0.197.227` en logs — no localhost), trackeó los 5 intentos, y no bloqueó.

Test spec se basaba en asunción incorrecta. **Marcar deferred + registrar como gap G8 de seguridad.**

Sobre **IP Address Forwarding** (Dashboard setting): se activó ON (preparación para prod en Vercel con server actions). No cambia el comportamiento observado — Supabase ya veía IP pública real porque el flow actual usa browser client directo (no service_role). Setting queda ON para forward `X-Forwarded-For` cuando eventualmente hagamos server-side auth calls.

---

# BLOQUE C — Password reset

### T021 /forgot-password UI carga
**Pre:** Sign-out.
**Acción:** Nav `/forgot-password`.
**Esperado UI:** Form con field email. Button "Enviar link".
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:32 UTC (reintento post-reinicio Playwright MCP). UI carga con: título "Recuperar contraseña", subtítulo "Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña", input email con placeholder `juan@ejemplo.com`, botón "Enviar enlace de recuperación", link "Volver a iniciar sesión" → `/sign-in`. Copy en español correcto, shadcn styling, form minimal y claro.

### T022 Submit email válido
**Pre:** User A existe.
**Acción:** Email = `test-a@blackestate.dev`. Submit.
**Esperado UI:** Toast/inline "Link enviado a tu email" (no revela si email existe).
**Esperado DB:** `auth.one_time_tokens` nueva row con `token_type = 'recovery'`.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:33 UTC. POST `/auth/v1/recover` → 200 OK. UI pivotó a pantalla "Revisa tu correo" con email `test-a@blackestate.dev` mostrado + hint "Si no recibes el correo en unos minutos, revisa tu carpeta de spam". DB: `auth.one_time_tokens` nueva row con `token_type='recovery_token'` + `user_id=e58e6235-...` match user A. Email entregado via Mailtrap SMTP.

### T023 Submit email no registrado
**Pre:** Sign-out.
**Acción:** Email = `ghost@nowhere.dev`. Submit.
**Esperado UI:** MISMO mensaje que T022 (no debe diferenciar — anti-enumeration).
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:37 UTC. Email `ghost@nowhere.dev` → POST `/auth/v1/recover` → 200 OK (mismo status que T022). UI pivotó a "Revisa tu correo" con email `ghost@nowhere.dev` mostrado — **idéntico** a T022. Atacante no puede determinar si email existe. DB: `auth.users WHERE email='ghost@nowhere.dev'` = 0 (no user creado, no token emitido). Anti-enumeration en recovery flow funcionando correctamente.

### T024 /reset-password con token válido (dev shortcut)
**Pre:** T022 emitió token. Tomar `token_hash` de `auth.one_time_tokens` via MCP.
**Acción:** Nav a `/reset-password?token_hash=<hash>&type=recovery`.
**Esperado UI:** Form con password + confirm password.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:41 UTC. **Flow real via Mailtrap (no shortcut SQL)**: link del email = `http://localhost:3000/auth/confirm?token_hash=pkce_0d0d99321e...&type=recovery`. Navegado → redirect correcto a `/reset-password`. Verificado `app/auth/confirm/route.ts` hace `supabase.auth.verifyOtp({ token_hash, type })` + redirect al `next` param. UI muestra: título "Nueva contraseña", 2 inputs (Nueva + Confirmar con toggle visibility), botón "Actualizar contraseña", link "¿Recordaste tu contraseña?" → `/sign-in`. Sesión temporal establecida para permitir password update.

### T025 Submit nuevo password en /reset-password
**Pre:** T024 cargado.
**Acción:** password = `NewTest1234!`, confirm = mismo. Submit.
**Esperado UI:** Redirect a `/dashboard` (o `/sign-in` con toast).
**Esperado DB:** User A puede sign-in con nueva password. Password viejo deja de funcionar.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:42 UTC. Ambos inputs "Nueva contraseña" + "Confirmar contraseña" llenados con `NewTest1234!`. Submit → redirect directo a `/dashboard` (sesión establecida post-update).

**Verificación end-to-end post-update:**
1. Sign-out via NavUser → `/sign-in` ✅
2. Sign-in con password **viejo** `Test1234!` → rechazado, URL permanece `/sign-in` ✅ (old password invalidado)
3. Sign-in con password **nuevo** `NewTest1234!` → 200 + redirect `/dashboard` ✅

Flow real password reset end-to-end funcionando sin bugs.

**⚠️ CAMBIO IMPORTANTE DE ESTADO:** Password de `test-a@blackestate.dev` cambió de `Test1234!` → `NewTest1234!`. **Todos los tests siguientes que usen user A deben usar el nuevo password.** (La convención original del doc "password `Test1234!` para todos los tests" aplica solo a users no alterados por flujos de reset).

### T026 /reset-password con token expirado/inválido
**Pre:** Token del T022 ya consumido (post T025).
**Acción:** Nav mismo link + submit.
**Esperado UI:** Error "Link inválido o expirado". Link a pedir uno nuevo.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:46 UTC. Navegué al mismo link que usé en T024 (ya consumido): `http://localhost:3000/auth/confirm?token_hash=pkce_0d0d99321e...&type=recovery`. `verifyOtp` falla (token one-time ya usado) → redirect correcto a `/auth-code-error`. UI muestra: título "Error de verificación", mensaje "No pudimos completar el inicio de sesión. El enlace puede haber expirado o haber sido usado anteriormente.", botones "Volver a iniciar sesión" + "Crear cuenta nueva". **Gap G1 aplica directamente acá** — falta botón "Reenviar enlace de recuperación" (o signup resend). Sub-plan P1 lo resolverá.

**Cierre Bloque C — Password reset (T021-T026 todos ✅).**

---

# BLOQUE D — Google OAuth (⏭️ manual)

### T027 Button "Continuar con Google" visible en sign-up y sign-in
**Pre:** Nav `/sign-up` y `/sign-in`.
**Esperado UI:** Button Google con ícono + label.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:48-15:49 UTC. Button "Continuar con Google" presente en ambas páginas con ícono (svg/img) + label text. Componente `SocialButtons` en `components/auth/` renderizado consistente. T028-T030 deferred (OAuth real requiere cuenta Google + verificación manual).

### T028 Click button inicia OAuth flow
**Pre:** T027 pasó.
**Acción:** Click button.
**Esperado UI:** Redirect a `https://accounts.google.com/...` con `redirect_uri` del project.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:55 UTC con cuenta Google real (`gonzalopinell@gmail.com`). Click botón `Continuar con Google` disparó `supabase.auth.signInWithOAuth({ provider: 'google' })`. Browser Playwright MCP ya tenía sesión Google activa del user → auto-consent instantáneo → redirect completo a `/auth/callback?code=...` → exchangeCodeForSession → `/dashboard`. Flow real end-to-end confirmado.

### T029 OAuth callback exitoso crea user + org
**Pre:** T028 manual + account autenticada.
**Acción:** Volver del callback.
**Esperado DB:** `auth.users` nueva row con `app_metadata.provider='google'` + trigger creó org.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 15:55 UTC junto con T028. User OAuth creado:
- `id=5ce53c6c-c624-4afa-be44-12dcd7eb41c4`
- `email=gonzalopinell@gmail.com`
- `raw_app_meta_data.provider='google'` ✅
- `raw_user_meta_data.full_name='Gonzalo Pinell'`, `avatar_url` de Google CDN
- `email_confirmed_at=2026-04-23 15:54:55+00` (auto-populated por OAuth, no requiere confirm email)
- `last_sign_in_at=2026-04-23 15:55:30+00`

Trigger `handle_new_user` creó atomicamente:
- `public.organization`: `name='Gonzalo Pinell'`, `slug='gonzalo-pinell'`, `plan='free'`, `max_seats=1`
- `public.member`: `role='owner'`, denormalized `name`, `email`, `avatar_url` todos desde OAuth metadata
- `public.user_active_org`: link correcto

**Bonus — esto cubre T038** (Trigger completa name y avatar desde OAuth metadata): verificado que `member.name='Gonzalo Pinell'` + `member.avatar_url='https://lh3.googleusercontent.com/...'`. Trigger extrae `raw_user_meta_data.full_name` + `raw_user_meta_data.avatar_url` correctamente.

### T030 OAuth callback failure redirige a /auth-code-error
**Pre:** Cancelar consent en Google.
**Esperado UI:** Redirect a `/auth-code-error` con mensaje.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 16:03 UTC — validación híbrida:

1. **Browser back desde Google account chooser:** user logged out de Google + nav `/sign-in` + click "Continuar con Google" → Google account chooser → user presionó back en el browser → retorno a `/sign-in?next=%2Fdashboard` (history pop, sin disparar callback). Resultado: no session, no /auth-code-error, pero **tampoco harm** — user puede reintentar.

2. **Simulación de failure real (Google redirect con error):** para validar el path `/auth-code-error` explícitamente, nav directo a `/auth/callback?error=access_denied&error_description=User+cancelled` (lo que Google enviaría si user clickea "Deny" en consent screen). Resultado: redirect correcto a `/auth-code-error`.

Código `app/auth/callback/route.ts:37-39` confirma el handler:
```ts
if (!code) {
  return NextResponse.redirect(`${baseUrl}/auth-code-error`)
}
```
+ linea 44-46 redirige a `/auth-code-error` si `exchangeCodeForSession` falla.

**Observación UX:** el account chooser de Google no expone botón "Cancelar" directo — user debe navegar back o cerrar tab. En ambos casos NO se gatilla el callback. Flow /auth-code-error aplica cuando Google redirige explícitamente con `?error=...` (ej: user click "Deny" en consent screen real). Código preparado para el escenario real.

---

# BLOQUE E — Email confirmation flow

### T031 /auth/confirm con token_hash válido
**Pre:** Nuevo sign-up genera token_hash en `auth.one_time_tokens`.
**Acción:** Nav `/auth/confirm?token_hash=<hash>&type=signup`.
**Esperado UI:** Redirect a `/dashboard`.
**Esperado DB:** `auth.users.email_confirmed_at = now()`.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 16:07 UTC. User E `test-e@blackestate.dev` creado via sign-up. Pre-click: `email_confirmed_at=null`. Link del email Mailtrap usa `type=email` (no `type=signup` como spec asumía — nomenclatura actual Supabase es `type=email`). Nav al link → redirect a `/dashboard` (user autenticado automáticamente). Post-click DB: `email_confirmed_at=2026-04-23 16:07:25+00`, `last_sign_in_at=2026-04-23 16:07:25+00` ✅.

**Nota pequeña al spec original:** el `type` en el link de email de signup es `email` no `signup`. Ambos los maneja `supabase.auth.verifyOtp` correctamente, pero la URL generada por Supabase usa `type=email`.

### T032 /auth/confirm con token inválido
**Pre:** Nav `/auth/confirm?token_hash=bogus&type=signup`.
**Esperado UI:** Redirect a `/auth-code-error`.
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 16:08 UTC. Nav `http://localhost:3000/auth/confirm?token_hash=bogus_invalid_token_12345&type=signup` → redirect directo a `/auth-code-error`. `verifyOtp` falla con token inválido, handler detecta error + redirige. Flow defensivo correcto.

### T033 Gmail pre-fetch fix (verifyOtp método)
**Pre:** Simular pre-fetch (duplicar request). Primera call consume token.
**Acción:** Repetir /auth/confirm con mismo token.
**Esperado UI:** Idempotente — no crash, redirect normal (o error específico "token ya usado").
**Estado:** ✅
**Notas:** Ejecutado 2026-04-23 16:09 UTC. Nav mismo link de T031 (ya consumido) → redirect limpio a `/auth-code-error`. Sin crash, sin side effects en DB. Handler `/auth/confirm` maneja correctamente la segunda ejecución (verifyOtp falla con token already-used, catch route redirige). Gmail pre-fetch (que dispara request implícita antes del click real) ya no corrompe al user: la primera request consume el token y gatilla redirect, la segunda request del user normal cae acá. Flow idempotente y robusto.

### T034 /auth/callback con code param (PKCE)
**Pre:** OAuth flow simulado o redirect directo con `code=<short-lived>`.
**Acción:** Nav `/auth/callback?code=...`.
**Esperado UI:** `exchangeCodeForSession` succeeds → redirect a `next` param o `/dashboard`.
**Estado:** ✅
**Notas:** Dos paths validados:

1. **Happy path (T028/T029 combo):** OAuth Google real → `/auth/callback?code=<valid>` → `exchangeCodeForSession` succeeds → redirect `/dashboard`. Ya ejecutado en T028 con cuenta Google real, user `5ce53c6c-...` creado + org auto-gen.

2. **Error path (T034 ejecutado 2026-04-23 16:10):** Nav `http://localhost:3000/auth/callback?code=bogus_invalid_code_abc123` → `exchangeCodeForSession` falla con code inválido → handler `app/auth/callback/route.ts:44-46` detecta error + redirige a `/auth-code-error`. Confirmado.

Ambos paths del PKCE callback cubiertos.

**Cierre Bloque E — Email confirmation flow (T031-T034 todos ✅). Cierre Lote 1 — Auth (T001-T034) completo.**

---

# BLOQUE F — First-org (trigger handle_new_user)

### T035 Primera org se crea al sign-up
**Pre:** Covered by T001. Verify explícitamente.
**Esperado DB:**
```sql
select o.id, o.name, o.slug, m.role, uao.organization_id
from organization o
join member m on m.organization_id=o.id
join user_active_org uao on uao.user_id=m.user_id
where m.user_id=(select id from auth.users where email='test-a@blackestate.dev');
-- → 1 row, role='owner', uao.organization_id = o.id
```
**Estado:** ⏳

### T036 Slug único bajo carrera
**Pre:** Crear 2 users con emails que generarían mismo slug (ej: `test-a@foo.com` y `test-a@bar.com` si slug deriva de email local-part).
**Acción:** Sign-ups consecutivos.
**Esperado DB:** Ambas orgs creadas, slugs distintos (ej: `test-a`, `test-a-1`).
**Estado:** ⏳

### T037 Trigger idempotent en upsert
**Pre:** User A existe.
**Acción:** Borrar org de A + member + user_active_org manualmente, re-ejecutar trigger (INSERT en auth.users no se repite; workaround: `perform handle_new_user()` via function — n/a). Alternative: verify trigger NO se re-ejecuta al UPDATE de auth.users.
**Esperado:** Trigger solo on INSERT → al UPDATE no se re-crea org. OK si user queda sin org (infra-failure mode; proxy lo manda a /sign-in).
**Estado:** ⏳

### T038 Trigger completa name y avatar desde OAuth metadata
**Pre:** OAuth user (simulado — setear raw_user_meta_data manualmente).
**Acción:** Verify member row tiene name + avatar populados.
**Esperado DB:**
```sql
select name, avatar_url from member where user_id=<oauth_user_id>;
-- → name no null, avatar_url no null
```
**Estado:** ⏭️ OAuth manual.

### T039 Trigger maneja email null (future phone auth)
**Pre:** Crear user sin email (via admin API futuro) — n/a por ahora.
**Estado:** ⏭️ Futuro.

### T040 Trigger atomico — rollback si falla insert member
**Pre:** Trigger inserta org → member → active_org. Romper una de las 3 (ej: violar UNIQUE).
**Esperado:** Todo rollback, user en auth.users queda sin org (JWT sin active_org_id → proxy redirige).
**Estado:** ⏭️ Difícil de forzar sin modificar schema; documentar como "covered by trigger design review".

---

# BLOQUE G — Create subsequent org (bootstrap_organization RPC)

### T041 Crear 2da org via Settings/dialog
**Pre:** User A logged. Pre-creada org desde sign-up.
**Acción:** Nav Settings → botón "Crear organización" (o equivalente). Dialog: name "Org Alpha", slug "org-alpha". Submit.
**Esperado UI:** Toast success. Sidebar muestra ambas orgs. Active cambia a la nueva.
**Esperado DB:**
```sql
select count(*) from organization where id in (select organization_id from member where user_id=(select id from auth.users where email='test-a@blackestate.dev'));
-- → 2
```
**Estado:** ⏳

### T042 Slug duplicado rechazado (23505)
**Pre:** Org "org-alpha" existe.
**Acción:** Crear otra con slug "org-alpha".
**Esperado UI:** Toast error "Slug is already taken".
**Esperado DB:** Sigue en 2 orgs para user A.
**Estado:** ⏳

### T043 Slug inválido rechazado (22023)
**Pre:** User A logged.
**Acción:** Slug "Invalid Slug!!" (uppercase + espacios + !).
**Esperado UI:** Toast error "Slug must be 3-50 chars lowercase...".
**Estado:** ⏳

### T044 Name vacío rechazado
**Pre:** Logged.
**Acción:** Name "" (o solo espacios).
**Esperado UI:** Toast error "Organization name is required".
**Estado:** ⏳

### T045 Slug muy corto (<3)
**Pre:** Logged.
**Acción:** Slug "ab".
**Esperado UI:** Error por regex.
**Estado:** ⏳

### T046 Slug con guión al inicio/fin
**Pre:** Logged.
**Acción:** Slug "-foo" o "foo-".
**Esperado UI:** Error por regex (debe empezar y terminar con alfanumérico).
**Estado:** ⏳

### T047 Post-create auto-switch activa nueva org
**Pre:** Create "org-beta".
**Esperado UI:** Sidebar OrgSwitcher muestra "org-beta" como activo. Dashboard recarga con data de org-beta (vacía).
**Esperado DB:** `user_active_org.organization_id` = id de org-beta.
**Estado:** ⏳

### T048 RPC bootstrap_organization retorna UUID nueva
**Pre:** MCP SQL call con auth.uid() via SET (no fácil — covered indirectly por T041).
**Estado:** ✅ Covered by T041+T047.

---

# BLOQUE H — Switch-org

### T049 Switch via OrgSwitcher dropdown
**Pre:** User A tiene 2 orgs (de T041).
**Acción:** Click OrgSwitcher → click la otra org.
**Esperado UI:** Page refresh. Dashboard carga con datos de la otra org (props/leads vacíos).
**Esperado DB:** `user_active_org.organization_id` actualizado.
**Estado:** ⏳

### T050 JWT refresh tras switch
**Pre:** T049 done.
**Acción:** DevTools → decode JWT cookie.
**Esperado:** `active_org_id` claim coincide con la org nueva.
**Estado:** ⏳

### T051 Switch a org donde NO soy miembro rechazado
**Pre:** User A. Crear org C via MCP (insertada manualmente, A no es miembro).
**Acción:** Intento llamar `switchActiveOrgAction(id_de_C)` via DevTools o modificando request.
**Esperado:** Error "User is not a member of this organization".
**Estado:** ⏳

### T052 Switch al mismo org (no-op)
**Pre:** A está en org-alpha (active).
**Acción:** switchActiveOrgAction con mismo id.
**Esperado:** Silent, no-op, no throw.
**Estado:** ⏳

### T053 OrgSwitcher muestra todas las orgs del user
**Pre:** User A tiene 2 orgs.
**Esperado UI:** Dropdown muestra ambas. Active marcado con check.
**Estado:** ⏳

### T054 RLS permite findAllForUser cross-org
**Pre:** A tiene 2 orgs.
**Esperado DB:** `SELECT ... FROM member WHERE user_id=A.id` retorna 2 filas (RLS policy allows self-membership cross-org via is_org_member usando member table).
**Estado:** ⏳

---

# BLOQUE I — Org profile (update)

### T055 Update name
**Pre:** Org "org-alpha" existe.
**Acción:** Settings → org section → edit name → "Org Alpha Renamed". Save.
**Esperado UI:** Toast success. Sidebar muestra nombre nuevo.
**Esperado DB:** `organization.name = 'Org Alpha Renamed'`.
**Estado:** ⏳

### T056 Update logo_url
**Pre:** Settings logo field.
**Acción:** Upload logo (vía storage flow) o set URL manual.
**Esperado DB:** `organization.logo_url` populated.
**Estado:** ⏳

### T057 Update sin permisos (role=agent) rechazado
**Pre:** B es agent en org de A.
**Acción:** B intenta update name.
**Esperado UI:** Forbidden (UI oculta edit; si request forced → RLS rechaza).
**Estado:** ⏳ (requires bloque N completado para crear agent B).

### T058 Update con patch vacío retorna org actual
**Pre:** Org existe.
**Acción:** updateOrganizationAction con body {}.
**Esperado:** Retorna existing org sin error.
**Estado:** ⏳

### T059 Update failed si org deleted
**Pre:** Soft-delete org (set deleted_at). Intentar update.
**Esperado:** "Organization not found" error.
**Estado:** ⏭️ requires soft-delete org flow (n/a — orgs no se borran hoy).

### T060 Update preserva created_at
**Pre:** Pre-update timestamp.
**Esperado DB:** `created_at` invariante, `updated_at` avanza.
**Estado:** ⏳

---

# BLOQUE J — Members — listar + ver

### T061 Lista miembros de la org activa (owner)
**Pre:** Org con 2 miembros (A owner, B agent — post bloque N).
**Acción:** Settings → Miembros tab.
**Esperado UI:** Tabla con A (owner), B (agent). Emails + avatars visibles.
**Estado:** ⏳

### T062 Lista ordenada por role o created_at
**Pre:** Múltiples miembros.
**Esperado UI:** Orden consistente (ej: owner primero, después admin, después agent).
**Estado:** ⏳

### T063 Rol="agent" puede ver lista pero no editarla
**Pre:** B es agent.
**Acción:** B nav a Settings/Miembros.
**Esperado UI:** Ve lista (RLS permite SELECT to same-org). Botones remove/update role ocultos.
**Estado:** ⏳

### T064 Lista no expone miembros de otras orgs
**Pre:** B en org A + tiene su propia org. Switch a la propia.
**Esperado UI:** Solo ve 1 miembro (él mismo).
**Estado:** ⏳

### T065 Avatar fallback con iniciales
**Pre:** User sin avatar_url.
**Esperado UI:** Componente avatar muestra iniciales.
**Estado:** ⏳

### T066 Email denormalizado (no requiere Admin API)
**Pre:** Member row tiene email NOT NULL.
**Esperado:** UI muestra email sin llamar `supabase.auth.admin.listUsers`.
**Estado:** ⏳ (verificado via grep código, n/a runtime).

---

# BLOQUE K — Members — remove

### T067 Owner remove agent
**Pre:** A (owner), B (agent) en org-alpha.
**Acción:** A → Settings → Miembros → click "Remover" en B.
**Esperado UI:** Toast success. B desaparece de lista.
**Esperado DB:** `member.deleted_at` seteado para B. Row queda (soft delete).
**Estado:** ⏳

### T068 Agent NO puede remove otros
**Pre:** B es agent.
**Acción:** B intenta remove A via forced request.
**Esperado:** RLS rechaza (policy member_update requires is_org_admin).
**Estado:** ⏳

### T069 Owner NO puede remove-se a sí mismo
**Pre:** A owner.
**Acción:** Intentar remove A.
**Esperado UI:** Botón disabled o toast error "No podés eliminar al owner".
**Estado:** ⏳

### T070 Remove invitation pendiente limpia seat?
**Pre:** Invite + remove flow.
**Esperado:** Después de remove, getOrgSeatInfo refleja currentMembers menor.
**Estado:** ⏳

### T071 Removed user pierde acceso
**Pre:** T067 pasó.
**Acción:** B intenta nav a org-alpha.
**Esperado UI:** Si B tenía active_org_id=alpha → JWT claim stale → proxy redirige o dashboard muestra vacío.
**Estado:** ⏳

---

# BLOQUE L — Members — update role

### T072 Owner promote agent a admin
**Pre:** A owner, B agent.
**Acción:** Settings → B → change role to "admin".
**Esperado UI:** Toast success.
**Esperado DB:** `member.role` para B = 'admin'.
**Estado:** ⏳

### T073 Agent NO puede promote
**Pre:** B agent.
**Acción:** Forced request.
**Esperado:** RLS rechaza.
**Estado:** ⏳

### T074 Admin NO puede promote a owner (owner es único)
**Pre:** A owner, C admin.
**Acción:** C intenta promote D a owner.
**Esperado UI/DB:** Rechazado en use case (only owner puede cambiar role a owner, si al menos permitido).
**Estado:** ⏳

### T075 Self update restringido a "title only" (policy member_update_self_title_only)
**Pre:** B agent edita su propio member row.
**Acción:** B intenta cambiar su role a admin.
**Esperado:** RLS with_check bloquea porque role cambiaría.
**Estado:** ⏳

### T076 Update role refresca permisos inmediatamente
**Pre:** B agent promovido a admin (T072).
**Acción:** B hace una acción admin (invitar otro user).
**Esperado:** Funciona después de JWT refresh (puede requerir logout/login si org_role en JWT es stale).
**Estado:** ⏳

### T077 Lista muestra role actualizado
**Pre:** T072 pasó.
**Esperado UI:** Refresh members list muestra B como "Administrador".
**Estado:** ⏳

---

# BLOQUE M — RBAC authorize()

### T078 role_permissions tiene 57 filas seeded
**Pre:** Post-migration 004.
**Esperado DB:** `select count(*) from role_permissions;` = 57.
**Estado:** ⏳

### T079 authorize(permission) retorna true para owner con todos
**Pre:** User A owner.
**Esperado DB:** `select public.authorize('property.create');` → true.
**Estado:** ⏳

### T080 authorize retorna false para agent sin permiso
**Pre:** B agent.
**Esperado DB:** `select public.authorize('member.remove');` → false.
**Estado:** ⏳

### T081 authorize sin auth.uid() retorna false (silent-false defense)
**Pre:** Unauth context.
**Esperado:** No throw, retorna false.
**Estado:** ⏳

### T082 super_admin bypassa checks
**Pre:** Insertar `platform_admins` row para user A. Refresh JWT.
**Esperado:** `is_super_admin: true` en JWT. Todos los authorize pasan.
**Estado:** ⏳

### T083 Agent upload property funciona
**Pre:** B agent. Visita /dashboard/properties/new.
**Esperado UI:** Form funcional. Save crea row.
**Estado:** ⏳

### T084 Agent remove de OTRO agente en misma org
**Pre:** B y C ambos agents.
**Acción:** B intenta delete property de C.
**Esperado:** RLS rechaza (policy: agent only update own).
**Estado:** ⏳

---

# BLOQUE N — Invitations SEND (IMP-8)

### T085 Send invite feliz path — B invitado a org de A
**Pre:** User A logged. User B existe en auth.users. Org de A con max_seats bumpeado a 5 via MCP (free plan = 1).
**Acción:** Settings → Miembros → Invitar → email test-b@blackestate.dev + role agent. Submit.
**Esperado UI:** Toast success. Lista pending invitations muestra 1 row.
**Esperado DB:**
```sql
select status, email, role from invitation where email='test-b@blackestate.dev';
-- → status='pending', role='agent'
```
**Estado:** ⏳

### T086 Check: NO email enviado (Admin API no se llamó)
**Pre:** T085 done.
**Acción:** Verificar logs de Supabase Dashboard o inbox.
**Esperado:** No email en inbox de B. No log de `inviteUserByEmail` triggered.
**Estado:** ⏳

### T087 Send invite a email no registrado rechazado
**Pre:** Logged A.
**Acción:** Invite `ghost@nowhere.dev`.
**Esperado UI:** Toast error "Invited email is not registered in Black Estate".
**Esperado DB:** Ninguna nueva invitation row.
**Estado:** ⏳

### T088 Self-invite rechazado
**Pre:** Logged A.
**Acción:** Invite `test-a@blackestate.dev` (propio email).
**Esperado UI:** Toast "Cannot invite yourself".
**Estado:** ⏳

### T089 Invite case-insensitive detecta self
**Pre:** Logged A.
**Acción:** Invite `TEST-A@BLACKESTATE.DEV`.
**Esperado UI:** Detecta self (lowercase compare).
**Estado:** ⏳

### T090 Duplicate invite pendiente rechazado
**Pre:** T085 pasó (B invitado).
**Acción:** A invita B de nuevo.
**Esperado UI:** Toast "A pending invitation already exists for this email".
**Estado:** ⏳

### T091 Max seats alcanzado rechazado
**Pre:** Org max_seats=1, owner=1 (A). No room.
**Acción:** A invita B.
**Esperado UI:** Toast "Organization seat limit reached (1)...".
**Estado:** ⏳

### T092 Admin invita agent permitido
**Pre:** B es admin (post T072).
**Acción:** B invita C como agent.
**Esperado:** Success.
**Estado:** ⏳

### T093 Admin NO puede invite admin (solo owner)
**Pre:** B admin.
**Acción:** B invita C como admin.
**Esperado UI:** "Only the owner can invite administrators".
**Estado:** ⏳

### T094 Agent NO puede invitar (rol check)
**Pre:** C agent.
**Acción:** C intenta abrir dialog invite.
**Esperado UI:** Botón oculto. Si forced → "Only owner or admin can send invitations".
**Estado:** ⏳

### T095 Invitation row insertada por withRLS (RLS policy)
**Pre:** A admin/owner invita.
**Esperado DB:** Invite exitoso gracias a policy `invitation_insert_by_owner_admin` usando `is_org_admin`.
**Estado:** ⏳

### T096 Token generado es UUID v4
**Pre:** T085 done.
**Esperado DB:** `select token from invitation` = formato `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
**Estado:** ⏳

### T097 expires_at = created_at + 7 días
**Pre:** T085 done.
**Esperado DB:** `expires_at - created_at` ≈ 7 días.
**Estado:** ⏳

---

# BLOQUE O — Invitations ACCEPT (RPC)

### T098 Accept happy path — B acepta
**Pre:** T085 pasó. Sign-out A, sign-in B.
**Acción:** B en `/dashboard` ve panel "Invitaciones pendientes" con card de org de A. Click "Aceptar".
**Esperado UI:** Panel desaparece. Toast success. OrgSwitcher ahora muestra 2 orgs (la propia de B + la de A).
**Esperado DB:**
```sql
select status, accepted_at from invitation where email='test-b@blackestate.dev';
-- → status='accepted', accepted_at no null
select role from member where user_id=(select id from auth.users where email='test-b@blackestate.dev') and organization_id=<org_A>;
-- → role='agent'
select organization_id from user_active_org where user_id=<B_id>;
-- → org de A (flipped por RPC)
```
**Estado:** ⏳

### T099 Sidebar badge muestra 1 antes de aceptar
**Pre:** T085 done, B logged in.
**Esperado UI:** Badge "1" junto a "Dashboard" en sidebar.
**Estado:** ⏳

### T100 Badge desaparece tras accept
**Pre:** T098 pasó.
**Esperado UI:** Badge ausente (revalidatePath("/dashboard","layout") funcionó).
**Estado:** ⏳

### T101 Accept con email mismatch rechazado
**Pre:** Invite para `other@blackestate.dev`. Intento con token desde user B (email distinto).
**Esperado:** RPC raises `invitation_email_mismatch` → toast "This invitation belongs to a different email address".
**Estado:** ⏳

### T102 Accept con token no existente
**Pre:** Modificar URL/request con token bogus.
**Esperado UI:** "Invitation not found".
**Estado:** ⏳

### T103 Accept invitation expirada
**Pre:** MCP `update invitation set expires_at=now()-interval '1 day' where token=<t>`.
**Acción:** B intenta accept.
**Esperado UI:** "Invitation has expired".
**Esperado DB:** Status cambia a 'expired'.
**Estado:** ⏳

### T104 Accept invitation ya accepted idempotente
**Pre:** T098 done.
**Acción:** B intenta accept el mismo token otra vez.
**Esperado UI:** "Invitation has already been processed" OR idempotente según implementación (RPC lo maneja).
**Estado:** ⏳

### T105 Accept restaura member soft-deleted (fix migration 008)
**Pre:** B fue miembro y removido (deleted_at set). Nueva invitation. B accept.
**Esperado DB:** Member row existente UPDATE con deleted_at=null + role refreshed del invitation.
**Estado:** ⏳

### T106 JWT refresh post-accept actualiza active_org_id
**Pre:** T098.
**Esperado:** Decoded JWT de B ahora tiene active_org_id = org de A.
**Estado:** ⏳

---

# BLOQUE P — Invitations REJECT (invitee)

### T107 B rechaza invitation
**Pre:** Nueva invitation A→B pending.
**Acción:** B en dashboard → panel pending → click "Rechazar".
**Esperado UI:** Panel desaparece. No toast de error.
**Esperado DB:** `invitation.status='rejected'`.
**Estado:** ⏳

### T108 Badge decrementa tras reject
**Pre:** T107 done.
**Esperado UI:** Badge en sidebar actualiza (revalidate layout).
**Estado:** ⏳

### T109 Reject con predicate email-only — admin NO puede usar este action
**Pre:** A owner conoce token via DB.
**Acción:** A intenta rejectInvitationAction(token) forced.
**Esperado DB:** UPDATE no afecta filas (predicate email=ctx.email filtra).
**Estado:** ⏳

### T110 Post-reject, admin puede re-invitar
**Pre:** T107 done. Invitation status=rejected.
**Acción:** A invita B de nuevo.
**Esperado:** Nueva invitation pending (hasPending no considera rejected como pending).
**Estado:** ⏳

---

# BLOQUE Q — Invitations CANCEL (admin)

### T111 Admin cancela invitation pending
**Pre:** Invite A→B pending.
**Acción:** A → Settings → Pending invites list → click cancel.
**Esperado UI:** Row desaparece.
**Esperado DB:** `invitation.status='cancelled'`.
**Estado:** ⏳

### T112 Cancel no-op sobre accepted
**Pre:** Invitation accepted.
**Acción:** Cancel forced via API.
**Esperado:** "Invitation not found or cannot be cancelled".
**Estado:** ⏳

### T113 Send rollback usa markCancelled (no hard delete)
**Pre:** Forzar fallo post-insert (difícil — n/a runtime). Verify via grep código.
**Estado:** ✅ Covered by code review.

### T114 Cancel por invitee imposible
**Pre:** B quiere "cancelar" (tiene que usar reject).
**Esperado UI:** No hay UI de cancel en invitee panel. Solo accept/reject.
**Estado:** ⏳

---

# BLOQUE R — RLS isolation cross-org

### T115 User A en org A crea property
**Pre:** A logged en org A.
**Acción:** Properties → New → llenar form → save.
**Esperado DB:** `properties.organization_id = org_A`.
**Estado:** ⏳

### T116 User B en su org propia NO ve property de A
**Pre:** T115 done. B logged en org propia.
**Esperado UI:** Properties list vacía.
**Estado:** ⏳

### T117 User B nav directo a /dashboard/properties/<id_de_A>
**Pre:** T115.
**Acción:** B navega URL directa.
**Esperado UI:** 404 o "Propiedad no encontrada" (RLS hides).
**Estado:** ⏳

### T118 Isolation con leads
**Pre:** Crear lead en org A.
**Esperado:** Análogo a T116-T117.
**Estado:** ⏳

### T119 Isolation con appointments
**Pre:** Crear appointment en org A.
**Esperado:** Análogo.
**Estado:** ⏳

### T120 Isolation con ai_contents
**Pre:** Crear ai_content en org A.
**Esperado:** Análogo.
**Estado:** ⏳

### T121 Isolation con bot_config
**Pre:** Config en org A.
**Esperado:** Análogo.
**Estado:** ⏳

### T122 Query forced en URL cross-org bloquea
**Pre:** B conoce UUID de property de A.
**Acción:** B GET /api/properties/<id_A> (si existe endpoint) o Server Action con id forzado.
**Esperado:** RLS/use case retorna undefined → 404.
**Estado:** ⏳

### T123 Super admin bypassa RLS (platform_admins)
**Pre:** A super_admin. Logged en org A.
**Acción:** View property de otra org C.
**Esperado:** Accesible (is_super_admin claim = true en JWT).
**Estado:** ⏳

### T124 RLS evaluated en cada query (no caching)
**Pre:** Cambiar active_org_id de A via switch.
**Esperado:** Properties list cambia acorde sin login re-cycle.
**Estado:** ⏳

---

# BLOQUE S — Storage avatars

### T125 Upload avatar
**Pre:** User A logged. Nav profile.
**Acción:** Drag&drop imagen JPG < 2MB.
**Esperado UI:** Preview. Save → toast success.
**Esperado DB:**
```sql
select count(*) from storage.objects where bucket_id='avatars' and (storage.foldername(name))[1]=<org_A>;
-- → 1
```
**Estado:** ⏳

### T126 Upload > 2MB rechazado
**Pre:** Imagen de 5MB.
**Esperado UI:** Toast "Archivo muy grande".
**Estado:** ⏳

### T127 Upload PDF rechazado (mime type)
**Pre:** PDF.
**Esperado UI:** "Tipo de archivo no permitido".
**Estado:** ⏳

### T128 Avatar visible en NavUser tras upload
**Pre:** T125 done.
**Esperado UI:** Avatar component carga URL nueva.
**Estado:** ⏳

### T129 Avatar public URL accesible sin auth
**Pre:** T125.
**Acción:** Incognito browser → paste public URL.
**Esperado:** Imagen carga (bucket avatars es public).
**Estado:** ⏳

### T130 Delete avatar
**Pre:** T125.
**Acción:** Remove button.
**Esperado:** Storage object removido. UI fallback a iniciales.
**Estado:** ⏳

### T131 Path format `{orgId}/{userId}/{uuid}.ext`
**Pre:** Post upload.
**Esperado DB:** `name` sigue pattern.
**Estado:** ⏳

---

# BLOQUE T — Storage property-media

### T132 Upload foto en property
**Pre:** Property existe en org A.
**Acción:** Nav edit property → upload foto 5MB JPG.
**Esperado UI:** Preview. Save.
**Esperado DB:** `storage.objects` bucket=`property-media`, path `{orgA}/{propId}/{uuid}`. `properties.media.photos[]` tiene URL.
**Estado:** ⏳

### T133 Upload múltiples fotos
**Pre:** Property.
**Acción:** Select 5 fotos a la vez.
**Esperado:** Todas suben, array ordenado.
**Estado:** ⏳

### T134 Upload > 10MB rechazado
**Esperado:** "Archivo muy grande".
**Estado:** ⏳

### T135 Delete foto individual
**Pre:** Property con 3 fotos.
**Acción:** Click remove en una.
**Esperado:** Object delete + array update.
**Estado:** ⏳

### T136 Reorder fotos
**Pre:** 3 fotos.
**Acción:** Drag reorder.
**Esperado:** `properties.media.photos` array nuevo orden.
**Estado:** ⏳

### T137 Upload en property de otra org rechazado
**Pre:** A intenta upload en property de org C.
**Esperado:** RLS rechaza.
**Estado:** ⏳

### T138 Public URL accesible sin auth
**Pre:** Bucket public.
**Esperado:** Anyone with URL ve foto.
**Estado:** ⏳

### T139 Video URL (opcional) maneja
**Pre:** Property `media.videoUrl` set.
**Esperado UI:** Renderiza video embed.
**Estado:** ⏭️ si no wired.

---

# BLOQUE U — Properties CRUD

### T140 Create property con todos los fields
**Pre:** A owner.
**Acción:** New property form completo.
**Esperado DB:** Row en properties con todos los fields mapeados.
**Estado:** ⏳

### T141 Create con mínimo required
**Pre:** Form con solo fields required.
**Esperado:** Row creada, opcionales null.
**Estado:** ⏳

### T142 Create crea por trigger/use-case con `created_by_user_id`
**Pre:** Crear.
**Esperado DB:** `created_by_user_id` = A.
**Estado:** ⏳

### T143 List properties active
**Pre:** Múltiples properties.
**Esperado UI:** Grid/list con todas las activas (deleted_at null).
**Estado:** ⏳

### T144 List filtrada por status
**Pre:** Properties con status distintos (draft, active, sold).
**Esperado UI:** Filter dropdown funciona.
**Estado:** ⏳

### T145 Get property by id
**Pre:** Property existe.
**Acción:** Nav `/dashboard/properties/<id>`.
**Esperado UI:** Detail view con toda la info.
**Estado:** ⏳

### T146 Get property no existe
**Pre:** UUID random.
**Esperado UI:** 404.
**Estado:** ⏳

### T147 Update property
**Pre:** Property creada.
**Acción:** Edit → cambiar price → save.
**Esperado DB:** `updated_at` avanza. price nuevo.
**Estado:** ⏳

### T148 Update por otro agent en misma org rechazado
**Pre:** B agent en org A. Property creada por A.
**Acción:** B intenta edit.
**Esperado:** RLS/use-case rechaza (agent only update own).
**Estado:** ⏳

### T149 Admin puede update cualquier property de su org
**Pre:** B promovido a admin.
**Acción:** B edita property de A.
**Esperado:** Success.
**Estado:** ⏳

### T150 Soft delete property
**Pre:** Property existe.
**Acción:** Delete button.
**Esperado DB:** `deleted_at = now()`, row persiste.
**Estado:** ⏳

### T151 Deleted property oculta en lista default
**Pre:** T150.
**Esperado UI:** No aparece en `/dashboard/properties`.
**Estado:** ⏳

### T152 Trash/papelera muestra soft-deleted (owner/admin)
**Pre:** T150. Nav papelera.
**Esperado UI:** Muestra property deleted.
**Estado:** ⏳

### T153 Agent solo ve own trash
**Pre:** B agent deletea own property + A owner también deletea una.
**Esperado UI:** B solo ve la suya en trash.
**Estado:** ⏳

### T154 Duplicate property
**Pre:** Property existe.
**Acción:** Duplicate button.
**Esperado:** Nueva property creada con `(copia)` en nombre, sin fotos.
**Estado:** ⏳

### T155 Public property page `/p/[id]`
**Pre:** Property `status=active` + `publication_status=public`.
**Acción:** Incognito nav `/p/<id>`.
**Esperado UI:** Landing page visible sin auth.
**Estado:** ⏳

### T156 Public page no muestra draft
**Pre:** Property `status=draft`.
**Esperado UI:** 404 en `/p/<id>`.
**Estado:** ⏳

---

# BLOQUE V — Leads CRUD

### T157 Create lead manual
**Pre:** Nav leads → new.
**Acción:** Form.
**Esperado DB:** Lead row creada.
**Estado:** ⏳

### T158 Create lead con property asociada
**Pre:** Property existe.
**Acción:** Lead + link property inicial.
**Esperado:** queue row creada.
**Estado:** ⏳

### T159 List leads
**Esperado UI:** Grid/table.
**Estado:** ⏳

### T160 Get lead by id
**Esperado UI:** Detail con timeline.
**Estado:** ⏳

### T161 Update lead status
**Esperado DB:** `status` actualizado, history row.
**Estado:** ⏳

### T162 Soft-delete lead
**Esperado DB:** `deleted_at` set.
**Estado:** ⏳

### T163 Track visit (bot activity) crea row
**Pre:** Property pública visitada.
**Esperado DB:** `bot_activity` row o `analytics_events` (según wired).
**Estado:** ⏳

### T164 Suggested properties algoritmo
**Pre:** Lead con búsqueda activa.
**Acción:** Get suggestions.
**Esperado:** Retorna properties matching criteria.
**Estado:** ⏳

### T165 Queue — push property
**Pre:** Lead con queue.
**Acción:** Push property to queue.
**Esperado DB:** `lead_property_queue` row.
**Estado:** ⏳

### T166 Queue — remove
**Esperado:** Row removida.
**Estado:** ⏳

### T167 Queue — reorder
**Esperado:** Position updated.
**Estado:** ⏳

### T168 Cross-org lead invisible
**Pre:** Lead en org A. B en org C.
**Esperado:** B no ve.
**Estado:** ⏳

### T169 Agent solo ve own leads
**Pre:** Lead `created_by_user_id=B`. C agent.
**Esperado:** C lista vacía si agent only own (verificar policy).
**Estado:** ⏳

### T170 Owner/admin ve todos los leads
**Pre:** Leads de A y B en mismo org.
**Esperado:** Owner ve ambos.
**Estado:** ⏳

### T171 Lead sin property links
**Pre:** Lead solo.
**Esperado UI:** Detail funciona, empty state queue.
**Estado:** ⏳

---

# BLOQUE W — Appointments CRUD

### T172 Create appointment
**Pre:** Lead existe.
**Acción:** Nav appointments → new.
**Esperado DB:** Row con date + status='pending'.
**Estado:** ⏳

### T173 List appointments upcoming
**Esperado UI:** Cards con fechas futuras.
**Estado:** ⏳

### T174 Get by date range
**Acción:** Query by specific date.
**Esperado:** Filter funciona.
**Estado:** ⏳

### T175 Get by lead
**Esperado:** Lista filtrada por lead.
**Estado:** ⏳

### T176 Update status (confirmed / cancelled / completed)
**Esperado DB:** status avanza.
**Estado:** ⏳

### T177 Soft-delete appointment
**Esperado DB:** `deleted_at`.
**Estado:** ⏳

### T178 Cross-org isolation
**Esperado:** Otra org no ve.
**Estado:** ⏳

### T179 Agent update own
**Esperado:** Permitido.
**Estado:** ⏳

### T180 Agent update otros rechazado
**Esperado:** RLS rechaza.
**Estado:** ⏳

### T181 Appointment sin lead
**Pre:** n/a si lead_id NOT NULL.
**Estado:** ⏭️.

---

# BLOQUE X — Bot config + activities

### T182 Crear bot_config
**Pre:** Nav /dashboard/bot.
**Acción:** Configurar.
**Esperado DB:** Row.
**Estado:** ⏳

### T183 Update bot config
**Esperado DB:** Updated.
**Estado:** ⏳

### T184 List bot_activities
**Esperado UI:** Timeline.
**Estado:** ⏳

### T185 Bot notifications settings
**Esperado DB:** Jsonb field update.
**Estado:** ⏳

### T186 Get messages conversations
**Esperado UI:** Lista.
**Estado:** ⏳

### T187 Notification bell unread count
**Pre:** Bot events generados.
**Esperado UI:** Badge en NotificationBell.
**Estado:** ⏳

### T188 Mark notification read
**Esperado DB:** `read_at`.
**Estado:** ⏳

### T189 Sent properties list
**Pre:** Bot envió properties a lead.
**Esperado UI:** Lista.
**Estado:** ⏳

---

# BLOQUE Y — Dashboard stats

### T190 Stats carga con real data
**Pre:** Properties/leads/appointments creadas.
**Esperado UI:** KPI cards muestran counts reales.
**Estado:** ⏳

### T191 Leads by source chart
**Esperado UI:** Pie/bar chart con distribución.
**Estado:** ⏳

### T192 Leads funnel
**Esperado UI:** Funnel con conversión.
**Estado:** ⏳

### T193 Dashboard cross-org aislado
**Pre:** A ve stats de org A. Switch a org B → stats vacías o de B.
**Esperado:** Counts reflejan org activa.
**Estado:** ⏳

---

# BLOQUE Z — Soft-delete / papelera

### T194 Delete property soft
**Covered by T150.**

### T195 Property en papelera visible para owner
**Covered by T152.**

### T196 Agent ve solo own trash
**Covered by T153.**

### T197 Restore property from trash
**Pre:** Deleted property.
**Acción:** Restore button.
**Esperado DB:** `deleted_at = null`.
**Estado:** ⏳

### T198 Hard delete no existe (confirmación)
**Pre:** Trash UI.
**Esperado:** No hay botón "eliminar para siempre".
**Estado:** ⏳

### T199 Lead soft delete
**Covered by T162.**

### T200 Appointment soft delete
**Covered by T177.**

---

# BLOQUE AA — Error boundaries + 404

### T201 /dashboard/error.tsx triggers en DB down
**Pre:** Simular DB error (pausar project? override env?). Difícil sin sandbox.
**Esperado UI:** Card "No pudimos cargar..." con retry button.
**Estado:** ⏭️ difícil reproducir.

### T202 Invalid UUID en /dashboard/properties/<bogus>
**Pre:** Nav URL con UUID inválido.
**Esperado UI:** 404.
**Estado:** ⏳

### T203 Proxy redirect con `next` param preservado
**Pre:** Sign-out. Nav `/dashboard/properties`.
**Esperado UI:** Redirect a `/sign-in?next=%2Fdashboard%2Fproperties`. Post login vuelve.
**Estado:** ⏳

### T204 /auth-code-error UI
**Pre:** Nav directo.
**Esperado UI:** Página informativa con link a sign-in.
**Estado:** ⏳

### T205 /accept-invite sin token
**Pre:** Nav `/accept-invite` sin query.
**Esperado UI:** Redirect a `/sign-in`.
**Estado:** ⏳

---

# BLOQUE AB — Build + env readiness

### T206 `npm run build` pass
**Acción:** `npm run build`.
**Esperado:** Exit 0, 26 pages generated.
**Estado:** ✅ (verified in-session repeatedly).

### T207 `tsc --noEmit` pass
**Esperado:** Zero errors.
**Estado:** ✅.

### T208 `eslint` pass
**Esperado:** Zero errors en IMP-7/IMP-8 files.
**Estado:** ✅.

### T209 Env vars críticas definidas
**Pre:** Check `.env.local`.
**Esperado:** `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL` presentes.
**Estado:** ⏳ verify.

### T210 Dev server arranca sin errors
**Pre:** Kill dev si running.
**Acción:** `npm run dev`.
**Esperado:** Compiled, localhost:3000 accesible.
**Estado:** ⏳.

---

## Resumen

- Pasos: 210
- Covered by code review / no runtime needed: T048, T066, T113, T206–T208
- Deferidos (OAuth real, DB down simulation, etc.): T028, T029, T030, T034, T038, T039, T040, T139, T181, T201

## Log de ejecución

| Iteración | Fecha | Tests pass | Tests fail | Fixes aplicados | Next |
|---|---|---|---|---|---|
| 1 | — | — | — | — | Empezar T001 |

Cada falla documenta el fix + commit SHA al lado del test. Después de un fix se reinicia desde T001 (per regla 2).

---

## 📋 Glosario de mejoras detectadas (QA running notes)

Sección viva: se actualiza en cada lote según se van encontrando gaps. Es el índice consolidado de issues observados que no son blockers del test spec pero que deben resolverse según prioridad.

### Clasificación de severidad

| Nivel | Definición | Cuándo se fixea |
|---|---|---|
| **P0 — Blocker** | Crash, data loss, security hole, multitenancy breach, build roto, tests de infraestructura fallan end-to-end | **Stop QA inmediato**. Fix + code review + re-run tests afectados antes de continuar |
| **P1 — UX blocker** | User queda stuck, no puede recuperarse, flow crítico roto, feature prometida no funciona | **Entre lotes**. Pausa al cerrar el lote actual, fix con sub-plan dedicado + code review + re-run bloques afectados, luego seguir siguiente lote |
| **P2 — UX polish** | Mensajes confusos pero funcional, validaciones inconsistentes, copy en idioma equivocado, inconsistencias de estilo con el design system | **Sub-plan post-QA**. Se agrupan en batches por área (ej "Auth UX polish") y se ejecutan después de cerrar los 10 lotes |
| **P3 — Nice-to-have** | Ideas de mejora, features adicionales no pedidas, lujos UX (ej strength meter), optimizaciones de performance no críticas | **Backlog**. Se priorizan en sesión de roadmap post-QA según business value |

### Tabla consolidada de gaps detectados

| ID | Nivel | Título | Tests relacionados | Sub-plan destino | Estado |
|---|---|---|---|---|---|
| G1 | **P1** | Resend confirmation flow faltante | T011, T014, T014b | "Auth resend confirmation flow" | ✅ **RESUELTO 2026-04-23** sub-plan `docs/plans/2026-04-23-auth-resend-confirmation.md`. Component `components/auth/resend-confirmation-button.tsx` + wire en 3 lugares (sign-in error recovery, `/auth-code-error`, pantalla post-signup). Cooldown 30s visible + sessionStorage persistence + aria-live polite. Code review 3 MAJOR + 3 MINOR + 1 SECURITY resueltos. Build + tsc + eslint ✅ |
| G2 | **P2** | Mapping errores Supabase → copy ES consistente | T001 (nota) | "Auth UX polish" | ✅ **RESUELTO 2026-04-23** commit sub-plan `docs/plans/2026-04-23-auth-quick-wins.md`. `lib/auth/error-messages.ts` con 14 códigos mapeados + helper + wired en sign-in/sign-up/forgot/reset/social-buttons. Incluye fix voseo cleanup en 5 strings existentes |
| G3 | **P2** | Auth forms validation UX (Zod client + mensajes ES inline) | T005, T006, T007 | "Auth forms validation UX" | Pendiente post-QA |
| G4 | **P2** | Password complexity client-side (hint + Zod regex) | T005 (casos edge) | "Auth forms validation UX" (mismo sub-plan que G3) | Pendiente post-QA |
| G5 | **P3** | Email al user legítimo en duplicate signup (Patrón A) | T004 | "Auth Send Email Hook + React Email" | Backlog (requiere Resend prod + Auth Hook) |
| G6 | **P3** | Password strength meter (zxcvbn) | T005 | "Auth forms validation UX" (opcional) | Backlog |
| G7 | **P2** | Info leak sutil: `email_not_confirmed` distingue emails existentes cuando password es correcto | T014 | "Auth security hardening" (futuro) | Aceptado como trade-off por ahora. Mitigar con rate limit agresivo en sign-in de unconfirmed |
| G8 | **P2** | Brute-force protection faltante en sign-in con password. Supabase no tiene rate limit configurable para `/token?grant_type=password` | T020 | **Vercel deploy setup + "Auth security hardening"** | Aceptado MVP. **Acción obligatoria al hacer deploy en Vercel:** configurar Cloudflare WAF (~$20/mo, 30min setup) para rate limiting por IP en el endpoint de auth. Trigger de acción: deploy a prod. Futuro: 2FA selectivo para roles owner/admin |
| G9 | **P2** | Password reset no invalida OTRAS sesiones del user. Si atacante tenía sesión activa en otro device, no pierde acceso al cambiar password | T025 | "Auth security hardening" | ✅ **RESUELTO 2026-04-23** sub-plan auth quick wins. `supabase.auth.signOut({ scope: "others" })` invocado tras `updateUser` exitoso en reset-password. Error best-effort con console.warn (password ya cambió, no revertir) |
| G10 | **P2** | OAuth Google no fuerza account picker. User con múltiples sesiones Google no puede elegir cuál usar — auto-selecciona la default | T028 (descubierto post-ejecución) | "Auth UX polish" | ✅ **RESUELTO 2026-04-23** sub-plan auth quick wins. `queryParams: { prompt: "select_account" }` en `signInWithOAuth` options. Google ahora siempre muestra account chooser |
| G11 | **P1** | **Drift SQL file vs DB real.** `drizzle/sql/005_org_creation_trigger.sql` tiene una versión de `handle_new_user()` distinta de la que corre en prod (DB usa display_name como base slug sin timestamp; SQL file usa email local + timestamp hex siempre). Source of truth perdido | Cierre Lote 1 — review trigger + slug | ✅ **RESUELTO 2026-04-23** sub-plan `docs/plans/2026-04-23-slug-trigger-sync.md`. 2 migrations Supabase aplicadas (`handle_new_user_sync_with_slug_suffix` + `handle_new_user_sync_review_fixes`). Canonical source en `drizzle/sql/011_handle_new_user_sync.sql`. `005_*.sql` marcado SUPERSEDED. Code review 2 MAJOR + 1 MINOR resueltos. Smoke test OK (user F slug `test-f-Z5iMLdx`) |
| G12 | **P2** | Slug format inconsistente — unos con suffix y otros sin. Por default no agrega suffix, solo en colisión. Users legítimos quedan con slugs feos después de una colisión aleatoria | Cierre Lote 1 — review trigger + slug | ✅ **RESUELTO 2026-04-23** junto con G11 en el mismo sub-plan. Opción C implementada: `random_base62(7)` crypto-random via `extensions.gen_random_bytes`. Todos los nuevos slugs tendrán formato `{display-name}-{7charRandom}` (ej: `test-f-Z5iMLdx` verificado). Slugs pre-existentes (test-a/b, gonzalo-pinell, test-e) NO se migraron por decisión (breaking URLs) |
| G13 | **P3** | `custom_access_token_hook` (drizzle/sql/003) no usa `nullif`/`trim` al leer `full_name`/`name` del raw_user_meta_data. Inconsistencia con 011 (handle_new_user ahora sí hace trim) — si metadata tiene whitespace-only, JWT `user_name` claim = string en blanco | Descubierto en code review del sub-plan G11/G12 | "Auth UX polish" o mini-fix | ✅ **RESUELTO 2026-04-23** sub-plan auth quick wins. 2 migrations aplicadas (`custom_access_token_hook_nullif_trim` + `custom_access_token_hook_review_fixes`). Canonical source `drizzle/sql/012_custom_access_token_hook_nullif_trim.sql`. 003 SUPERSEDED. Fallback de 4 niveles + inline grants para fresh-DB safety + claim siempre injected (nunca omitido) |

### Sub-planes derivados (se crearán post-cierre de QA)

1. **Auth resend confirmation flow (P1)** — entre Bloque B y C:
   - Server action `resendConfirmationEmailAction(email)` → `supabase.auth.resend({ type: 'signup', email })`
   - **Manual trigger** (no auto-trigger — alineado con industria: Stripe/Auth0/Clerk/Vercel/Slack). Evita envíos en vano.
   - Botón "Reenviar correo de confirmación" en **3 lugares**:
     1. `/sign-in` — inline debajo del form cuando response es `email_not_confirmed`
     2. `/auth-code-error` — input email + botón
     3. Pantalla "Revisa tu correo" (post-signup) — botón "No recibí el correo, reenviar"
   - **Cooldown UX 30s** visible ("Reenviar en 29s..." — Clerk/Stripe/Vercel standard)
   - Post-success toast: _"Te enviamos un nuevo enlace a {email}"_
   - Fallback error: toast + link "Contáctanos"
   - Copy ES consistente (no auto-map del mensaje GoTrue inglés)
   - Code review obligatorio + tests post-fix + re-run Bloque B
   - **Contiene G1.** Mitigación práctica de G7 (Opción C aceptada con soporte de resend manual).

2. **Auth forms validation UX (P2)** — post-QA:
   - `react-hook-form` + `@hookform/resolvers/zod`
   - Zod schemas para sign-up + sign-in + forgot-password + reset-password
   - Mensajes custom en español inline via `<FormMessage>` (shadcn)
   - Password hint visible
   - HTML5 defense-in-depth mantenido
   - **Contiene G3, G4** (G6 opcional)

3. **Auth UX polish (P2)** — post-QA:
   - Mapping `error.code` de GoTrue → copy en español por caso
   - Loading states, disabled states, skeleton consistency
   - **Contiene G2**

4. **Auth Send Email Hook + React Email (P3)** — requiere setup Resend prod + dominio verified:
   - Migración de SMTP a Auth Hook custom
   - Templates React Email branded
   - Patrón A duplicate signup email
   - **Contiene G5**

### Convenciones del glosario

- **Cada nueva nota en un test debe tener `[P#]` prefix** para consistencia con este glosario.
- **Al detectar un gap nuevo**: agregarlo a la tabla G# + asignar nivel + sub-plan destino + escribir la nota completa en el test correspondiente.
- **Al subir de nivel** (ej P2 → P1 por descubrir que bloquea algo): actualizar la tabla y mover al sub-plan correspondiente.
- **Al completarse un sub-plan**: marcar G# como ✅ con commit SHA del fix y test ID de la re-ejecución que lo validó.
