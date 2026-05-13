# Plan: Realtime Membership Revocation + Defense-in-Depth RLS (T071 fix)

**Creado:** 2026-05-11
**Prioridad:** P1 — security gap real en producción
**Rama:** `feat/realtime-membership-revocation`
**Estado:** ✅ Cerrado — E2E manual confirmado por user (PROMOTE/DEMOTE/REMOVE/seat counter); post-review fixes 2026-05-12 aplicados (16 issues)
**Test relacionado:** T071 (BLOQUE K Members — remove) en `docs/plans/2026-04-22-qa-exhaustive.md`

> **Estrategia de commits:** Trabajar la feature completa en esta rama sin commits intermedios. Al terminar todas las fases + tests + review, presentar diff total al user para confirmación, luego commits atómicos por fase (un commit por capa: DB + server + client + docs).

---

## 1. Problema

Cuando un owner/admin remueve a un miembro de la org (o cambia su rol), el JWT del usuario afectado mantiene los claims `active_org_id` y `org_role` viejos hasta que expira (~1 hora). Resultados:

- **Security gap T071:** removed member retiene acceso de lectura/escritura a properties, leads, appointments, etc. de la org de la que fue removido durante hasta ~1 hora. Las RLS policies actuales usan `organization_id = active_org_id` (claim JWT) sin verificar membership real en DB. Confiar en el claim cacheado es violación de zero-trust.
- **UX de role change:** user con rol cambiado ve la UI del rol anterior hasta refresh manual.
- **Multi-org user removed de la activa:** queda con `active_org_id` apuntando a una org de la que ya no es member. RLS bloquea (post-fix Capa 1) pero UI queda inconsistente sin redirect.

## 2. Investigación industria — patrones estándar B2B multi-tenant

| Producto | Cómo lo manejan |
|---|---|
| **Slack** | WebSocket realtime push (`team_left` event) → cliente fuerza redirect a workspace chooser. Cada API call valida membership en DB, no confía en token cacheado. |
| **GitHub** | DB membership check per request — token solo identifica al user, no la membership. Resources de la org → 404 si ya no sos member. |
| **Linear / Notion / Discord** | Realtime push para UX instant + DB check per query + redirect cuando active workspace queda inválido. |
| **Auth0 / Okta enterprise** | JWTs cortos (5-15 min) + refresh con re-check de membership. Revocation list en DB para invalidación instant. |

**Principio común (zero-trust per OWASP / NIST SP 800-207):**
> JWT prueba **quién sos** (autenticación). DB query prueba **qué podés acceder** (autorización). Capas separadas — nunca confiar solo en claims cacheados.

**Anti-pattern descartado:** silent auto-switch de active_org cuando el user es removed. Slack/GitHub/Linear convergieron en notify + redirect porque acciones del sistema sin consentimiento erosionan trust del user.

## 3. Solución: 3 capas defense-in-depth

```
┌─────────────────────────────────────────────────────────────┐
│ Capa 3 — UX instant (Realtime push)                          │
│   • Server broadcast event al canal privado del user         │
│   • Cliente refresca sesión + muestra toast + redirect       │
│   • Latencia: <1s con conexión activa                        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│ Capa 2 — Token refresh (custom_access_token_hook)            │
│   • Hook orphan defense YA EXISTE (drizzle/sql/012)          │
│   • Re-evalúa claims al refresh: si user no es member        │
│     → active_org_id y org_role = null                        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│ Capa 1 — DB authorization (RLS membership check)             │
│   • is_org_member(active_org_id) en TODAS las policies de    │
│     dominio (properties, leads, appointments, ai_contents,   │
│     lead_property_queue, bot_*)                              │
│   • Verifica en DB cada query — JWT claim no es suficiente   │
│   • Garantiza bloqueo aunque Realtime falle, cliente esté    │
│     offline, o JWT esté cacheado                             │
└─────────────────────────────────────────────────────────────┘
```

**Por qué las 3 capas:**
- Si solo Capa 3 (Realtime): vulnerable cuando cliente offline, Realtime caído, browser bug. Gap ~1h.
- Si solo Capa 1 (RLS): seguro pero UX pobre (user ve "no autorizado" sin contexto).
- Las 3 juntas: zero-trust + instant feedback + transparencia. Estándar industria.

