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
| F | Tenancy — first-org (trigger) | T035–T040 (T036, T039, T040 removed) | 3 |
| ~~G~~ | ~~Tenancy — create-org (RPC)~~ **REMOVED 2026-04-24 — model 1-self-owned-org** | — | 0 |
| H | Tenancy — switch-org (depends on Lote 3 invitations) | T049–T054 (T041–T048 retired with Bloque G) | 6 |
| I | Org profile (update) | T055–T060 + T060b | 7 |
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

**Total:** 200 tests (210 original − 8 del bloque G removidos 2026-04-24 − T036, T039, T040 removidos 2026-04-24 + T060b agregado 2026-04-24)

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

### ~~T036 Slug único bajo carrera~~ ❌ REMOVIDO 2026-04-24
Astronómicamente improbable (1 en 62^7 ≈ 3.5T). El trigger 011 maneja `unique_violation` con retry `random_base62(10)` por defensa, pero forzar la colisión en runtime es imposible. Decisión: el test no aporta valor práctico.

### T037 Trigger idempotent en upsert
**Pre:** User logged + UI de "edit profile name" implementada (G16 — ver glosario).
**Acción:** Desde UI realista del producto, disparar un flow que UPDATE `auth.users.raw_user_meta_data` (ej: editar display name → `auth.updateUser({ data: { full_name: ... } })`).
**Esperado:** Trigger NO se re-ejecuta. Org count de ese user se mantiene en 1, no aparece org duplicada.
**Estado:** ⏭️ DIFERIDO — el cliente no tiene flow de UI para tocar `auth.users` hoy. Bypass por SQL sería falso positivo (cliente nunca lo haría así). Re-ejecutar cuando G16 esté implementado.

**Nota técnica:** trigger definition verificada `AFTER INSERT ON auth.users` (sin UPDATE) — design-level OK. El test runtime queda pendiente de un flow UI real que dispare UPDATE.

### T038 Trigger completa name y avatar desde OAuth metadata
**Pre:** OAuth user (simulado — setear raw_user_meta_data manualmente).
**Acción:** Verify member row tiene name + avatar populados.
**Esperado DB:**
```sql
select name, avatar_url from member where user_id=<oauth_user_id>;
-- → name no null, avatar_url no null
```
**Estado:** ⏭️ OAuth manual.

### ~~T039 Trigger maneja email null~~ ❌ REMOVIDO 2026-04-24
Decisión de producto: Black Estate **nunca** permitirá creación de usuarios sin email. Phone auth no entra en el roadmap. Test sin caso de uso real.

### ~~T040 Trigger atómico — rollback si falla insert member~~ ❌ REMOVIDO 2026-04-24
No reproducible en runtime sin modificar schema temporalmente (rompería DB para todos). Atomicidad garantizada design-level por savepoint Postgres en trigger 011 (verificada en code review G11/G12). Si llega a fallar en prod, se atiende como postmortem caso por caso.

---

# BLOQUE G — Create subsequent org — ❌ REMOVED 2026-04-24

**Razón:** el modelo de negocio fue restringido a **1 self-owned organization por user**. El único org propio se crea automáticamente al sign-up via trigger `handle_new_user`. Pertenencia a orgs adicionales se adquiere **solo** por aceptación de invitación (Bloques N/O).

El RPC `bootstrap_organization`, la Server Action `createOrganizationAction`, el use case `createOrganizationUseCase`, y el item "Crear organización" del OrgSwitcher fueron removidos — ver sub-plan `docs/plans/2026-04-24-remove-multi-org-creation.md`.

Tests T041-T048 eliminados (8 tests). Los casos de switch entre orgs se cubren en Bloque H (que ahora depende de Lote 3 invitations para que el user pertenezca a 2+ orgs) y los de update profile en Bloque I.

---

# BLOQUE H — Switch-org

> **⚠️ Dependencia:** Este bloque requiere que user A pertenezca a 2+ orgs. Tras remover el Bloque G, la única vía para obtener multi-membership es Bloque N/O (invitations). Ejecutar **después** de Lote 3. Hasta entonces el dropdown del OrgSwitcher no renderiza (se requieren 2+ orgs activas — ver `components/org-switcher.tsx:53`).

### T049 Switch via OrgSwitcher dropdown
**Pre:** User A tiene 2 orgs (1 propia + 1 por aceptar invitación de Bloque O).
**Acción:** Click OrgSwitcher → click la otra org.
**Esperado UI:** Page refresh. Dashboard carga con datos de la otra org (props/leads vacíos).
**Esperado DB:** `user_active_org.organization_id` actualizado.
**Estado:** ⏭️ DIFERIDO — depende de Lote 3 (un user con multi-membership)

### T050 JWT refresh tras switch
**Pre:** T049 done.
**Acción:** DevTools → decode JWT cookie.
**Esperado:** `active_org_id` claim coincide con la org nueva.
**Estado:** ⏭️ DIFERIDO — depende de T049

### T051 Switch a org donde NO soy miembro rechazado
**Pre:** User A. Crear org C via MCP (insertada manualmente, A no es miembro).
**Acción:** Intento llamar `switchActiveOrgAction(id_de_C)` via DevTools o modificando request.
**Esperado:** Error "User is not a member of this organization".
**Estado:** ⏭️ DIFERIDO — depende de Lote 3 (estructural; no hay forma realista de obtener id de org ajena en UI)

### T052 Switch al mismo org (no-op)
**Pre:** A está en org-alpha (active).
**Acción:** switchActiveOrgAction con mismo id.
**Esperado:** Silent, no-op, no throw.
**Estado:** ⏭️ DIFERIDO — depende de Lote 3

### T053 OrgSwitcher muestra todas las orgs del user
**Pre:** User A tiene 2 orgs.
**Esperado UI:** Dropdown muestra ambas. Active marcado con check.
**Estado:** ⏭️ DIFERIDO — depende de Lote 3

### T054 RLS permite findAllForUser cross-org
**Pre:** A tiene 2 orgs.
**Esperado DB:** `SELECT ... FROM member WHERE user_id=A.id` retorna 2 filas (RLS policy allows self-membership cross-org via is_org_member usando member table).
**Estado:** ⏭️ DIFERIDO — depende de Lote 3

---

# BLOQUE I — Org profile (update)

> **⚠️ TODO el bloque ⏭️ DIFERIDO 2026-04-24** — la UI de "Settings → Organización" (name + slug + logo) **no está implementada**. Backend (action + use case + repo) ya existe pero ningún componente lo invoca. Implementar la feature como sub-plan dedicado **al cerrar Lote 3** (cuando ya tengamos validado el flow de invitations + agentes), después re-correr Bloque I completo (T055-T060b). Alcance del sub-plan: ver **G15** en glosario.

