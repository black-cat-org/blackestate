# Sub-plan — Fix invitation critical bugs (G24 + G25)

**Creado:** 2026-04-24 · **Rama:** `qa/2026-04-22-exhaustive` (post Lote 3 cierre) · **Severidad:** P0 producción · **Origen:** QA Lote 3 Bloque P/Q descubrió bugs estructurales

## Bugs a resolver

### G25 — RLS policy recursión infinita (DB)

**Síntoma:** todo UPDATE sobre `public.invitation` desde `authenticated` falla con:
```
ERROR: 42P17: infinite recursion detected in policy for relation "invitation"
```

**Causa raíz:** policy `invitation_update_admin_or_invitee` tiene WITH CHECK que incluye:
```sql
((organization_id = ( SELECT i2.organization_id
   FROM invitation i2
  WHERE (i2.id = invitation.id))) AND (...))
```

La subquery `SELECT FROM invitation i2` dispara la **misma policy** recursivamente sobre `i2` → Postgres aborta.

**Impacto:** reject (T107-T110) + cancel (T111-T114) **rotos en producción desde día 1**. El repo recibe "0 rows affected" y throws "Invitation not found or cannot be rejected/cancelled" — el verdadero error nunca se ve.

**Cómo se descubrió:** simulación SQL del UPDATE como invitee con `set_config('request.jwt.claims', ...)` reveló el `42P17`. La app lo silenció como "no encontrado".

### G24 — Error message expone schema + PII en UI

**Síntoma:** UI del panel de invitaciones pendientes (post-reject fail) renderiza:
```
Failed query: update "invitation" set "status" = $1, "updated_at" = $2 
where ("invitation"."token" = $3 and "invitation"."email" = $4 and "invitation"."status" = $5)
returning "id" params: rejected,2026-04-24...,test-e@blackestate.dev,pending
```

**Causa raíz:** componente `IncomingInvitationsPanel` (o similar) atrapa el error del action y pasa `error.message` directo a la UI sin sanitizar. El mensaje viene de Drizzle/pg con SQL formateado + params + values.

**Riesgos:**
- Schema enumeration trivial (table/column names, predicate structure)
- PII leak: emails y otros datos en params
- Facilita SQL injection / fingerprinting backend
- Profesionalmente vergonzoso

## Decisión técnica

**G25:** simplificar la policy quitando la subquery redundante. La protección "no se puede mover invitation a otra org via UPDATE" se logra con el `is_org_admin(organization_id)` que se evalúa POST-UPDATE sobre el `NEW.organization_id` — si el admin intenta cambiar `organization_id` a una org ajena, la check falla porque el caller no es admin de esa org.

**G24:** patrón estandarizado:
- Server: errores siempre se atrapan en boundary (action/route handler), nunca propagan SQL/Drizzle/pg al cliente
- Cliente: catch usa mapper `getXxxErrorMessage(code)` con copy ES neutro
- Lint rule (eslint-plugin-no-bare-error-message): prohibir `toast.error(error.message)` en files `app/` y `components/`

## Alcance

- [x] 1. Crear este sub-plan con checkboxes
- [x] 2. **G25 fix** — Migration `fix_invitation_update_policy_recursion` aplicada via `mcp__supabase__apply_migration`. DROP+CREATE policy sin subquery. Mirror `drizzle/sql/013_*.sql`. Comment SUPERSEDED en 006:213-225 documenta el cambio.
- [x] 3. **G24 fix part 1** — Audit grep arrojó 3 hits user-facing: `pending-invitation-actions.client.tsx:39+53`, `accept-invite/page.tsx:38`, `team-section.tsx:155+319`. Otros hits (`*-actions.ts` server, auth pages con mapper) son safe.
- [x] 4. **G24 fix part 2** — Todos los catches en UI usan ahora `getDisplayMessage(err, fallback)` (helper whitelisted en `lib/errors/`).
- [x] 5. **G24 fix part 3** — `lib/errors/invitation-errors.ts` creado con `InvitationDomainError extends Error { code }` + `InvitationErrorCode` union (15 codes) + `INVITATION_ERROR_MESSAGES` map ES neutro + `sanitizeInvitationError(unknown)` server boundary + `getDisplayMessage(unknown, fallback)` client helper. Repo + use cases lanzan DomainError typed.
- [x] 6. **G24 fix part 4** — ESLint `no-restricted-syntax` con 3 selectors AST (JSXExpressionContainer, `toast.*` arg, setState arg) prohibiendo `(error|err|e).message` en `app/`+`components/`+`features/*/presentation/`. Excluye `*-actions.ts` server-side files.
- [x] 7. Code review (`feature-dev:code-reviewer`) ejecutado — output completo mostrado al user. Resultado: 0 CRITICAL, 3 MAJOR, 2 MINOR.
- [x] 8. Resolver TODOS los issues:
  - **M1** ✅ team-section.tsx 2 catches usan getDisplayMessage (admin invite + cancel)
  - **M2** ✅ getInvitationErrorMessage dead export removido
  - **M3** ✅ comment 006 marca policy SUPERSEDED por 013 con full rationale
  - **m1** ✅ caller_session_no_email copy mejorado a "Tu cuenta no tiene email asociado..."
  - **m2** → tracked como nuevo gap **G26** en QA doc (out of scope explícito por reviewer; mismo anti-pattern self-referential subquery en `member_update_self_title_only` policy 006:193-198, vulnerabilidad estructural pero low-traffic path)