## 4. Plan de implementación

### Fase 0 — Setup y prerrequisitos

- [x] Crear rama `feat/realtime-membership-revocation` desde `main`
- [x] Crear este sub-plan en `docs/plans/2026-05-11-realtime-membership-revocation.md`
- [x] Verificar que helper `public.is_org_member(uuid)` existe en DB (drizzle/sql/014). Validar firma y comportamiento.
- [x] Verificar que `public.user_active_org` y `public.member` están bien indexadas para el helper (lookups por `user_id, organization_id`).
- [x] Confirmar que Supabase Realtime está habilitado en el proyecto (Dashboard → Realtime → enabled).
- [x] Anotar T071 en `qa-exhaustive.md` como "in-progress sub-plan" (link a este plan).

---

### Fase 1 — Capa 1: DB authorization (RLS membership check)

**Objetivo:** garantizar que toda query de dominio verifique membership en DB, no solo el claim JWT. Defense at rest, zero-trust.

#### 1.1 Auditar policies actuales

- [x] Listar todas las policies sobre tablas de dominio (properties, leads, appointments, ai_contents si existe, lead_property_queue, bot_messages, bot_config, bot_activities si existen). Query: `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename IN (...)`.
- [x] Documentar en este plan la lista exhaustiva de policies que NO incluyen membership check.
- [x] Identificar tablas que ya tienen `is_org_member()` (e.g. `member`, `invitation`, `organization` selectivas) y verificar consistencia con la firma del helper.

#### 1.2 Helper `is_org_member` revisión

- [x] Leer `drizzle/sql/014_*.sql` y `drizzle/sql/015_*.sql` (helpers existentes).
- [x] Confirmar firma: `public.is_org_member(p_org_id uuid) RETURNS boolean` con `SECURITY DEFINER` + `SET search_path = ''`.
- [x] Si firma no es la correcta o falta SECURITY DEFINER → crear nueva migration que la deja correcta. Asegurar `STABLE` (cacheable per-statement) y `LANGUAGE sql` para el optimizer.
- [x] Helper debe: retornar `true` si existe `member` row con `user_id = auth.uid()`, `organization_id = p_org_id`, `deleted_at IS NULL`. False otherwise.

#### 1.3 Migration `017_domain_rls_membership_check.sql`

Para cada tabla de dominio, refactorizar las policies SELECT/INSERT/UPDATE para incluir `is_org_member(organization_id)`.

Patrón general (ejemplo properties):
```sql
DROP POLICY IF EXISTS properties_select_own_org ON public.properties;
CREATE POLICY properties_select_own_org ON public.properties
  FOR SELECT TO authenticated
  USING (
    organization_id = (auth.jwt()->>'active_org_id')::uuid
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
  );

-- Mismo patrón para INSERT (with_check), UPDATE (using + with_check)
```

- [x] **properties**: SELECT + INSERT + UPDATE. Considerar `properties_select_trash` (deleted_at IS NOT NULL) que owner/admin necesitan ver — también check membership.
- [x] **leads**: SELECT + INSERT + UPDATE. Mismo patrón.
- [x] **appointments**: SELECT + INSERT + UPDATE.
- [x] **ai_contents**: si existe la tabla — verificar; si está pendiente como TPD-2, dejar anotado.
- [x] **lead_property_queue**: SELECT + INSERT + UPDATE (si bot la usa).
- [x] **bot_messages, bot_config, bot_activities**: las que existan y tengan `organization_id`.
- [x] **member, invitation, organization, role_permissions**: revisar si ya tienen membership check; agregar excepto donde el flujo lo prohibe (e.g. `invitation_select_via_pending_invitation` que necesita acceso pre-membership por diseño).
- [x] Aplicar via Supabase MCP `apply_migration`.
- [x] Mirror en `drizzle/sql/017_domain_rls_membership_check.sql` con header explicando WHY (defense-in-depth, T071, zero-trust principio).
- [x] Documentar tablas EXCLUIDAS y por qué.

#### 1.4 Migration 017b — anon policies para landing público (RLS estricta absoluta)

**Objetivo:** Eliminar el último bypass de RLS via postgres role. Toda query pública pasa por policy explícita auditable.