### T055 Update name
**Pre:** Org "Test H" existe + UI Settings → Organización implementada (G15).
**Acción:** Settings → org section → edit name → "Inmobiliaria H LP". Save.
**Esperado UI:** Toast success. Sidebar muestra nombre nuevo.
**Esperado DB:** `organization.name = 'Inmobiliaria H LP'`, `updated_at` avanza.
**Estado:** ⏭️ DIFERIDO post-Lote 3 — bloqueado por G15

### T056 Update logo_url
**Pre:** Settings logo field implementado (G15) + bucket `avatars` configurado.
**Acción:** Upload imagen `todotix_icon.jpg` (provista por user) → se sube a Supabase Storage → URL persiste en DB.
**Esperado DB:** `organization.logo_url` populated con URL del bucket.
**Esperado UI:** Sidebar muestra el logo + Settings preview lo refleja.
**Estado:** ⏭️ DIFERIDO post-Lote 3 — bloqueado por G15

### T057 Update sin permisos (role=agent) rechazado
**Pre:** B es agent en org de A (post Lote 3 invitations).
**Acción:** B intenta update name desde DevTools (UI debe ocultar el botón).
**Esperado UI:** Botón edit no visible para agents. Si request forzado → RLS rechaza con error claro.
**Estado:** ⏭️ DIFERIDO post-Lote 3 — bloqueado por G15 + Lote 3 (necesita agent real)

### T058 Update con patch vacío retorna org actual
**Pre:** Org existe + form Settings implementado (G15).
**Acción:** Submit form sin cambios o `updateOrganizationAction(orgId, {})`.
**Esperado:** Retorna existing org sin error, no toast (o toast neutral "Sin cambios").
**Estado:** ⏭️ DIFERIDO post-Lote 3 — bloqueado por G15

### T059 Update failed si org deleted
**Pre:** Soft-delete org (set deleted_at). Intentar update.
**Esperado:** "Organization not found" error.
**Estado:** ⏭️ requires soft-delete org flow (n/a — orgs no se borran hoy).

### T060 Update preserva created_at
**Pre:** Pre-update timestamp + UI implementada (G15).
**Esperado DB:** `created_at` invariante, `updated_at` avanza.
**Estado:** ⏭️ DIFERIDO post-Lote 3 — bloqueado por G15

### T060b Editar slug propio con validación de unicidad ⏭️ bloqueado feature pendiente (G15)
**Pre:** Owner de org "Test H" con slug actual `test-h-fkOO30G`. UI de edición de slug en Settings → Organización.
**Acción A — Happy:** Cambiar slug a `inmobiliaria-h`. Save.
**Esperado UI A:** Toast success. Sidebar muestra nuevo slug. URL `/p/[id]` (público) sigue funcionando (id-based, no slug-dependent).
**Esperado DB A:** `organization.slug = 'inmobiliaria-h'`, `updated_at` avanzó, `created_at` igual.
**Acción B — Conflict:** Cambiar slug a uno ya existente, ej `test-a` (existe).
**Esperado UI B:** Toast error "Este identificador ya está en uso. Elige otro."
**Esperado DB B:** Slug sin cambio.
**Acción C — Invalid format:** Cambiar slug a `Inmo Biliaria!!` (uppercase + espacios + símbolos).
**Esperado UI C:** Validación inline `<FormMessage>` antes de submit (Zod) — "Solo minúsculas, números y guiones. Entre 3 y 50 caracteres".
**Acción D — Permission denied (agent):** Agent intenta editar slug.
**Esperado UI D:** Botón edit oculto para agents. Si request forzado → RLS/use-case rechaza.
**Estado:** ⏭️ Feature no implementada — ver G15 en glosario para alcance del sub-plan.

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

### T085 Send invite feliz path — test-h invita test-a a su org
**Pre:** test-h logged. test-a confirmed. Org "Test H" con max_seats bumpeado a 5 via MCP (free plan = 1).
**Acción:** Settings → Equipo → Invitar → email `test-a@blackestate.dev` + role agent. Submit.
**Esperado UI:** Toast success. Lista pending invitations muestra 1 row con email + role + fecha expiración.
**Esperado DB:** fila `invitation` con `status='pending'`, `role='agent'`, `expires_at = now()+7days`, `invited_by_user_id = test-h.id`.
**Estado:** ✅ **PASS 2026-04-24** — invitación creada, token UUID v4 (`1651cd1e-...`), ttl 6.9999977 días, panel UI muestra row. Cubre T085 + T095 + T096 + T097.

### T086 Send invite manda email transaccional al invitee (post-G17)
**Pre:** T085 pasó. SMTP Mailtrap configurado (ya activo en dev).
**Acción:** Verificar Mailtrap inbox post-send.
**Esperado:** Email recibido en `test-a@blackestate.dev` con asunto tipo "Te invitamos a unirte a {OrgName} en Black Estate" + magic link `/accept-invite?token=xxx` + branding mínimo.
**Esperado server logs:** Llamada a SMTP send (no a Supabase `inviteUserByEmail` Admin API — ese flow está prohibido por feedback memory `feedback_invitation_flow_wrong.md` actualizada en G17).
**Estado:** ⏭️ STANDBY — depende de G17. Comportamiento target redefinido 2026-04-24. Original spec ("verificar que NO se envió email") obsoleto.

### T087 Send invite a email no registrado se acepta (post-G17)
**Pre:** Logged A.
**Acción:** Invite `ghost@nowhere.dev` (no existe en `auth.users`).
**Esperado UI:** Toast success igual que T085. Pending invitation visible en lista.
**Esperado DB:** Fila `invitation` con `email='ghost@nowhere.dev'`, `status='pending'`, `expires_at = now() + 7 days`.
**Esperado email:** Mailtrap recibe email con magic link → si user clickea sin cuenta, lo manda a `/sign-up?email=ghost@nowhere.dev&invite_token=xxx`.
**Estado:** ⏭️ STANDBY — depende de G17. Comportamiento target redefinido 2026-04-24. Original spec ("Invited email is not registered" rechazo) obsoleto desde la decisión Firebase-style.