- [x] 9. Checks: `tsc --noEmit` ✅ clean. `eslint` ✅ files del patch sin nuevos warnings (los 7 warnings de main son pre-existentes en files no tocados — fuera de scope). `npm run build` ✅ end-to-end pass (26 routes generadas).
- [x] 10. Re-correr tests bloqueados — todos PASS:
  - **T107** ✅ test-e UI Rechazar → DB row `ddefba2e` migra `pending`→`rejected`, panel desaparece, sidebar badge "1" decrementa, **0 console errors, 0 SQL leak**
  - **T108** ✅ badge decrementa post-reject (mismo flujo que T107, snapshot confirma sin aria-label "1 invitaciones")
  - **T109** ✅ admin con invitee predicate `email = ctx.email` ejecutado vía SQL spoofed: `rows_updated=0` (predicate filtra por email mismatch)
  - **T110** ✅ post-reject re-invite vía Playwright: row nuevo `2da98f4d` status pending creado
  - **T111** ✅ admin cancel UI: DB `2da98f4d` → cancelled, row sale del panel pending, 0 errors
  - **T111b NEW** ✅ admin Org H intenta UPDATE org_id → Org A: `42501 new row violates row-level security policy` (simplified WITH CHECK preserva cross-org protection vía `is_org_admin(NEW.org_id)`)
  - **T112** ✅ cancel sobre row ya rejected: `rows_updated=0` (predicate `status='pending'` filtra)
  - **T113** ✅ post-cancel SQL inspect: `created_at`, `invited_by_user_id`, `expires_at` preservados; solo `status`+`updated_at` cambiaron
  - **T114** ✅ UI snapshot before/after cancel: button visible solo en row pending
- [x] 11. Update QA doc — T107-T114 ✅ + T111b nuevo + G24/G25 closed + G26 nuevo agregado al glosario
- [x] 12. Update sub-plan checkboxes ✅ + commit atómico HEREDOC
- [x] 13. Reporte de cierre — al user en reply final

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Simplificar WITH CHECK debilita protección de UPDATE cross-org | Verificar via test: admin de Org A intenta UPDATE invitation cambiando organization_id a Org B → debe fallar porque `is_org_admin(Org B)` retorna false. Cubierto por test nuevo T111b |
| Audit de error.message puede dejar pasar casos | Lint rule + test E2E que dispara cada error path conocido y assert que UI muestra copy mapeado, no SQL |
| Migration que cambia policy puede romper otras queries inadvertidamente | Re-correr T085 (send invite) post-fix verificando insert sigue funcionando con nueva policy |
| Re-deploy a Supabase sin downtime | DROP + CREATE POLICY es transaccional en Postgres — no hay downtime |

## Out of scope (otros gaps de invitations relacionados)

- **G18** — Server actions error contract (status codes 400/422/etc en lugar de 500). Es sub-plan separado más amplio. Este sub-plan G24+G25 lo reduce parcialmente porque al sanitizar error.message + agregar getXxxErrorMessage, el cliente ya no depende del status code para mostrar mensaje útil — pero la rectificación arquitectural (API routes con status correcto) sigue pendiente
- **G17** — Firebase-style email invitations (Mailtrap + magic link)
- **G19** — Inconsistencia de conteo seats UI vs server
- **G20** — invitation_not_found 02000 → 400 vs 404
- **G21** — RPC accept_invitation cleanup expired no persiste por rollback de RAISE
- **G22** — RPC accept_invitation no es idempotente para status=accepted
- **G23** — Validación faltante: invite a member activo
- **Otros** — todos los demás G* del glosario

Estos pueden agruparse en un sub-plan posterior "Invitations polish & error contract" o ejecutarse junto con este si scope crece manageable.

## Test plan post-fix (resumen tabla)

| ID | Test | Espera post-fix |
|---|---|---|
| T107 | reject via UI | DB status='rejected', UI panel desaparece, sin leak en errores |
| T108 | badge sidebar decrementa | Badge actualiza tras reject |
| T109 | admin no puede usar reject action (predicate email-only) | UPDATE no afecta filas, error genérico ES |
| T110 | post-reject, admin re-invitar funciona | Nueva pending creada (status rejected anterior no bloquea) |
| T111 | admin cancela pending | DB status='cancelled', UI list update |
| T112 | cancel no-op sobre accepted | UPDATE no afecta filas (status filter), copy ES claro |
| T113 | cancel preserva audit trail | accepted_at sin cambios |
| T114 | cancel disponible solo en row pending | UI hide button para non-pending |
| T111b nuevo | admin Org A NO puede UPDATE invitation a Org B | RLS bloquea, error genérico, no leak |
| T-G24-audit | grep `error.message` en UI = 0 hits | ESLint rule pasa |