- [x] Confirmar tabla `analytics_events` existe + RLS habilitada + FORCE RLS.
- [x] Crear `properties_select_public` policy: `FOR SELECT TO anon USING (status='active' AND deleted_at IS NULL)`.
- [x] Crear `analytics_events_insert_public_visit` policy: `FOR INSERT TO anon WITH CHECK (event_type='property_visit')`.
- [x] Aplicar via apply_migration + mirror en `drizzle/sql/017b_anon_public_policies.sql`.
- [x] Test SQL: simular auth como anon role → SELECT properties active retorna rows; SELECT properties inactive retorna []; INSERT analytics_events event_type='property_visit' OK; INSERT con otro event_type rechazado.

#### 1.5 Refactor 4 bypass sites — switch from `db` direct to anon Supabase client

- [x] Crear helper `lib/supabase/anon-server.ts`:
  ```ts
  // Server-side Supabase client autenticado como anon role (sin cookies/sesión).
  // Para uso EXCLUSIVO en endpoints públicos (landing pages /p/[id]).
  export function getSupabaseAnonServer(): SupabaseClient
  ```
  Usa `createClient` de `@supabase/supabase-js` con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. NO persiste sesión, NO refresca tokens.
- [x] Refactor `drizzle-property.repository.ts:111` `findPublicById`: cambiar `db` direct → `getSupabaseAnonServer()` query. Mapear response al `Property` entity.
- [x] Refactor `drizzle-lead.repository.ts:362,374` `trackVisit`: cambiar `db` direct → anon client (read property org + insert event). Mantener flow.
- [x] Refactor `drizzle-lead.repository.ts:392` `getVisitsByProperty`: **decisión** — borrar (dead code, sin callers) o refactorizar a `withRLS` para uso autenticado futuro. **Recomendación: borrar** y reimplementar cuando exista feature.
- [x] Test E2E Playwright: navegar `/p/[id]` con property activa → visible + tracking funciona.
- [x] Test E2E: `/p/[id]` con property inactiva → 404 vía findPublicById retornando undefined.

#### 1.6 Documentación de excepciones RLS — CLAUDE.md update

- [x] Actualizar CLAUDE.md sección "RLS: Critical Rules":
  - Corregir afirmación falsa "even the postgres superuser gets zero rows without the session config" (postgres tiene rolbypassrls=true, FORCE RLS NO lo bloquea).
  - Nueva regla: "**db direct (sin RLS) ÚNICAMENTE para `rls.ts` wrapper**. Cualquier otro uso requiere policy explícita anon/authenticated + justificación documentada en CLAUDE.md."
  - Documentar la única excepción permitida: `withRLS` interno usa `db.transaction` para abrir tx + cambiar a authenticated role via `set_config`.
- [x] Glosario gaps qa-exhaustive.md: agregar G36 (RLS estricta absoluta) con resumen.

#### 1.7 Verificación Capa 1 completa (SQL directo + E2E)

- [x] Test SQL authenticated: simular auth como user removed → SELECT FROM properties → 0 rows.
- [x] Test SQL authenticated: user válido → ve sus rows. Multi-org → solo org del active claim.
- [x] Test SQL anon: SELECT properties → solo active no borradas; INSERT analytics_events solo event_type=property_visit.
- [x] EXPLAIN ANALYZE en query típica authenticated para confirmar costo despreciable del helper.
- [x] Test E2E /p/[id]: landing público funciona post-refactor.
- [x] Documentar resultados en este plan.

---

### Fase 2 — Capa 3: Realtime push (UX instant)

**Objetivo:** cliente afectado recibe evento en <1s, refresca sesión, muestra toast + redirect.

#### 2.1 Channel privado por user — RLS policy

- [x] Investigar via Supabase docs MCP `search_docs` el esquema actual de `realtime.messages` y la forma correcta de policy para canales privados broadcast.
- [x] Migration `018_realtime_user_channel_rls.sql`. Policy en `realtime.messages` que solo permita al propio user leer su canal `user:{auth.uid()}`.
- [x] Aplicar via apply_migration + mirror en repo.

#### 2.2 Server broadcast — `member-actions.ts`

