# Sub-plan — Remove multi-org creation (enforce 1-self-owned-org model)

**Creado:** 2026-04-24 · **Rama:** `qa/2026-04-22-exhaustive` · **Origen:** decisión de producto tomada durante arranque Lote 2 QA

## Decisión de producto

**Un user NO puede crear más de 1 organización propia.** El primer org se crea automáticamente al sign-up (trigger `handle_new_user`). Pertenencia a +orgs = solo via aceptación de invitación ajena (role `agent`/`admin`). Simplifica pricing (1 org = 1 subscripción, sin trial abuse), alinea mental model ("mi negocio = mi org, otros me invitan sin pagar").

OrgSwitcher permanece (user puede pertenecer a múltiples via invitación). Lo que se remueve es el flujo de "Crear organización adicional".

## Código identificado como muerto (audit 2026-04-24)

| File | Scope |
|---|---|
| `features/shared/application/create-organization.use-case.ts` | File entero |
| `features/shared/presentation/organization-actions.ts` | Función `createOrganizationAction` + import de use case |
| `features/shared/infrastructure/drizzle-organization.repository.ts` | Método `create` + helper `mapBootstrapError` + `SLUG_PATTERN` si exclusivo |
| `features/shared/domain/organization.repository.ts` | Método `create` de la interface |
| `features/shared/domain/organization.entity.ts` | Interface `CreateOrganizationDTO` |
| `components/org-switcher.tsx:115-119` | Item dropdown "Crear organización" disabled |
| `lib/db/schema/organization.ts:16` | Comment referenciando `createOrganizationAction` |
| `drizzle/sql/007_rls_helpers_and_bootstrap.sql` | Función `bootstrap_organization` + grants + comment |
| DB Supabase | RPC `public.bootstrap_organization` |

## Trigger `handle_new_user` — NO TOCAR

Crea la única org propia al sign-up via `INSERT INTO organization` directo (no llama al RPC). Se mantiene intacto (`drizzle/sql/011_handle_new_user_sync.sql`).

## Alcance

- [x] 1. Crear este sub-plan con checkboxes
- [x] 2. Borrar `features/shared/application/create-organization.use-case.ts`
- [x] 3. Editar `features/shared/presentation/organization-actions.ts` — sacar `createOrganizationAction` + import del use case
- [x] 4. Editar `features/shared/infrastructure/drizzle-organization.repository.ts` — sacar `create` + `mapBootstrapError` + `BootstrapErrorToken` si exclusivo + imports huérfanos
- [x] 5. Editar `features/shared/domain/organization.repository.ts` — sacar `create` de la interface
- [x] 6. Editar `features/shared/domain/organization.entity.ts` — sacar `CreateOrganizationDTO`
- [x] 7. Editar `components/org-switcher.tsx` — sacar item "Crear organización" + separator previo + import `Plus` si huérfano
- [x] 8. Editar `lib/db/schema/organization.ts:16` — actualizar comment
- [x] 9. Editar `drizzle/sql/007_rls_helpers_and_bootstrap.sql` — remover función + grants + comment de `bootstrap_organization`
- [x] 10. `mcp__supabase__apply_migration` — DROP FUNCTION en DB real
- [x] 11. Update `CLAUDE.md` — regla de 1-self-owned-org + remover descripción del RPC
- [x] 12. Update `docs/implementation-plan.md` — IMP-7 nota sin RPC
- [x] 13. Mark SUPERSEDED headers en `docs/plans/2026-04-16-supabase-auth-migration/05-org-creation-lifecycle.md`, `09-server-actions-refactor.md`, `10-ui-components-migration.md`
- [x] 14. Reformular QA doc `docs/plans/2026-04-22-qa-exhaustive.md` — borrar Bloque G T041-T048, anotar H/I deps, agregar G14 al glosario, actualizar índice + total
- [x] 15. Code review obligatorio (`feature-dev:code-reviewer`) — 0 blockers + 3 MINOR encontrados
- [x] 16. Resolver TODOS los issues — 3 aplicados
- [ ] 17. `tsc --noEmit` + `eslint` + `npm run build` limpios
- [ ] 18. Commit atómico HEREDOC
- [ ] 19. Reporte de cierre

## Migration DB — orden correcto

1. Borrar código cliente primero (no más callers del RPC)
2. Aplicar migration `DROP FUNCTION IF EXISTS public.bootstrap_organization(text, text, text, text, text)` via MCP
3. Mirror en drizzle/sql/007 (remover bloque)

Si se hace al revés (drop RPC primero + cliente después), runtime entre los dos steps rompe (pero solo UI disabled que no se invoca — low risk). Orden recomendado arriba es más limpio.

## Riesgos

| R | Detalle | Mitigación |
|---|---|---|
| R1 | Código huérfano (imports sin uso, tipos sin referencia) | tsc --noEmit + eslint `no-unused-vars` deben atrapar |
| R2 | Tests QA referencian el flujo eliminado | Reformular Lote 2 en mismo commit |
| R3 | Sub-plans históricos describen feature removida | Header SUPERSEDED, no borrar (preserva historia) |
| R4 | Otros lotes QA (R cross-org RLS, M RBAC) podrían asumir user con 2+ orgs creadas | Re-verify en reformulación — switch via invitation sigue dando multi-org, escenarios RLS válidos |

## Out of scope

- Cambios al trigger `handle_new_user` — intacto
- Cambios a `accept_invitation` o `check_user_exists_by_email` RPCs — intactos (viven en mismo file 007)
- Cambios al OrgSwitcher más allá del item de crear — el dropdown sigue funcionando para switch