### T088 Self-invite rechazado
**Pre:** Logged test-h.
**Acción:** Invite `test-h@blackestate.dev` (propio email).
**Esperado UI:** Toast "No puedes invitarte a ti mismo" (copy ES neutro post-G18).
**Esperado HTTP:** 200 OK con `{ ok: false, error, code: 'self_invite' }` (post-G18).
**Esperado DB:** No invitation row creada.
**Estado:** ⚠️ **PARCIAL 2026-04-24** — server-side OK (DB confirma 0 self-invites, use case rechaza con `throw new Error("Cannot invite yourself")`). UX rotos: (1) HTTP 500 en lugar de 4xx (gap arquitectural, ver G18). (2) Toast genérico "Error al enviar la invitación" en lugar del mensaje específico (catch del cliente descarta `error.message`, ver G18). Ambos quedan pendientes hasta sub-plan G18 (Server actions error contract). Re-correr post-G18.

### T089 Invite case-insensitive detecta self
**Pre:** Logged test-h.
**Acción:** Invite `TEST-H@BLACKESTATE.DEV` (uppercase).
**Esperado UI:** Detecta self (lowercase compare).
**Estado:** ✅ **PASS 2026-04-24** — server compara case-insensitive (`callerEmail.toLowerCase() === data.email.toLowerCase()`). DB sin invite. Misma observación G18 (500 + toast genérico).

### T090 Duplicate invite pendiente rechazado
**Pre:** T085 pasó (test-a invitada con status pending).
**Acción:** test-h invita test-a de nuevo.
**Esperado UI:** Toast "A pending invitation already exists for this email" (post-G18).
**Estado:** ✅ **PASS 2026-04-24** — DB sigue 1 fila, `hasPendingForEmail` rechaza correctamente. UX gap G18.

### T091 Max seats alcanzado rechazado
**Pre:** Org max_seats=2, owner=1 (test-h) + 1 pending invite (test-a). No room.
**Acción:** test-h invita test-e.
**Esperado UI:** Toast "Sin asientos disponibles..." pre-submit.
**Estado:** ⚠️ **PARCIAL 2026-04-24** — server-side OK (`getOrgSeatInfo` cuenta active+pending, rechaza). DB sin nueva invite. UX rotos: (1) UI dice "1 de 2 asientos" (solo cuenta active, no pending) → user confundido (G19). (2) Pre-submit check `seatsAvailable===0` no disparó por mismatch del conteo client/server. (3) Server tiró 500 + toast genérico (G18). Re-correr post-G18+G19.

### T092 Admin invita agent permitido
**Pre:** test-h tiene un admin en su org (post Bloque O accept + Bloque L update role).
**Acción:** Admin invita otro user como agent.
**Esperado:** Success igual que owner.
**Estado:** ⏭️ DIFERIDO — depende de Bloques O + L (admin no existe sin aceptar invite + promover). Re-ejecutar al cierre de esos bloques.

### T093 Admin NO puede invitar admin (solo owner)
**Pre:** Admin existe (mismo setup que T092).
**Acción:** Admin intenta invitar a otro como rol admin.
**Esperado UI:** Toast "Solo el propietario puede invitar administradores" (post-G18).
**Esperado HTTP:** 403 Forbidden.
**Estado:** ⏭️ DIFERIDO — depende de Bloques O + L.

### T094 Agent NO puede invitar (rol check)
**Pre:** Agent existe en la org (post Bloque O accept).
**Acción:** Agent nav a Settings → Equipo → intenta abrir dialog invite.
**Esperado UI:** Botón "Invitar" oculto/disabled para agents. Si request forzado → toast "Solo propietarios o administradores pueden enviar invitaciones" (post-G18) + HTTP 403.
**Estado:** ⏭️ DIFERIDO — depende de Bloque O (agent no existe sin aceptar invite).

### T095 Invitation row insertada por withRLS (RLS policy)
**Pre:** test-h owner invita.
**Esperado DB:** Invite exitoso gracias a policy `invitation_insert_by_owner_admin` usando `is_org_admin`.
**Estado:** ✅ **COVERED por T085** (la fila se insertó, RLS no la bloqueó — owner pasa policy).

