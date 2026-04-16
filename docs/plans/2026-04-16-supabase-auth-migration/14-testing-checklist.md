# Sub-plan 14 — Testing Checklist Manual

> **Depends on:** 01-12 completas
> **Unlocks:** merge a main

## Goal

Checklist manual end-to-end que valida **equivalencia funcional** entre el estado pre-migración y post-migración. Todo check debe pasar para marcar la migración como completada.

Si algo falla: no mergear. Debug + fix + re-test.

## Setup

- Dev server corriendo (`npm run dev`)
- DB limpia (test accounts eliminados o con scripts de seed)
- Email inbox accesible (personal o Mailpit local)
- Google OAuth test account

## Sección A — Sign-up flow (email/password)

- [ ] **A.1** Abrir `/sign-up`. Form renderiza: Nombre, Email, Password, button "Crear cuenta", button "Continuar con Google".
- [ ] **A.2** Submit con email/password inválido (email malformado) → toast error "Email inválido" (o similar).
- [ ] **A.3** Submit con password < 8 chars → toast error.
- [ ] **A.4** Submit con datos válidos → página "Revisá tu email".
- [ ] **A.5** DB check: `SELECT id, email FROM auth.users WHERE email = 'test@...';` → 1 fila, `email_confirmed_at IS NULL`.
- [ ] **A.6** DB check: `SELECT * FROM public.organization o JOIN public.member m ON m.organization_id = o.id WHERE m.user_id = '<new-user-id>';` → 1 org + 1 member owner.
- [ ] **A.7** DB check: `SELECT * FROM public.user_active_org WHERE user_id = '<new-user-id>';` → 1 fila apuntando a la org nueva.
- [ ] **A.8** Email inbox: recibe email "Confirmá tu cuenta en Black Estate" en español.
- [ ] **A.9** Click link del email → redirige a `/auth/callback` → redirige a `/dashboard`.
- [ ] **A.10** Dashboard carga sin errores. Sidebar muestra nombre + email. OrgSwitcher muestra slug de org.
- [ ] **A.11** DB check: `auth.users.email_confirmed_at IS NOT NULL` ahora.

## Sección B — Sign-in flow

- [ ] **B.1** Sign out → redirige a `/sign-in`.
- [ ] **B.2** `/sign-in` form renders. Submit con password mala → toast error "Invalid login credentials".
- [ ] **B.3** Submit con password buena → redirige `/dashboard`.
- [ ] **B.4** JWT decoded (dev tools → Application → Cookies → sb-<ref>-auth-token → decode vía jwt.io):
  - `sub` = user id
  - `role` = "authenticated"
  - `aud` = "authenticated"
  - `active_org_id` = UUID de org
  - `org_role` = "owner"
  - `is_super_admin` = false
  - `user_name` = "Test Avatar" (o lo que sea el nombre)

## Sección C — Google OAuth

- [ ] **C.1** Click "Continuar con Google" en sign-up o sign-in.
- [ ] **C.2** Redirect a Google consent screen.
- [ ] **C.3** Acceptar consentimiento → redirige a `/auth/callback?code=...` → `/dashboard`.
- [ ] **C.4** DB check: `auth.users` tiene user con `email = <google-email>`, `app_metadata.providers = ["google"]`.
- [ ] **C.5** Si user ya existía (email match con uno previo): login sin crear fila nueva.
- [ ] **C.6** Trigger auto-creó org (verificar).

## Sección D — Password reset

- [ ] **D.1** `/forgot-password` → ingresar email → submit → página "Te mandamos un email".
- [ ] **D.2** Email llega con link.
- [ ] **D.3** Click link → redirect a `/reset-password` con token en query.
- [ ] **D.4** Form pide nueva password. Submit.
- [ ] **D.5** Password cambiada. Redirect a `/dashboard` (o sign-in).
- [ ] **D.6** Sign-in con la nueva password funciona.

## Sección E — Invitaciones

Setup: 2 users. User A (owner), user B (no member de la org de A).