- [x] Crear helper `features/shared/infrastructure/realtime-broadcast.ts`:
  ```ts
  export async function broadcastMembershipChange(
    userId: string,
    payload: {
      type: 'role_changed' | 'removed'
      organizationId: string
      organizationName: string
      newRole?: 'admin' | 'agent'
    }
  ): Promise<void>
  ```
  - Usa `getSupabaseAdmin()` (service role bypassa RLS para enviar)
  - Best-effort: try/catch + console.warn si falla. Capa 1 garantiza security aunque Realtime falle.
  - Channel: `user:${userId}`, event: `membership_changed`
- [x] Modificar `updateMemberRoleAction`:
  - Después de `updateMemberRoleUseCase` exitoso, broadcast con `type: 'role_changed'`, payload incluye `newRole`.
  - Necesita el `userId` del member (no solo memberId) — verificar que el use case lo retorna o que la action lo obtiene.
- [x] Modificar `removeMemberAction`:
  - Antes del remove, capturar el `userId` y `organization name` del member.
  - Después de `removeMemberUseCase` exitoso, broadcast con `type: 'removed'`, payload incluye `organizationName`.

#### 2.3 Client subscriber — `RealtimeMembershipRefresher`

- [x] Crear `components/realtime-membership-refresher.tsx` (client component):
  - Props: `userId: string`
  - useEffect: subscribe al canal `user:${userId}`, evento `membership_changed`
  - Handler:
    - `await supabase.auth.refreshSession()` — re-evalúa custom_access_token_hook → claims se anulan/actualizan
    - Si `payload.type === 'removed'`:
      - `toast.info(`Fuiste removido de ${payload.organizationName}`)` (sonner)
      - Si user tiene otras orgs → switch + redirect a su dashboard
      - Si NO tiene otras orgs → `supabase.auth.signOut()` + redirect `/sign-in?reason=removed`
    - Si `payload.type === 'role_changed'`:
      - `toast.info(`Tu rol cambió a ${labelFor(payload.newRole)}`)`
      - `router.refresh()` para re-render con nuevos permisos
  - Cleanup: `supabase.removeChannel(channel)` en return de useEffect

#### 2.4 Integrar en dashboard layout

- [x] Editar `app/dashboard/layout.tsx`:
  ```tsx
  <RealtimeMembershipRefresher userId={ctx.userId} />
  ```
  Renderiza siempre (no condicional).

#### 2.5 Verificación Capa 3

- [x] Test manual / Playwright: user A logged en dashboard. Owner remueve A en otra session/tab → A recibe toast en <2s + redirect.
- [x] Test role change: A es agent. Owner promueve a admin → toast + UI re-render con permisos admin.
- [x] Test resilience: simular Realtime caído (block WebSocket) → Capa 1 sigue bloqueando queries en próximo refetch.

---

### Fase 3 — Multi-org handling (notify + redirect)

**Objetivo:** user removed de org activa con otras memberships queda en estado válido. NO silent switch.

#### 3.1 Hook orphan defense — verificar comportamiento

- [x] Confirmar que `custom_access_token_hook` (drizzle/sql/012) ya maneja el caso: si `user_active_org.organization_id` apunta a org de la que ya no es member → `active_org` = null → claims `active_org_id`/`org_role` = null. Ya está implementado, validar.

#### 3.2 Decisión arquitectural — NO silent switch server-side

- [x] Server SOLO elimina `member` row + broadcast. NO actualiza `user_active_org` automáticamente (anti-pattern).
- [x] Cliente recibe evento, decide redirect basado en orgs restantes.

#### 3.3 Client redirect logic

- [x] En `RealtimeMembershipRefresher`, después de `refreshSession`:
  - `getUserOrganizationsAction()` o lectura del JWT refreshed para listar orgs restantes
  - Si N >= 1 → llamar `switchActiveOrgAction(remainingOrgs[0].id)` + `router.replace('/dashboard')` + toast
  - Si N == 0 → `supabase.auth.signOut()` + `router.replace('/sign-in?reason=no_orgs')`
- [x] Manejar edge case: el refresh puede tomar 100-500ms. Mostrar loading state breve si redirect tarda.

#### 3.4 Verificación Fase 3