### T096 Token generado es UUID v4
**Pre:** T085 done.
**Esperado DB:** `select token from invitation` = formato `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
**Estado:** ✅ **COVERED por T085** — token `1651cd1e-9ef3-4fb7-a8f0-85ee2ff040a6` matchea regex UUID v4.

### T097 expires_at = created_at + 7 días
**Pre:** T085 done.
**Esperado DB:** `expires_at - created_at` ≈ 7 días.
**Estado:** ✅ **COVERED por T085** — ttl medido en 6.9999977 días (= 7 días − ~0.2s precision).

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
**Estado:** ✅ **PASS 2026-04-24** — test-a aceptó invite a Test H. RPC `accept_invitation` ejecutó atómico: invitation status='accepted' + accepted_at, member nuevo role='agent', user_active_org flipped a Test H. UI panel desapareció + sidebar header cambió a Test H + dashboard cargó org context nuevo. Cubre T098 + T099 + T100.

### T099 Sidebar badge muestra 1 antes de aceptar
**Pre:** T085 done, test-a logged in.
**Esperado UI:** Badge "1" junto a "Dashboard" en sidebar.
**Estado:** ✅ **COVERED por T098** — sidebar mostró "Dashboard 1 invitaciones pendientes" + badge numérico "1" pre-accept.

### T100 Badge desaparece tras accept
**Pre:** T098 pasó.
**Esperado UI:** Badge ausente (revalidatePath("/dashboard","layout") funcionó).
**Estado:** ✅ **COVERED por T098** — post-accept snapshot confirmó link "Dashboard" sin badge ni texto "invitaciones pendientes".

### T101 Accept con email mismatch rechazado
**Pre:** test-h invita test-e@. test-a (otro email) intenta aceptar token de test-e via RPC directo.
**Esperado:** RPC raises `invitation_email_mismatch` → HTTP 403.
**Estado:** ✅ **PASS 2026-04-24** — fetch directo a `/rest/v1/rpc/accept_invitation` con JWT de test-a + token de test-e devolvió 403 + body `{code:"28000",message:"invitation_email_mismatch"}`. DB invitation sigue `pending` (no muta). Anti-attack confirmado.

### T102 Accept con token no existente
**Pre:** test-a logged.
**Acción:** RPC con token bogus `00000000-0000-0000-0000-000000000000`.
**Esperado:** RPC `invitation_not_found`.
**Estado:** ✅ **PASS 2026-04-24** — RPC devolvió 400 + `{code:"02000",message:"invitation_not_found"}`. Nota gap G20: HTTP 400 en lugar de 404 semantically correcto. Resto OK.

### T103 Accept invitation expirada
**Pre:** SQL fixture: `UPDATE invitation SET expires_at=now()-interval '1 day' WHERE token=<test-e-token>`. test-e logged.
**Acción:** test-e intenta accept.
**Esperado UI:** "Invitation has expired" + DB status='expired' (cleanup proactivo).
**Estado:** ⚠️ **PARCIAL 2026-04-24** — RPC devolvió 400 + `{code:"22023",message:"invitation_expired"}` (rechazo OK). Pero **DB status sigue `pending`** post-call: bug G21 (`UPDATE ... SET status='expired'` antes de `RAISE EXCEPTION` no persiste por rollback de Postgres). Cleanup proactivo no funciona. Re-correr post-G21 fix.

### T104 Accept invitation ya accepted idempotente
**Pre:** T098 done. test-a logged.
**Acción:** test-a re-llama RPC con mismo token (status='accepted').
**Esperado:** Idempotente — return organization_id sin mutar (decisión user 2026-04-24).
**Estado:** ❌ **FAIL 2026-04-24** — RPC devolvió 400 + `{code:"22023",message:"invitation_not_pending"}`. Spec original aceptaba ambos comportamientos pero user explicitó: debe ser idempotente. Bug G22 — el check `if v_inv.status <> 'pending'` debe granularizarse: `accepted` retorna OK, `rejected/expired` siguen erroring. Re-correr post-G22 fix.

### T105 Accept restaura member soft-deleted (fix migration 008)
**Pre:** SQL fixture: `UPDATE member SET deleted_at=now() WHERE user_id=test-a AND organization_id=Test H`. test-h crea nueva invite a test-a. test-a accept.
**Esperado DB:** Member row pre-existente UPDATE con `deleted_at=null` + role refresh del invitation. Mismo `id`, no fila nueva.
**Estado:** ✅ **PASS 2026-04-24** — `on conflict ... do update set deleted_at=null, role=excluded.role` (migration 008) funcionó end-to-end. count=1 fila member. Mismo `id` pre/post-soft-delete (`78040fc7-...`). RPC devolvió 200 + organization_id Test H.

### T106 JWT refresh post-accept actualiza active_org_id
**Pre:** T098 done. test-a re-loguea.
**Esperado:** Decoded JWT de test-a tiene `active_org_id` = Test H id.
**Estado:** ✅ **PASS 2026-04-24** — JWT claims decoded: `active_org_id=893605f7-...`, `org_role=agent`, `user_name=Test A`, `email=test-a@blackestate.dev`. Match exacto con DB `user_active_org.organization_id`. Custom hook `custom_access_token_hook` (012) funciona post-RPC.

---

# BLOQUE P — Invitations REJECT (invitee)

### T107 B rechaza invitation
**Pre:** Nueva invitation A→B pending.
**Acción:** B en dashboard → panel pending → click "Rechazar".
**Esperado UI:** Panel desaparece. No toast de error.
**Esperado DB:** `invitation.status='rejected'`.
**Estado:** ✅ **PASS 2026-04-25 (post-fix G24+G25)** — re-ejecutado vía Playwright tras aplicar sub-plan `docs/plans/2026-04-24-fix-invitation-critical-bugs.md`. test-e clickea Rechazar en panel pending → DB row `ddefba2e-53ff-4d1d-af5d-1fc07d09fc91` migra `pending`→`rejected`, panel desaparece, sidebar badge "1 invitaciones" decrementa, **0 console errors, 0 SQL leak en UI**. Verificación cruzada SQL: UPDATE como invitee con jwt.claims set ya NO tira `42P17`. Migration aplicada: `fix_invitation_update_policy_recursion`. Originalmente FAIL 2026-04-24 por G24+G25.

### T108 Badge decrementa tras reject
**Pre:** T107 done.
**Esperado UI:** Badge en sidebar actualiza (revalidate layout).
**Estado:** ✅ **PASS 2026-04-25 (post-fix G25)** — verificado en mismo flujo que T107 vía Playwright snapshot. Sidebar link "Dashboard" pierde el aria-label "1 invitaciones pendientes" tras click Rechazar (revalidatePath layout funciona).

### T109 Reject con predicate email-only — admin NO puede usar este action
**Pre:** A owner conoce token via DB.
**Acción:** A intenta rejectInvitationAction(token) forced.
**Esperado DB:** UPDATE no afecta filas (predicate email=ctx.email filtra).
**Estado:** ✅ **PASS 2026-04-25 (post-fix G25)** — SQL simulado con jwt.claims de test-h ejecutando el predicate `where email = 'test-h@blackestate.dev'` sobre token de test-e: `rows_updated=0`. Predicate del repo (markRejected `email = ctx.email`) blocks admin spoofing.

### T110 Post-reject, admin puede re-invitar
**Pre:** T107 done. Invitation status=rejected.
**Acción:** A invita B de nuevo.
**Esperado:** Nueva invitation pending (hasPending no considera rejected como pending).
**Estado:** ✅ **PASS 2026-04-25 (post-fix G25)** — vía Playwright: test-h en Settings/Equipo invita test-e nuevamente → row nuevo `2da98f4d-61ac-47d2-8af5-73285dde9ae7` status=pending creado, no bloqueado por la fila previa rejected.

---

# BLOQUE Q — Invitations CANCEL (admin)

### T111 Admin cancela invitation pending
**Pre:** Invite A→B pending.
**Acción:** A → Settings → Pending invites list → click cancel.
**Esperado UI:** Row desaparece.
**Esperado DB:** `invitation.status='cancelled'`.
**Estado:** ✅ **PASS 2026-04-25 (post-fix G25)** — vía Playwright: test-h click cancel en row `2da98f4d` → DB status `pending`→`cancelled`, row desaparece de "Invitaciones pendientes", **0 console errors, 0 SQL leak**.

### T111b NEW — Cross-org UPDATE rejection (post-fix G25 protection check)
**Pre:** Invitation `2da98f4d` en Org H. Org A es ajena.
**Acción:** test-h (owner Org H) intenta UPDATE setting organization_id = Org A vía SQL con jwt.claims spoofed.
**Esperado:** RLS bloquea con `42501 new row violates row-level security policy`.
**Estado:** ✅ **PASS 2026-04-25** — verificado. Confirma que la simplificación del WITH CHECK (sin subquery) NO debilita la protección cross-org: `is_org_admin('Org A')` retorna false para test-h → WITH CHECK falla → UPDATE rejected. La protección se preserva sin el self-lookup recursivo.

### T112 Cancel no-op sobre accepted
**Pre:** Invitation accepted.
**Acción:** Cancel forced via API.
**Esperado:** "Invitation not found or cannot be cancelled".
**Estado:** ✅ **PASS 2026-04-25 (post-fix G25)** — SQL simulado: cancel sobre row ya `rejected` → 0 rows updated (predicate `status='pending'` filtra). markCancelled lanza `InvitationDomainError("not_found_or_cancelled")` → ES copy "No se pudo cancelar la invitación. Puede que ya no exista."

### T113 Send rollback usa markCancelled (no hard delete)
**Pre:** Forzar fallo post-insert (difícil — n/a runtime). Verify via grep código.
**Estado:** ✅ Covered by code review.

### T114 Cancel por invitee imposible
**Pre:** B quiere "cancelar" (tiene que usar reject).
**Esperado UI:** No hay UI de cancel en invitee panel. Solo accept/reject.
**Estado:** ✅ **PASS 2026-04-24** — verificado en snapshot del panel pending de test-a + test-e (Bloque O). UI muestra solo botones "Aceptar" y "Rechazar", sin "Cancel". Cancel es admin-only (Settings → Equipo → Pending list).

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
| G3 | **P2** | Auth forms validation UX (Zod client + mensajes ES inline) | T005, T006, T007 | "Auth forms validation UX" | ✅ **RESUELTO 2026-04-23** sub-plan `docs/plans/2026-04-23-auth-forms-validation-ux.md` commit `ba0e3ea`. 4 forms (sign-in, sign-up, forgot-password, reset-password) migrados a `react-hook-form` + `zodResolver` + shadcn `<Form>`. Schemas en `lib/validations/auth.ts`. `<form noValidate>` suprime bubbles HTML5. `mode:"onBlur"` UX. Code review 1 MAJOR (PasswordInput sin forwardRef) + 1 MINOR ("Haz click" → "Haz clic") resueltos. 17 tests Playwright ✅ + 13 ⏭️ (side-effects preservados 1:1). Memoria guardada: `feedback_forms_react_hook_form.md` — regla general de proyecto |
| G4 | **P2** | Password complexity client-side (hint + Zod regex) | T005 (casos edge) | "Auth forms validation UX" (mismo sub-plan que G3) | ✅ **RESUELTO 2026-04-23** junto con G3. Hint `PASSWORD_HINT` visible vía `<FormDescription>` en sign-up + reset-password: "Mínimo 8 caracteres. Incluye mayúsculas, minúsculas y números." **Decisión: NO replicar regex de complexity en cliente** — policy vive solo en Supabase Dashboard → Auth → Password Requirements. Server rechaza con `weak_password` mapeado a ES via G2. Evita drift cuando admin cambia policy. Cliente valida solo min length 8 + formato email + non-empty. Test U8 confirma flow: password "abcdefgh" → 422 weak_password → toast ES "Contraseña débil..." |
| G5 | **P3** | Email al user legítimo en duplicate signup (Patrón A) | T004 | "Auth Send Email Hook + React Email" | Backlog (requiere Resend prod + Auth Hook) |
| G6 | **P3** | Password strength meter (zxcvbn) | T005 | "Auth forms validation UX" (opcional) | Backlog |
| G7 | **P2** | Info leak sutil: `email_not_confirmed` distingue emails existentes cuando password es correcto | T014 | "Auth security hardening" (futuro) | Aceptado como trade-off por ahora. Mitigar con rate limit agresivo en sign-in de unconfirmed |
| G8 | **P2** | Brute-force protection faltante en sign-in con password. Supabase no tiene rate limit configurable para `/token?grant_type=password` | T020 | **Vercel deploy setup + "Auth security hardening"** | Aceptado MVP. **Acción obligatoria al hacer deploy en Vercel:** configurar Cloudflare WAF (~$20/mo, 30min setup) para rate limiting por IP en el endpoint de auth. Trigger de acción: deploy a prod. Futuro: 2FA selectivo para roles owner/admin |
| G9 | **P2** | Password reset no invalida OTRAS sesiones del user. Si atacante tenía sesión activa en otro device, no pierde acceso al cambiar password | T025 | "Auth security hardening" | ✅ **RESUELTO 2026-04-23** sub-plan auth quick wins. `supabase.auth.signOut({ scope: "others" })` invocado tras `updateUser` exitoso en reset-password. Error best-effort con console.warn (password ya cambió, no revertir) |
| G10 | **P2** | OAuth Google no fuerza account picker. User con múltiples sesiones Google no puede elegir cuál usar — auto-selecciona la default | T028 (descubierto post-ejecución) | "Auth UX polish" | ✅ **RESUELTO 2026-04-23** sub-plan auth quick wins. `queryParams: { prompt: "select_account" }` en `signInWithOAuth` options. Google ahora siempre muestra account chooser |
| G11 | **P1** | **Drift SQL file vs DB real.** `drizzle/sql/005_org_creation_trigger.sql` tiene una versión de `handle_new_user()` distinta de la que corre en prod (DB usa display_name como base slug sin timestamp; SQL file usa email local + timestamp hex siempre). Source of truth perdido | Cierre Lote 1 — review trigger + slug | ✅ **RESUELTO 2026-04-23** sub-plan `docs/plans/2026-04-23-slug-trigger-sync.md`. 2 migrations Supabase aplicadas (`handle_new_user_sync_with_slug_suffix` + `handle_new_user_sync_review_fixes`). Canonical source en `drizzle/sql/011_handle_new_user_sync.sql`. `005_*.sql` marcado SUPERSEDED. Code review 2 MAJOR + 1 MINOR resueltos. Smoke test OK (user F slug `test-f-Z5iMLdx`) |
| G12 | **P2** | Slug format inconsistente — unos con suffix y otros sin. Por default no agrega suffix, solo en colisión. Users legítimos quedan con slugs feos después de una colisión aleatoria | Cierre Lote 1 — review trigger + slug | ✅ **RESUELTO 2026-04-23** junto con G11 en el mismo sub-plan. Opción C implementada: `random_base62(7)` crypto-random via `extensions.gen_random_bytes`. Todos los nuevos slugs tendrán formato `{display-name}-{7charRandom}` (ej: `test-f-Z5iMLdx` verificado). Slugs pre-existentes (test-a/b, gonzalo-pinell, test-e) NO se migraron por decisión (breaking URLs) |
| G13 | **P3** | `custom_access_token_hook` (drizzle/sql/003) no usa `nullif`/`trim` al leer `full_name`/`name` del raw_user_meta_data. Inconsistencia con 011 (handle_new_user ahora sí hace trim) — si metadata tiene whitespace-only, JWT `user_name` claim = string en blanco | Descubierto en code review del sub-plan G11/G12 | "Auth UX polish" o mini-fix | ✅ **RESUELTO 2026-04-23** sub-plan auth quick wins. 2 migrations aplicadas (`custom_access_token_hook_nullif_trim` + `custom_access_token_hook_review_fixes`). Canonical source `drizzle/sql/012_custom_access_token_hook_nullif_trim.sql`. 003 SUPERSEDED. Fallback de 4 niveles + inline grants para fresh-DB safety + claim siempre injected (nunca omitido) |
| G14 | **Producto** | Modelo de tenencia cambió a **1 self-owned org por user**. Código muerto (`bootstrap_organization` RPC + `createOrganizationUseCase` + `createOrganizationAction` + "Crear organización" disabled en OrgSwitcher) + Bloque G del QA (T041-T048) obsoletos | Descubierto al arrancar Lote 2 Tenancy | Sub-plan propio | ✅ **RESUELTO 2026-04-24** sub-plan `docs/plans/2026-04-24-remove-multi-org-creation.md`. Removed: RPC (DROP FUNCTION applied), use case, action, repo `create` method, domain `CreateOrganizationDTO`, OrgSwitcher disabled item. Trigger `handle_new_user` permanece intacto (única fuente de org creation). OrgSwitcher permanece para cambiar entre memberships obtenidas via invitación. Docs actualizadas: CLAUDE.md, implementation-plan.md, 3 sub-plans históricos con SUPERSEDED headers. Lote 2 Bloque G removido (−8 tests) + H anotado como dep de Lote 3 |
| G15 | **Feature** | UI completa de "Settings → Organización" no implementada. Backend (`updateOrganizationAction` + use case + repo) ya existe pero ningún componente lo invoca. Hace falta: edición de **name + slug + logo**. Slug se autogenera al sign-up con suffix random (`test-h-fkOO30G`) y queda fijo | Detectado al arrancar Bloque I — bloquea TODOS los tests T055-T060b | Sub-plan "Org settings UI" (también incluye IMP-6 del implementation-plan que ya menciona esto) | ⏳ **Pendiente — implementar al cerrar Lote 3.** Razón del orden: Lote 3 valida el flow real de invitations + agentes, lo cual permite testear T057 (agent rejected) en el mismo sub-plan. Después re-correr Bloque I completo. Alcance: (1) Extender `UpdateOrganizationDTO` con `slug?: string`. (2) Validation Zod en `lib/validations/org.ts` con regex `^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$` + name min 2 + logoUrl válido. (3) Pre-check de unicidad de slug en `updateOrganizationUseCase` (query `organization` por slug, error `slug_taken` si existe en otra org). (4) Catch `unique_violation` (23505) en repo `update` por defensa. (5) UI section "Organización" en `/dashboard/settings` con form inline (name + slug + logo + dropzone para upload). (6) Storage flow para logo: bucket `avatars/{orgId}/logo.{ext}`, signed URL persistida. (7) Owner/admin only via `authorize()` (UI oculta edit a agent). (8) Tests T055, T056, T057, T058, T060, T060b A/B/C/D pasan tras implementación |
| G16 | **Feature** | User debe poder editar su display name (full_name) desde profile UI. Hoy `ProfileSection` actualiza tabla `member` (denormalizado) pero NO actualiza `auth.users.raw_user_meta_data` — desincronización: si user re-loguea o el JWT hook lee de metadata, el nombre vuelve al original | Detectado al diseñar T037 — necesario para test realista de "trigger no se re-ejecuta en UPDATE" | Sub-plan "Profile edit + auth.users sync" | ⏳ **Pendiente.** Alcance: (1) En `updateAgentProfileAction`, además del UPDATE en member, llamar `supabase.auth.updateUser({ data: { full_name: newName } })` para mantener sincronizado `raw_user_meta_data`. (2) Verificar que el JWT hook (`custom_access_token_hook` 012) sigue leyendo full_name correctamente post-update. (3) Validation Zod del nombre. (4) Test T037 desbloqueado: editar nombre desde UI → UPDATE en auth.users dispara → confirmar org count no cambia (trigger AFTER INSERT only) |
| G24 + G25 | **Sub-plan dedicado:** [`docs/plans/2026-04-24-fix-invitation-critical-bugs.md`](2026-04-24-fix-invitation-critical-bugs.md) | | | ✅ **RESUELTO 2026-04-25.** Migration `fix_invitation_update_policy_recursion` aplicada (canonical: `drizzle/sql/013_*.sql`, 006 con header SUPERSEDED). InvitationDomainError class + sanitizeInvitationError + getDisplayMessage en `lib/errors/invitation-errors.ts`. withInvitationActionBoundary wrappa los 6 server actions. ESLint `no-restricted-syntax` prohíbe `error.message` directo en JSX/toast/setState en `app/`+`components/`+`features/*/presentation/`. Re-tests T107/T108/T109/T110/T111/T112/T113/T114 + nuevo T111b cross-org rejection todos PASS |
| G25 | **🚨 CRÍTICO — RLS policy invitation_update_admin_or_invitee causa recursión infinita** | La WITH CHECK clause incluye subquery `SELECT i2.organization_id FROM invitation i2 WHERE i2.id = invitation.id` para "validar que organization_id no cambia". Esa subquery dispara la misma RLS policy recursivamente → Postgres aborta con `42P17: infinite recursion detected in policy for relation "invitation"`. **Resultado: reject + cancel de invitations rotos en producción desde día 1**. El repo recibe "0 rows affected" y throws "Invitation not found or cannot be rejected" — pero real cause es el loop. Detectado simulando UPDATE como invitee con set_config jwt.claims | T107 (Lote 3 Bloque P) — bloquea T107 + T108 + probablemente T109 + T110 + T111 (cancel) + T112 | Sub-plan dedicado URGENT (P0 producción si va a deploy ya) | ✅ **RESUELTO 2026-04-25** sub-plan `docs/plans/2026-04-24-fix-invitation-critical-bugs.md`. Migration `fix_invitation_update_policy_recursion` aplicada vía Supabase MCP. Policy nueva: `USING (is_org_admin OR lower(email)=lower(auth.email())) WITH CHECK (mismo predicate)` — sin subquery a invitation. Cross-org protection conservada vía `is_org_admin(NEW.organization_id)` (T111b verifica). Mirror en `drizzle/sql/013`. Re-test T107: UPDATE real funcional, sin 42P17 |
| G24 | **🚨 CRÍTICO — Info leak: error.message expone query SQL + params + PII al user en UI** | UI del panel de invitaciones pendientes muestra al user el `error.message` completo del repo cuando reject falla. Mensaje incluye: query Drizzle completa con table/column names, params (incluido el email del user, status, timestamps), SQL postgres encoded. **Riesgos:** (a) schema enumeration trivial, (b) PII leak en otros casos (email, IDs), (c) facilita SQL injection / fingerprinting backend, (d) profesionalmente vergonzoso. Patrón ocurre en `incoming-invitations-panel` y posiblemente otros catches de la app que pasan `error.message` directo a UI sin sanitizar | T107 (Lote 3 Bloque P) | Sub-plan dedicado — relacionado con G18 (error contract). En el mismo sub-plan agregar regla "NUNCA pasar error.message del backend a UI; usar mensajes ES neutro mapeados por code" | ✅ **RESUELTO 2026-04-25**. Pipeline de 3 capas: (1) Repo + use cases lanzan `InvitationDomainError` con codes typed (caller_role_insufficient, self_invite, seat_limit_reached, not_found_or_rejected, etc). (2) Server action helper `withInvitationActionBoundary` atrapa todo throw, traduce vía `sanitizeInvitationError` a copy ES neutro, re-lanza Error sanitizado preservando original como `cause` para logs. (3) UI usa `getDisplayMessage(err, fallback)` (whitelisted en `lib/errors/`) en lugar de `err.message` directo. ESLint `no-restricted-syntax` rule scopeada a `app/`+`components/`+`features/*/presentation/` prohíbe `(error\|err\|e).message` en JSX/`toast.error`/setState para defense-in-depth. Re-test T107 confirmó UI sin SQL leak, 0 console errors |
| G26 | **P3** | `member_update_self_title_only` policy (006:193-198) usa el mismo anti-pattern self-referential subquery que causó G25 — `select m2.role from public.member m2 where m2.id = public.member.id` para pinear role/org en WITH CHECK. Bajo `FORCE RLS` la subquery re-evalúa las policies de `member`, exponiendo el mismo riesgo de `42P17 infinite recursion`. No reportado como roto en runtime (self-update de profile es low-traffic), pero es la misma vulnerabilidad estructural que G25 | Detectado en code review del fix G25 (reviewer m2) | Mini-fix dedicado o junto con futuro audit de RLS policies | ✅ **RESUELTO 2026-04-25.** 2 migrations aplicadas via Supabase MCP: (a) `fix_member_update_self_title_only_recursion` (014) crea helpers `public.get_member_current_role(uuid)` + `public.get_member_current_org_id(uuid)` SECURITY DEFINER + policy sin self-lookup; (b) `fix_member_helpers_enum_return_and_comments` (015) post-review upgrade de helpers a return `member_role` enum (en vez de text) + COMMENT ON para `is_org_member`/`is_org_admin`. Mirrors `drizzle/sql/014_*.sql` y `015_*.sql`. Live policy blocks G25+G26 en 006 commented out con warning `🚫 DO NOT re-run` para prevenir re-introducción. Code review (1 MAJOR + 2 MINOR) resuelto. Smoke tests post-fix: T-G26-1 ✅ self-update name OK, T-G26-2 ✅ role escalation blocked (42501), T-G26-3 ✅ cross-org migration blocked (42501). Audit grep confirmó solo 2 instancias del anti-pattern (G25+G26 — ambas resueltas). |
| G23 | **Validación faltante — invite a member activo no debería permitirse** | `sendInvitationUseCase` valida self-invite + email duplicado + pending duplicado + seat limit, pero NO valida que el invitee ya sea member activo de la org. Permite escenarios feos: Maria invita Juan → Juan acepta → Maria vuelve a invitar Juan → invite pending para una org donde Juan ya es agente activo. Resultado: invite zombie en panel del invitee, contador de seats inflado, UX confuso. El RPC accept atrapa el caso después (check "ya member" cierra sin duplicar) pero la invitation no debió crearse | T107 setup (Lote 3 Bloque P) | Sub-plan dedicado o junto con G15/G18 (mismo área de invitations) | ⏳ **Pendiente.** Alcance: (1) En `sendInvitationUseCase` agregar check `await repo.isActiveMember(ctx, data.email)` antes del seat check. (2) Si exists → throw `ValidationError('User is already a member of this organization')` → mapear a HTTP 409 Conflict (post-G18). (3) Mensaje ES neutro: "Este usuario ya es miembro de la organización". (4) Test nuevo T097h: invite a member activo → 409 + mensaje + DB sin nueva fila |
| G22 | **DB bug — accept_invitation no es idempotente** | RPC `accept_invitation` (007:123-125) lanza `invitation_not_pending` si status `≠ pending`. Si user re-clickea el link de email o hace doble-click → recibe error 400 "invitación ya procesada" en lugar de aterrizar gracefully en dashboard. Decisión de producto del user 2026-04-24: debe ser **idempotente** para `status='accepted'` (return org_id sin mutar) y mantener error explícito para `expired`/`rejected` | T104 (Lote 3 Bloque O) | Sub-plan dedicado o junto con G21 (mismo file SQL 007) | ⏳ **Pendiente.** Alcance: (1) Migration que reemplaza el block `if v_inv.status <> 'pending'` por checks granulares: `if accepted return organization_id;`, `if rejected raise 'invitation_rejected';`, `if expired raise 'invitation_expired'`. (2) Verificar que return idempotente NO mute member ni user_active_org (ya lo hace correctamente el branch interno de "ya member"). (3) Re-correr T104 verificando status=200 + body=org_id. (4) Re-correr T098 verificando que primer accept sigue funcionando |
| G21 | **DB bug — cleanup no persiste por rollback** | RPC `accept_invitation` (007) tiene `UPDATE invitation SET status='expired'` antes de `RAISE EXCEPTION 'invitation_expired'`. Postgres hace rollback de TODA la transacción al raise → el UPDATE NO persiste. Resultado: invitaciones expiradas siguen como `pending` en DB indefinidamente, polucionando queries de listado | T103 (Lote 3 Bloque O) | Sub-plan dedicado | ⏳ **Pendiente.** Opciones: (1) Cron job (pg_cron o Inngest scheduled) que cada N min haga `UPDATE invitation SET status='expired' WHERE status='pending' AND expires_at < now()`. Limpio + escalable + no acopla cleanup a accept flow. (2) Función helper `mark_expired(p_token)` que corre en transacción separada (autonomous via `dblink` o background worker — complejo en Supabase). (3) En el RPC, sacar el UPDATE antes del raise + dejar que cron lo procese — requiere cron. **Recomendado: opción 1 con pg_cron** (Supabase soporta nativo). Frecuencia sugerida: cada 1 hora. Re-correr T103 verificando cambio de status post-cleanup window |
| G20 | **HTTP semantic mismatch** | RPC `accept_invitation` con SQLSTATE `02000` (no_data, "invitation_not_found") es mapeado por PostgREST → HTTP **400 Bad Request**. Strict semantically debería ser **404 Not Found** porque el recurso (token) no existe. Mismatch sutil pero inconsistente con G18/feedback memory http_status_codes | T102 (Lote 3 Bloque O) | Sub-plan G18 (mismo) | ⏳ **Pendiente.** Opciones: (1) Cambiar SQLSTATE en `accept_invitation` de `02000` → `P0002` (no_data_found) que PostgREST mapea más cerca de 404. (2) Si migramos a API route en G18, hacer mapping explícito en el wrapper: `code === 'invitation_not_found' → 404`. (3) Mantener 400 con justificación: "token malformado o inexistente" cubre ambos casos sin distinción. Decisión final cuando se ejecute G18. Re-correr T102 verificando 404 |
| G19 | **UX inconsistencia** | Sidebar/header de Equipo cuenta `seatsAvailable = max_seats − activeMembers` (solo miembros activos). Server cuenta `seatsAvailable = max_seats − (activeMembers + pendingInvitations)`. Ejemplo: max_seats=2, 1 owner activo, 1 pending invite → UI dice "1 de 2 asientos" (sugiere 1 libre), server rechaza siguiente invite (full). User confundido | Detectado en T091 (Lote 3 Bloque N) | Junto con G18 (en el mismo sub-plan de error contract) | ⏳ **Pendiente.** Alcance: (1) Source of truth = server. (2) Endpoint/RSC que devuelve `getOrgSeatInfo` ya incluye pending invites — exponerlo al UI. (3) UI muestra "X de Y asientos (incluyendo Z invitaciones pendientes)" o número combinado. (4) Re-correr T091 verificando que (a) UI label coincide con server, (b) pre-submit toast "No hay asientos disponibles" SÍ dispara cuando 2/2 (active+pending) sin necesidad de roundtrip al server |
| G18 | **Arquitectura + UX** | Server actions de invitations (y otros) usan `throw new Error(...)` para errores de validación de input (self-invite, email duplicado, seat limit, role insuficiente, slug taken futuro). Resultado: Next.js responde **500 Internal Server Error** + el `error.message` específico se pierde en el catch genérico del cliente (`toast.error("Error al enviar la invitación")`). User no entiende qué falló | Detectado en T088 (Lote 3 Bloque N) | Sub-plan "Proper HTTP status codes API contract" — implementar antes de cerrar Lote 3 | ⏳ **Pendiente.** **Regla global del proyecto (saved a memoria):** SIEMPRE status codes HTTP correctos según RFC 7231. NUNCA 500 para errores de validación de input. NUNCA 200 con `{ ok: false, error }` (anti-pattern novato). **Alcance del sub-plan:** (1) Migrar flows write de Server Actions a **API Routes (`route.ts`)** con `NextResponse.json(body, { status: 400 \| 401 \| 403 \| 404 \| 409 \| 422 \| 500 })`. Reads pueden seguir como Server Actions o RSC. (2) Status code map por tipo de error de dominio: `400 Bad Request` (validation, malformed input), `401 Unauthorized` (no session), `403 Forbidden` (role insuficiente, RLS), `404 Not Found` (recurso no existe), `409 Conflict` (duplicate, slug_taken, pending_already_exists), `422 Unprocessable Entity` (semantic input wrong: self_invite, weak_password). (3) Body shape consistente para errors: `{ error: string; code: string; details?: object }`. (4) Domain errors: clases `ValidationError`/`ConflictError`/`ForbiddenError` que el route handler atrapa y mapea al status correcto. (5) Cliente: `fetch()` + `if (!response.ok) handleByStatus(response.status, await response.json())`. (6) Mapper `getInvitationErrorMessage(code)` ES neutro. (7) Re-correr T088, T087 (post-G17), T090, T091, T093, T094 + accept tests T101, T102, T103 — verificando status code correcto + body shape + UI con mensaje específico | 
| G17 | **Producto + Feature** | Modelo Firebase-style: A puede invitar a cualquier email, exista o no en `auth.users`. Invite manda email transaccional via Mailtrap (dev) / Resend (prod) con magic link. Si invitee no tiene cuenta, click en link → sign-up con email pre-rellenado + invite_token preservado → tras confirm auto-acepta. Reemplaza decisión IMP-8 ("invitar solo users existentes") basada en comportamiento Admin API que ya no usamos | Decisión de producto 2026-04-24 al arrancar Lote 3 Bloque N — bloquea T086, T087 + agrega T097c-g | Sub-plan "Firebase-style invitations + email" — implementar **al cerrar Lote 3** | ⏳ **Pendiente.** Alcance: (1) Sacar validación `check_user_exists_by_email` del `sendInvitationUseCase` — invite a cualquier email se acepta. (2) Decidir si borrar el RPC o dejar (verify ningún otro caller). (3) Crear template de email con React Email (asunto, branding, magic link, copy ES neutro). (4) Server action `sendInvitationEmail(invitation)` que llama Mailtrap SMTP (Resend en prod). (5) Page `/accept-invite?token=xxx` que: si logged + email match → accept directo; si logged + email mismatch → reject; si NO logged → redirect `/sign-in?next=/accept-invite?token=xxx` (con cuenta) o `/sign-up?email=X&invite_token=xxx` (sin cuenta). (6) Sign-up: aceptar query param `email` (pre-relleno + readonly) + `invite_token` (preservar en sessionStorage). (7) `/auth/confirm` o `/auth/callback` post-email-verify: detectar invite_token → auto-llamar `acceptInvitationUseCase` tras crear org propia. (8) Update memoria `feedback_invitation_flow_wrong.md` — marcar superseded. (9) Re-correr T086, T087 con nuevo comportamiento. (10) Nuevos tests T097c (email recibido en Mailtrap), T097d (magic link logged in → accept), T097e (magic link sin cuenta → redirect sign-up con pre-relleno), T097f (sign-up con token + email match → auto-accept), T097g (sign-up con token + email mismatch → reject) |

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
