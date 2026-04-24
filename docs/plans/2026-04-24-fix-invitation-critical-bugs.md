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

- [ ] 1. Crear este sub-plan con checkboxes
- [ ] 2. **G25 fix** — Migration SQL `fix_invitation_update_policy_recursion`:
  - DROP POLICY `invitation_update_admin_or_invitee` ON public.invitation
  - CREATE POLICY con USING + WITH CHECK simplificado (sin subquery a invitation)
  - WITH CHECK: `is_org_admin(organization_id) OR lower(email) = lower(auth.email())` — equivalente a USING, sin self-reference
  - Aplicar via `mcp__supabase__apply_migration`
  - Mirror en `drizzle/sql/013_fix_invitation_update_policy_recursion.sql`
- [ ] 3. **G24 fix part 1** — Audit grep `grep -rEn "error\.message|err\.message" app/ components/ features/*/presentation/`
- [ ] 4. **G24 fix part 2** — Reemplazar cada catch que pasa `error.message` directo:
  - Si es action de invitation → `getInvitationErrorMessage(error.code)` (crear si no existe)
  - Si es action de org → `getOrgErrorMessage(error.code)`
  - Si es auth → `getAuthErrorMessage` (ya existe G2)
  - Default fallback: copy genérico ES "Ocurrió un error. Intenta de nuevo."
- [ ] 5. **G24 fix part 3** — Crear `lib/errors/invitation-errors.ts` con map similar a `lib/auth/error-messages.ts`:
  - `Invitation not found or cannot be rejected` → "No se pudo rechazar la invitación. Puede que ya no exista."
  - `Invitation not found or cannot be cancelled` → "No se pudo cancelar la invitación. Puede que ya no exista."
  - `Cannot invite yourself` → "No puedes invitarte a ti mismo"
  - `Invited email is not registered in Black Estate` → "Este email no tiene cuenta en Black Estate" (solo válido pre-G17, después se cambia)
  - `A pending invitation already exists for this email` → "Ya existe una invitación pendiente para este email"
  - `Only owner or admin can send invitations` → "Solo propietarios o administradores pueden enviar invitaciones"
  - `Only the owner can invite administrators` → "Solo el propietario puede invitar administradores"
  - `Organization seat limit reached` → "Sin asientos disponibles. Mejora tu plan para invitar más miembros."
- [ ] 6. **G24 fix part 4** — Add ESLint rule (custom o regex en CI) que prohíbe `error.message` y `err.message` en JSX o `toast.error` calls dentro de `app/` `components/` `features/*/presentation/`
- [ ] 7. Code review obligatorio (`feature-dev:code-reviewer`) con context completo
- [ ] 8. Resolver TODOS los issues
- [ ] 9. `tsc --noEmit` + `eslint` + `npm run build` limpios
- [ ] 10. Re-correr tests bloqueados:
  - **T107** B rechaza invitation — verifica DB status='rejected', UI desaparece, NO leak en errores
  - **T108** Badge decrementa post-reject
  - **T109** Reject email-only predicate (admin no puede usar este action)
  - **T110** Post-reject, admin puede re-invitar
  - **T111** Admin cancela invitation pending
  - **T112** Cancel no-op sobre accepted
  - **T113-T114** (resto Bloque Q)
  - **Adicional:** verificar UI de error de TODOS los flows de invitation muestra copy ES neutro, NO SQL
- [ ] 11. Update QA doc — G24 + G25 ✅ con commit SHA + tests re-ejecutados
- [ ] 12. Update sub-plan checkboxes + commit atómico
- [ ] 13. Reporte de cierre

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