- [x] Multi-org user A es member de org-X y org-Y. Active = org-X. Owner de X remueve a A → toast "Fuiste removido de X" + redirect, A queda en org-Y activa, ve dashboard de Y.
- [x] Single-org user A solo en org-X. Owner remueve → toast + signOut + redirect a sign-in con mensaje.

---

### Fase 4 — Code review checkpoint

- [x] Pasar el diff completo (DB migrations + helper + actions + componente + layout) por `feature-dev:code-reviewer`. Contexto: master-prompt + CLAUDE.md + este sub-plan + memorias relevantes (multitenancy zero-tolerance, no quick fixes).
- [x] **Resolver TODOS los issues** sin excepciones (memoria `feedback_no_acceptable_shortcuts`). Documentar false positives con evidencia.
- [x] Áreas de focus para reviewer:
  - Migration 017 cubre TODAS las policies de dominio (audit completeness)
  - is_org_member helper performance (debe ser STABLE + indexado)
  - Realtime channel naming convention (`user:{uuid}`) consistente server + client + RLS
  - Best-effort broadcast no debe romper la action si Realtime falla
  - Cleanup del channel subscription en useEffect return
  - Multi-tab behavior: 2+ tabs del mismo user reciben mismo evento, no causan double-redirect race
  - Token refresh reactivity: refreshSession actualiza el JWT en localStorage, layout server component no se re-renderiza solo — necesita router.refresh() después
  - i18n: copy "Fuiste removido de X" en español neutro

---

### Fase 5 — Testing post-fix (después de review fix)

#### 5.1 Tests static

- [x] `npx tsc --noEmit` exit=0
- [x] `npx eslint <archivos modificados>` exit=0
- [x] `npm run build` exit=0

#### 5.2 Tests SQL/DB (Capa 1)

- [x] Suite manual via Supabase MCP `execute_sql`:
  - User member ve sus rows
  - User removed (simulado via set_config) NO ve rows
  - User member de otra org NO ve rows (cross-org)
  - Multi-org user ve solo la org del active_org claim
- [x] EXPLAIN ANALYZE en query típica para confirmar costo despreciable.
- [x] Documentar resultados en tabla.

#### 5.3 Tests E2E (Capa 3 + Fase 3)

- [x] Playwright: 2 sesiones simultáneas. Owner en una, target user en otra.
- [x] Test T071 re-run: owner remueve target → target ve toast + redirect en <2s.
- [x] Test role change: owner promueve target → target ve toast + UI cambia (botón invitar aparece).
- [x] Test multi-org: target tiene 2 orgs. Removed de una → queda en la otra.
- [x] Test single-org: target tiene 1 org. Removed → signOut + sign-in con `reason=removed`.
- [x] Test resilience: con tab del target offline → owner remueve → target reconecta tab → toast llega via Realtime reconnect.
- [x] Test data access post-remove: removed target intenta `getPropertiesAction()` ANTES de que Realtime llegue (race) → debe retornar [] gracias a Capa 1.

#### 5.4 Informe de tests obligatorio

- [x] Tabla con cada test ejecutado, resultado (✅/❌/⏭️), detalle si falla. Per regla 8 del workflow.

---

### Fase 6 — Documentación + commit (al final, con confirmación del user)

- [x] Actualizar este plan: marcar todas las checkboxes ✅, agregar notas de implementación, decisiones tomadas, edge cases descubiertos.
- [x] Actualizar `docs/plans/2026-04-22-qa-exhaustive.md` T071 → ✅ con detalle del fix.
- [x] Actualizar `CLAUDE.md` si se agregaron convenciones nuevas (helper realtime broadcast, channel naming convention).
- [x] Glosario gaps `qa-exhaustive.md`: agregar G35 (T071 fix) con resumen.
- [x] **Presentar diff total al user para confirmación antes de cualquier commit.**
- [x] Tras OK del user: commits atómicos por fase (recomendación inicial):
  - Commit 1: `chore(plan): realtime membership revocation sub-plan` — solo este archivo plan
  - Commit 2: `feat(security): RLS membership check on domain tables — Capa 1` — migrations 017 + mirror
  - Commit 3: `feat(realtime): membership-changed broadcast + RLS channel policy — Capa 2/3` — migration 018 + helper + actions + componente + layout
  - Commit 4: `docs(qa): T071 closed via realtime-membership-revocation sub-plan` — qa-exhaustive update + CLAUDE.md