- [ ] **E.1** User A → Dashboard → Settings → tab "Miembros" → click "Invitar miembro".
- [ ] **E.2** Dialog abre. Ingresa email de User B + role "agent". Submit.
- [ ] **E.3** Toast success. DB check: `public.invitation` tiene 1 fila `status = 'pending'`.
- [ ] **E.4** Email inbox de User B: recibe email de Supabase con link.
- [ ] **E.5** Click link en incognito (para no interferir con session actual).
- [ ] **E.6** Supabase redirige a `/accept-invite?inv=<token>`.
- [ ] **E.7** Si User B no existe: sign-up flow triggered → crear cuenta → auto-accept post-signup → dashboard muestra org de User A.
- [ ] **E.8** Si User B existe: sign-in flow → auto-accept → dashboard muestra org de User A.
- [ ] **E.9** DB: `public.member` tiene 2 filas para la org (A owner, B agent). `public.invitation.status = 'accepted'`.
- [ ] **E.10** User A refresca → Members list muestra B como agent.
- [ ] **E.11** Test cancel invitation: crear otra invitation pendiente, cancelar desde UI → `invitation.status = 'cancelled'`.
- [ ] **E.12** Test duplicate invite: intentar mandar a User B otra invite → toast "Ya existe una invitación pendiente".
- [ ] **E.13** Test self-invite: User A invita su propio email → toast "No podés invitarte".
- [ ] **E.14** Test max seats: con plan 'free' (maxSeats=1), invitation blocked.

## Sección F — Org switching

Setup: User C con 2 orgs (via invitaciones aceptadas).

- [ ] **F.1** Dashboard → OrgSwitcher muestra 2 orgs. Active marked with check.
- [ ] **F.2** Click la otra → page refresh → dashboard carga con data de la otra org.
- [ ] **F.3** JWT decoded muestra `active_org_id` = nueva org, `org_role` = role de User C en esa org.
- [ ] **F.4** Repeat switch → funciona igual.

## Sección G — RLS isolation

Setup: User A (org A) crea propiedad. User B (org B) verifica que NO la ve.

- [ ] **G.1** User A → Dashboard → Properties → crear propiedad "Propiedad de A".
- [ ] **G.2** DB: `SELECT * FROM public.properties WHERE title = 'Propiedad de A';` → 1 fila, `organization_id = A`.
- [ ] **G.3** Sign-out, sign-in como User B (org B distinta).
- [ ] **G.4** Dashboard → Properties → lista está vacía (NO muestra "Propiedad de A").
- [ ] **G.5** Intento manual: User B abre `/dashboard/properties/<id-de-A>` → 404 o "Propiedad no encontrada" (RLS bloquea).
- [ ] **G.6** Repeat con leads, appointments, ai_contents — isolation por cada.

## Sección H — Storage upload (avatar)

- [ ] **H.1** User A → Dashboard → Profile.
- [ ] **H.2** Upload avatar (drag + drop imagen válida).
- [ ] **H.3** Toast success. Avatar visible en UI.
- [ ] **H.4** DB: `SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'avatars';` → incrementa.
- [ ] **H.5** Storage object `owner` field → match con User A's `auth.users.id` (no service_role).
- [ ] **H.6** Path del object: `<org-id-A>/<user-id-A>/<uuid>.jpg`.
- [ ] **H.7** Subir nuevo avatar → old file deleted (orphan cleanup).
- [ ] **H.8** User B intenta manipular FormData con path de org A (via dev tools) → upload falla con RLS error.

## Sección I — Storage property media

- [ ] **I.1** User A → Create property → subir 3 fotos.
- [ ] **I.2** DB: `storage.objects` 3 filas nuevas en `property-media` bucket, path `<org-A>/<prop-id>/...`.
- [ ] **I.3** Property record tiene `photos: ["https://xxx.supabase.co/storage/v1/object/public/property-media/..."]`.
- [ ] **I.4** User B no ve la propiedad (RLS).
- [ ] **I.5** Public landing: abrir `/p/<property-id>` en incognito → foto carga (public bucket).

## Sección J — Super admin

Setup: insertar 1 user en `platform_admins`.

```sql
INSERT INTO public.platform_admins (user_id) VALUES ('<user-id>');
```

- [ ] **J.1** Sign-in como ese user → force refresh JWT.
- [ ] **J.2** JWT decoded: `is_super_admin: true`.
- [ ] **J.3** Queries privilegiadas (ej. listar todas las orgs) devuelven cross-org si se implementó una vista admin.
- [ ] **J.4** Otros users: `is_super_admin: false`.

## Sección K — Papelera (trash) mode

Si hay UI de papelera implementada:

- [ ] **K.1** Agent borra propiedad propia (soft delete) → ya no aparece en lista default.
- [ ] **K.2** Agent va a /papelera → ve sus propiedades borradas.
- [ ] **K.3** Agent NO ve borrados de otros agents (role-aware).
- [ ] **K.4** Owner/Admin va a /papelera → ve TODAS las borradas de la org.

## Sección L — Sign-out

- [ ] **L.1** UserButton → Cerrar sesión.
- [ ] **L.2** Redirect a `/sign-in`.
- [ ] **L.3** Cookies limpias (dev tools → Application → Cookies → no hay `sb-*-auth-token`).
- [ ] **L.4** Acceso directo a `/dashboard` → proxy.ts redirige a `/sign-in`.

## Sección M — Build + deploy readiness

- [ ] **M.1** `npm run build` pasa.
- [ ] **M.2** `npm run lint` no introduce errors nuevos.
- [ ] **M.3** `npx tsc --noEmit` pasa.
- [ ] **M.4** `grep -r "better-auth" --exclude-dir=node_modules .` → 0 matches.
- [ ] **M.5** `grep -r "from \"@/lib/auth\"" --include="*.ts" --include="*.tsx" .` → 0 matches.
- [ ] **M.6** DB: 0 filas en `public.user`, `public.session`, `public.account`, `public.verification` (legacy tables deleted en Fase 12).
- [ ] **M.7** DB: las 5 tablas multitenancy nuevas existen con RLS enabled + forced.

## Sección N — Smoke tests tipos edge cases

- [ ] **N.1** User hace sign-up pero NO confirma email → intenta sign-in → error "Email not confirmed". Click "reenviar email" (si hay UI) → funciona.
- [ ] **N.2** User con password reset pendiente → token expira (manualmente decrementar expiry en auth.users) → `/reset-password` rechaza con "Token expired".
- [ ] **N.3** User con invitation expirada → click link → "La invitación expiró".
- [ ] **N.4** Race condition: dos users reciben misma invitation → solo el primero que accept gana (el segundo encuentra `status = 'accepted'`).
- [ ] **N.5** User se da cuenta de error en email de invite → owner cancela → link deja de funcionar.

## Sección O — Performance baseline

- [ ] **O.1** Dashboard loads < 1s (tras primera carga).
- [ ] **O.2** Sign-in < 2s hasta `/dashboard`.
- [ ] **O.3** Upload avatar 32KB < 2s.
- [ ] **O.4** Property list (10 items) < 500ms.
- [ ] **O.5** Org switch < 1.5s (incluye JWT refresh).

## Sección P — Rollback test (opcional, staging only)

Verificar que el rollback plan funciona en un entorno staging:

- [ ] **P.1** Restore backup pre-migration.
- [ ] **P.2** `git revert` del merge commit.
- [ ] **P.3** Redeploy.
- [ ] **P.4** Verificar que sign-in con Better Auth vuelve a funcionar.

(Este test destructivo — solo correr si querés confidence explícita en rollback.)

## Resultado esperado

Si todos los checks pasan: **migración exitosa**. Se puede mergear a main.

Si alguno falla: documentar el bug, fix, re-test solo la sección afectada + sección M (build check). Iterar hasta que todos pasen.

## Pasos

- [ ] Ejecutar secciones A-M en orden. Marcar cada item.
- [ ] Secciones N-O: spot-check.
- [ ] Sección P: opcional.
- [ ] Si todos ✅: merge a main + commit:
  ```bash
  git commit -m "feat(auth-migration): phase 14 — manual testing checklist complete

All E2E flows verified:
- Sign-up + email verify
- Sign-in (email + Google OAuth)
- Password reset
- Invitations (send, accept, cancel)
- Org switching
- RLS isolation across orgs
- Storage upload (avatar + property media)
- Super admin flag
- Sign-out

Build + lint pass. No Better Auth artifacts remain.

Ref: docs/plans/2026-04-16-supabase-auth-migration/14-testing-checklist.md"
  ```

## Notas

- Esta sesión puede tomar 2-4 horas de testing manual disciplinado.
- Tener 2 email accounts distintos a mano (owner + invitee).
- Tener Google account para OAuth test.
- Si un test falla, documentar en un issue + fix en commit aparte antes de re-test.
- Considerar grabar la sesión de testing (screenshots + notas) — útil si hay issues post-merge que hay que debuguear.