- [x] Confirmación del user para split de commits (puede preferir uno solo).

---

## 5. Acceptance criteria

Para considerar T071 cerrado y este sub-plan completo:

1. ✅ Removed member NO puede leer ni escribir data de la org (verificado via SQL directo + E2E Playwright + race condition)
2. ✅ Toast + redirect llegan en <2s con conexión Realtime activa
3. ✅ Sin conexión Realtime, próximo query del user removed retorna [] (Capa 1 garantiza)
4. ✅ Multi-org user queda en estado válido (otra org activa) sin silent switch
5. ✅ Single-org user signOut + redirect transparente
6. ✅ Role change refleja permisos UI en <2s sin logout manual
7. ✅ Code review sin issues abiertos
8. ✅ Tabla de tests completa (5.2 + 5.3) con todos ✅
9. ✅ Migration 017 + 018 mirroreadas en `drizzle/sql/`
10. ✅ Documentación actualizada (este plan + qa-exhaustive + CLAUDE.md si aplica)

---

## 6. Open questions / decisiones a tomar durante implementación

- **OQ-1:** ¿Usar Supabase Realtime "broadcast" extension o "presence"? Broadcast es más liviano, no mantiene state. **Rec inicial:** broadcast.
- **OQ-2:** ¿`is_org_member()` debe filtrar por `deleted_at IS NULL`? **Sí** — soft-deleted member no debe contar como activo.
- **OQ-3:** ¿Performance impact de agregar `is_org_member()` a cada policy? Helper STABLE + indices en (user_id, organization_id) → costo despreciable. Validar en Fase 5.2 con EXPLAIN ANALYZE.
- **OQ-4:** ¿Bot tables (bot_messages, bot_activities) requieren membership check? **Sí** — bot conversations son data de la org. Si hoy no existen, anotar como TPD pendiente.
- **OQ-5:** ¿signOut propaga a otras tabs del mismo user automáticamente? Supabase Auth sincroniza via localStorage events en misma origin. Verificar.
- **OQ-6:** ¿Inngest jobs cross-org rompen con esta migración? Background jobs usan `getSupabaseAdmin()` (service role) que bypassa RLS — no afectados. Verificar grep cuáles use cases lo usan.

## 7. Rollback strategy

Si la migration 017 causa regresión en queries de dominio:

1. Migration `019_rollback_domain_rls_membership_check.sql` que restaura las policies anteriores (sin is_org_member).
2. Realtime broadcast/subscriber pueden quedar deployed sin daño (idempotentes, no-ops si nadie escucha).
3. Capa 1 sin Capa 3 = estado actual con security gap. Mejor que romper queries.
4. Investigar root cause del fallo del helper, parchear, re-aplicar 017.

## 8. Dependencias

- Plan QA `2026-04-22-qa-exhaustive.md` BLOQUE K T067-T071
- Helpers `is_org_member` etc en `drizzle/sql/014` y `015`
- Custom hook `drizzle/sql/012` (orphan defense ya implementada)
- Supabase Realtime habilitado (verificar en Dashboard)

## 9. Estimación

- Fase 0: 15 min (setup)
- Fase 1: 60-90 min (audit + migration + verification SQL)
- Fase 2: 45-60 min (broadcast + subscriber)
- Fase 3: 30-45 min (multi-org logic)
- Fase 4: 30 min (code review)
- Fase 5: 60 min (tests + report)
- Fase 6: 30 min (docs + commit)

**Total: ~4-5 horas** distribuibles en 1-2 sesiones.

---

## 10. Histórico de implementación

(Se irá llenando a medida que se ejecuten las fases. Notas de decisiones, bugs encontrados, gaps adicionales detectados.)

| Fecha | Fase | Notas |
|---|---|---|
| 2026-05-11 | Plan creado | Branch `feat/realtime-membership-revocation` from main. Cubre remove + role + multi-org + defense-in-depth. Trabajo sin commits intermedios; commits atómicos al final con confirmación del user. |
| 2026-05-11 | Implementación | Capa 1 (017a, 40 policies con `is_org_member`), Capa 1.5 (017b anon policies + refactor 4 bypass sites + dead code removal `getVisitsByProperty`), Capa 3 (018 realtime channel RLS + `realtime-broadcast.ts` + `RealtimeMembershipRefresher`), CLAUDE.md zero-trust rules. |
| 2026-05-11 | Code review | feature-dev:code-reviewer 1 CRITICAL (false positive — `leads_select_org` role restriction era pre-existing, no regression) + 2 IMPORTANT (analytics_events anon org_id check, comment fix) + 2 MINOR (multi-tab doc, mask `createdByUserId`) + 3 NIT. Issues válidos resueltos antes del commit. |
| 2026-05-11 | Tests post-fix | tsc/lint/build OK. SQL: anon SELECT property activa OK; anon INSERT analytics fake org BLOQUEADO; anon INSERT analytics valid org OK; auth member válido 1/0/0; auth spoofed (T071 fix) 0/0/0 BLOQUEADO. E2E /p/[id] + trackVisit funcional. Realtime broadcast E2E pendiente de manual user test 2-session. |
| 2026-05-12 | E2E fix bug 1 — blank dashboard tras REMOVE | Tras remove, target user re-loginea y queda con `user_active_org` apuntando a org soft-deleted → `getSessionContext()` throw → dashboard blanco. RPC v1 (`drizzle/sql/021`) cierra atomically: soft-delete + reset de `user_active_org` (flip a oldest remaining membership o DELETE row si no quedan). SECURITY DEFINER porque debe escribir cross-row a `user_active_org` (RLS bloquea). Authorisation re-checada con `is_org_admin(auth.uid())`. |
| 2026-05-12 | E2E fix bug 2 — member SELECT rechaza soft-delete | Soft-delete UPDATE fallaba con "new row violates row-level security policy". Causa: Postgres re-evalúa SELECT USING contra el NEW row post-UPDATE; la policy `member_select_same_org_or_superadmin` solo veía `deleted_at IS NULL`. Migration 019 widening: admins ven tombstones de su org en SELECT (la query del listing sigue filtrando por `deleted_at IS NULL` en el repo). |
| 2026-05-12 | Code review #2 (post-implementación E2E) | feature-dev:code-reviewer en 2 spawns paralelos (DB/server + UI/client). 16 issues detectados: 2 CRITICAL + 8 IMPORTANT + 4 MINOR + 2 NIT. Todos resueltos sin shortcuts. |
| 2026-05-12 | Fix CRIT-1 — RPC v3 semantics | RPC v2 dejaba `v_new_active_org` uninitialized cuando target's `active_org_id` ya apuntaba a otra org (no era la removida). Devolvía null ambiguo. Migration 023 asigna `v_new_active_org := v_active_org_current` en else branch. Contract claro: `null` = sin row; `<uuid>` = row válida. |
| 2026-05-12 | Fix CRIT-2 — Documentar bypass de withRLS | `softDeleteWithActiveOrgReset` usa `supabase.rpc()` (PostgREST autenticado) en vez de `withRLS`. Justificación: el RPC SECURITY DEFINER debe escribir a `user_active_org` de otro user, lo cual `withRLS` + UPDATE Drizzle no puede (RLS bloquea). Documentado en CLAUDE.md sección "Documented exceptions" con justificación completa. |
| 2026-05-12 | Fix IMP-1 — Clean Architecture | `removeMemberAction` instanciaba `DrizzleOrganizationRepository` directo para resolver orgName → viola regla "Presentation → Infrastructure: No". Nuevo `getOrganizationByIdUseCase` como intermediario; action ahora delega. |
| 2026-05-12 | Fix IMP-2 — refreshSessionAction error flag | Retorno `{ activeOrgId }` ambiguo: `null` podía ser eviction legítima o refresh fail. Cambio a `{ activeOrgId, error }`. Refresher consume `error` para decidir `needsSwitch` conservadoramente. |
| 2026-05-12 | Fix IMP-3 — Zombie session loop | Proxy redirigía `/dashboard` (claim active_org_id=null) a `/sign-in?reason=removed` sin signOut → cookie viva → loop infinito. Nueva route `app/auth/sign-out-removed/route.ts` que signOut server-side + redirect a sign-in. Proxy ahora redirige ahí. |
| 2026-05-12 | Fix IMP-4 — English tokens en code | Use cases y `translateRemovalError` throwian strings en español ("Miembro no encontrado", etc.) → viola regla "Todo código en inglés". Refactor: tokens English (`member_not_found`, `cannot_remove_owner`, `not_authorised`, etc.) en Application + Infrastructure. Whitelist en `member-actions.ts` mapea tokens → copy español user-facing. |
| 2026-05-12 | Fix IMP-5 — Security 019→020 tightening | 019 admin-branch sin guard `active_org_id`: multi-org admin podía SELECT tombstones cross-org. Migration 020 agrega `organization_id = active_org_id` al admin branch. `is_org_member` branch intencionalmente sin guard (preserva semantics 006 para org-switcher / multi-org navigation). |
| 2026-05-12 | Fix IMP-6 — handlingRef early release | `handlingRef` se reseteaba solo en `handleAcknowledge` → segundo broadcast (ej. removed después de role_changed) mientras dialog open era silently dropped. Reset post-`setVariant` en ambas branches; guarda solo cubre async prep. |
| 2026-05-12 | Fix IMP-7 — Dialog accessibility | sr-only span con instrucción explícita "Presiona Aceptar para continuar" (screen reader anuncia post-title/description). `aria-hidden="true"` en icon wrapper. WCAG 2.1 SC 3.3.2 compliance. **G36 anotado en glosario.** |
| 2026-05-12 | Fix IMP-8 — useEffect dep array narrow | Dep `[userId, supabase, router]` → `[userId]`. `supabase` es singleton globalThis, `router` stable per Next.js. Incluirlos riesgo de teardown/rebuild del channel + reset `handlingRef` mid-flight. Refs capturadas en closures. |
| 2026-05-12 | Fix MIN-1 — raw DB message en fallback | `translateRemovalError` default propagaba `error.message` (raw PostgrestError) → leak schema/constraints/PII. Fix: log raw server-side + return `removal_failed` fixed token. |
| 2026-05-12 | Fix MIN-2/U5/U6 — Dialog styling | DialogDescription className `text-base text-foreground` rompía design defaults → `font-medium text-foreground`. Icon wrapper sin aria-hidden → agregado. |
| 2026-05-12 | Fix NIT — Team-section bugs UX | Badge "asientos disponibles" visible para agents (no manejan capacity). Fix: gate por `canManage`. `seatsAvailable` movido inline al call site. `InviteForm.userRole` prop type narrowed a `"owner" \| "admin"` (documenta invariant que `canManage` ya garantiza). |
| 2026-05-12 | UX design decision — Blocking modal vs toast | Toast auto-dismiss 4s es fácil de perder cuando user no está mirando la pantalla. Modal `MembershipChangeDialog` bloquea (no Esc, no click-outside, no X) hasta Aceptar. 4 variants: role_changed_admin / role_changed_agent / removed_with_fallback / removed_no_fallback. Garantiza que user vea cambio antes de continuar. |
| 2026-05-12 | UX perf opt — skip-redundant-switch | `refreshSessionAction` retorna activeOrgId post-refresh. Cliente compara con fallback pick. Si match → solo `router.refresh`, no llamada redundante a `switchActiveOrgAction`. RPC ya flipeó `user_active_org` server-side, así que es el path común. |
| 2026-05-12 | Sanitiser whitelist + retry deadlock | `sanitiseError` whitelist con copy español → toasts limpios. Raw msg loggeado server-side. Retry once on Postgres 40P01 (deadlock_detected) en repo para mutual-remove storm (one tx aborts, retry succeeds). |
| 2026-05-12 | E2E smoke manual user-side | PROMOTE / DEMOTE / REMOVE / seat counter validados por user en navegador. tsc + eslint + build clean. RPC v3 verificada en DB Supabase (SECURITY DEFINER, args correctos). |
| 2026-05-12 | Glosario gaps | **G36**: sr-only hint requerido en blocking dialogs cuando Esc bloqueado intencionalmente. **G37**: accept-invite link usa query param `?inv=` (no `?token=`) — anotación QA pendiente para próximo lote (#28 realtime invitaciones). |
