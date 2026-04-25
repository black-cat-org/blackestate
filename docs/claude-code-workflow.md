# Claude Code — Workflow Guide & Setup

Documento de referencia para retomar el proyecto Black Estate desde otra computadora con Claude Code. Cubre el workflow que seguimos, buenas prácticas inviolables, y los MCPs / hooks / skills que necesitas configurar.

---

## 1. Filosofía del proyecto

| Principio | Significado práctico |
|---|---|
| **Calidad sobre velocidad** | No queremos parches rápidos. Soluciones robustas, testeadas, profesionales. Tomá el tiempo que necesites. |
| **Tarea por tarea** | Una tarea atómica a la vez. Confirmación explícita del usuario antes de cada implementación. |
| **No decisiones ciegas** | Investigá con MCPs/docs/codebase antes de presentar opciones. El usuario aprueba decisiones informadas, no responde preguntas que las herramientas pueden resolver. |
| **No acceptable shortcuts** | Si el code reviewer detecta un issue (incluso MINOR), se resuelve. No existe "MVP acceptable" como excusa. |
| **Tests con UI real** | El cliente usa la app, no SQL. Si una feature no tiene UI lista, se anota como tarea pendiente y se difiere el test, no se sustituye con SQL spoofed. (Excepción: validación de infraestructura como RLS isolation, donde el SQL spoofed JWT es legítimo.) |
| **Plan como fuente de verdad** | Todo trabajo va contra `docs/implementation-plan.md` o un sub-plan en `docs/plans/`. Sin plan no se trabaja. |

---

## 2. Workflow obligatorio — 12 pasos por tarea

Cada tarea = 1 commit atómico en la rama del plan.

1. **Anuncio.** "La próxima tarea es X. ¿OK?" — esperar respuesta.
2. **Diagnóstico + propuesta.** Tabla A/B/C de opciones con recomendación, trade-offs, riesgos. **NO codear todavía.**
3. **Esperar confirmación explícita.** No asumir.
4. **Research pre-código.** Consultar docs (Supabase MCP, context7, codebase grep) y verificar convenciones (CLAUDE.md, sub-plans).
5. **Implementación atómica.** Un commit por tarea.
6. **Code review obligatorio** con `feature-dev:code-reviewer`. Pasar contexto completo: CLAUDE.md, schemas/SQL relacionados, sub-plans. Mostrar SIEMPRE output completo.
7. **Resolver TODOS los issues.** Marcar false-positives con evidencia. Sin skipear ninguno válido.
8. **Tests post-fix** (siempre DESPUÉS del review):
   - `npx tsc --noEmit` limpio
   - `npx eslint .` sin nuevos warnings
   - `npm run build` end-to-end pass
   - Smoke runtime con Playwright MCP (happy path + edge cases)
   - Verificación cruzada en Supabase real (DB queries, auth logs)
   - **Informe de tests obligatorio:** tabla con cada test, ✅/❌/⏭️, detalle si falla. Sin tabla = paso incompleto.
9. **Actualizar docs.** Plan/sub-plan checkboxes, notas, decisiones, bugs. Actualizar `CLAUDE.md` si cambia arquitectura/infra/convenciones.
10. **Commit atómico.** HEREDOC message que explica POR QUÉ, no solo qué. `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Playwright artifacts en `.gitignore`.
11. **Reporte de cierre.** Qué cambió, qué issues hubo, qué queda pendiente, qué necesita acción del usuario.
12. **Anuncio de siguiente tarea** → vuelve al paso 1.

---

## 3. Reglas inviolables — seguridad y arquitectura

### Base de datos

- **NUNCA `drizzle-kit push`** — destruye tablas Supabase Auth.
- **NUNCA SQL destructivo** sin verificar exactamente qué hace.
- Env vars: `requireSupabaseEnv("LITERAL_NAME")` — no `process.env[dynamic]` (Turbopack/Webpack solo inline accesos literales).
- `set_config(...)` en vez de `SET LOCAL $1` (Postgres no parametriza SET).
- Cambios de schema: solo `drizzle-kit generate` + `drizzle-kit migrate`, o SQL manual via Supabase MCP `apply_migration`.

### Multitenancy — zero tolerance

- **EVERY user query a través de `withRLS(ctx, ...)`**. `db` directo solo para operaciones auth-system cross-org legítimas.
- **NUNCA Supabase Admin API para datos del dominio** (getUserById, listUsers). Si una tabla necesita `email`/`name`/`avatar` de `auth.users`, se denormaliza en la tabla del dominio.
- **NUNCA descargar todas las orgs para filtrar en memoria.** Cada query scoped a `ctx.orgId` vía RLS + filtro explícito.
- Admin API solo para: invitaciones (inviteUserByEmail), Inngest cross-org background jobs, seed scripts.

### Clean Architecture estricta

- **Domain ← Application ← Infrastructure ← Presentation.** Sin atajos.
- Domain NUNCA importa Infrastructure ni Presentation.
- Application NUNCA importa Infrastructure — recibe repositorios via parámetro.
- Repositories encapsulan Drizzle + RLS. NUNCA llaman APIs externas. Datos externos viven en la DB.

### Lenguaje

- **Código en inglés estricto:** variables, funciones, tipos, archivos, rutas, schemas, columnas.
- **Español SOLO para contenido visible al usuario final** (labels, mensajes de error UI). Va en constantes/diccionarios, no hardcodeado.
- **Español neutro con "tú"** (haz, copia, ve). Sin voseo argentino (hacé, copiá). Producto LATAM-wide.

### Calidad

- Code reviewer es checkpoint que NO se salta.
- Cualquier issue (incluso MINOR) se arregla antes del commit.
- Antes de implementar: ¿respeta multitenancy? ¿respeta Clean Architecture? ¿es la solución correcta o un workaround? Si hay duda → preguntar.

---

## 4. Patrones técnicos del proyecto

### Error handling cross-boundary (G24 pattern)

Para flows que cruzan server → client (Next.js Server Actions):

1. **Domain:** lanzar `XxxDomainError` con `code` typed (enum).
2. **Server Action wrapper:** `withXxxActionBoundary` atrapa, sanitiza vía `sanitizeXxxError`, re-throw `Error` plano con copy ES neutro (Next.js solo serializa `message` + `digest`).
3. **Client:** `getDisplayMessage(err, fallback)` (whitelisted en `lib/errors/`) para extraer mensaje sin tocar `err.message` directo.
4. **ESLint defensivo:** `no-restricted-syntax` prohíbe `error.message` en `app/`, `components/`, `features/*/presentation/` (excluye `*-actions.ts`).

Ejemplo de referencia: `lib/errors/invitation-errors.ts` + `features/shared/presentation/invitation-actions.ts`.

### RLS policies — anti-patterns prohibidos

- **NUNCA self-referential subquery en WITH CHECK** (`select FROM same_table m2 where m2.id = ...`). Bajo `FORCE RLS` re-evalúa la policy → `42P17 infinite recursion`. Casos históricos: G25 (invitation), G26 (member). Fix: SECURITY DEFINER helper que bypassea RLS (pattern `is_org_admin` en `006_rls_policies_supabase_auth.sql:100-113`).
- Migrations append-only en `drizzle/sql/NNN_*.sql`. Nunca modificar migrations aplicadas — agregar nuevas.
- 006 mantiene live-policy bodies viejos commented out (`/* ... */`) con header `🚫 DO NOT re-run` cuando una migration superseded los reemplaza, para prevenir re-introducción si se replay 006 standalone.

### Forms

Todo formulario React: **react-hook-form + zodResolver + shadcn Form/FormField/FormMessage + `noValidate`**. Schemas en `lib/validations/`. Sin HTML5 validation bubbles (web de baja calidad).

### HTTP status codes

Backend (Next.js API routes, Server Actions con error handling complejo):
- 200 OK (read) / 201 Created / 204 No Content
- 400 validation, 401 no auth, 403 forbidden, 404 not found, 409 conflict, 422 semantic, 429 rate limit, 500 server fault
- **NUNCA 500 para input inválido. NUNCA 200 con `{ ok: false }` (anti-pattern).**

### Org switching (G27 pattern)

Cuando server actions cambian state que afecta TODA la app (ej. active_org_id):
1. Server action: `revalidatePath("/dashboard", "layout")` (scope layout invalida todas las nested routes).
2. Client: `window.location.reload()` en `finally` block. Garantiza refetch en pages server O client (no asume tipo de fetching). UX trade-off: brief flash, aceptable porque es operación rara.
3. `catch` explícito con `console.error` antes del reload (startTransition swallows async throws).

Referencia: `components/org-switcher.tsx` + `features/shared/presentation/organization-actions.ts`.

---

## 5. Setup de Claude Code en otra computadora

### 5.1 Hooks obligatorios

**Master-prompt:** archivo crítico que se inyecta como contexto antes de cada `Edit`/`Write`/`Agent` para mantener consistency a través de sesiones largas.

```bash
# 1. Copiar el archivo desde el repo a la ubicación esperada por Claude Code
mkdir -p ~/.claude/hooks
cp /path/to/blackestate/master-prompt.md ~/.claude/hooks/master-prompt-blackestate.md
```

> El archivo `master-prompt.md` vive en la raíz del repo. Si lo modificás, hay que sincronizar la copia en `~/.claude/hooks/`. Hay un comentario al final del archivo recordándolo.

Configurá el hook en `~/.claude/settings.json` (o el equivalente):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|Agent",
        "hooks": [
          {
            "type": "command",
            "command": "cat ~/.claude/hooks/master-prompt-blackestate.md"
          }
        ]
      }
    ]
  }
}
```

### 5.2 MCP servers obligatorios

**1. Supabase MCP** — para `apply_migration`, `execute_sql`, `list_migrations`, `get_logs`, etc.

```bash
# Claude Code lo gestiona vía OAuth. Primer uso pedirá autorización vía URL.
# Asegurate que el proyecto Supabase del repo esté linkeado.
# Project ref: jaozybchjfengqlckiul (visible en supabase.com Dashboard URL)
```

Cuando el MCP se desconecta (por compactaciones de contexto, restarts, etc.) hay que re-autenticar:
- Llamar tool `mcp__supabase__authenticate` → devuelve URL OAuth → abrir en browser → autorizar.

**2. Playwright MCP** — para tests UI reales (browser automation).

```bash
# Plugin activado dentro de Claude Code. No requiere config adicional.
# Tools usados: browser_navigate, browser_snapshot, browser_click, browser_evaluate,
# browser_console_messages, browser_wait_for.
```

**3. (Opcional) Context7 MCP** — para fetchear documentación oficial de librerías (Next.js, Supabase, react-hook-form, etc.). Útil cuando el código training está desactualizado.

### 5.3 Skills opcionales

| Skill | Para qué |
|---|---|
| `caveman` | Modo de respuesta terse (drop articles, fragments OK). Útil para sesiones largas donde el ruido cuesta caro. Activación: `/caveman:caveman full` o `/caveman:caveman lite`. |
| `feature-dev:code-reviewer` | Subagent obligatorio del workflow. Usado en paso 6. **Imprescindible.** |
| `feature-dev:code-explorer` | Útil para análisis profundo de features existentes antes de modificarlas. |
| `superpowers:systematic-debugging` | Si encontrás bugs raros, este skill estructura el debug. |
| `Plan` (built-in) | Para implementaciones que requieren architectural design upfront. |
| `Explore` (built-in) | Para mapear el codebase rápido (más eficiente que grep ad-hoc). |

### 5.4 Output style recomendado

`learning` o `explanatory` — incluye `★ Insight ─────────` blocks que documentan decisiones técnicas inline. Útil para retomar en otra compu porque el contexto técnico queda en el log de la conversación.

### 5.5 Verificación post-setup

Antes de empezar a trabajar, validá que todo funcione:

```bash
# 1. El repo está clonado y en la rama correcta
cd /path/to/blackestate
git status
git log --oneline -5

# 2. Dependencias instaladas
npm install
npx tsc --noEmit
npm run build

# 3. Env vars en .env.local (ver .env.template)
ls -la .env.local

# 4. Dev server arranca
npm run dev
# Abrir http://localhost:3000

# 5. Supabase MCP responde
# En Claude Code, pedile: "list migrations en Supabase"
# Debería ejecutar mcp__supabase__list_migrations sin errores

# 6. Playwright MCP responde
# Pedile: "navegá a localhost:3000 y screenshot"

# 7. Hook activo
# Pedile cualquier Edit. Antes del Edit deberías ver el master-prompt inyectado.
```

---

## 6. Estado actual del proyecto (snapshot al 2026-04-25)

| Área | Estado |
|---|---|
| **Branch activa** | `qa/2026-04-22-exhaustive` (11 commits ahead de `origin/main`, sin push) |
| **Auth** | Migración Better Auth → Supabase Auth completa. Sub-plans cerrados. |
| **Multitenancy** | Modelo "1 self-owned org per user" enforced. Multi-org sólo via invitación aceptada. |
| **QA Lote 1 (Auth T001-T034)** | ✅ Cerrado |
| **QA Lote 2 (Tenancy T035-T054)** | ✅ Cerrado |
| **QA Lote 3 (Invitations T085-T114)** | ✅ Cerrado — 11 ✅ + 4 ⚠️ + 2 ❌ + 13 ⏭️ |
| **G24 + G25 fix** | ✅ Cerrado (commit `efe4ecc`) |
| **G26 fix (member RLS)** | ✅ Cerrado (commit `de651ab`) |
| **QA Lote 4 (RLS isolation T115-T124)** | ✅ Cerrado — 5 ✅ + 5 ⏭️ |
| **G27 fix (orgswitcher)** | ✅ Cerrado (commit `506c4b7`) |

### Tareas pendientes de desarrollo (TPDs) — bloquean re-test de Lote 4

| ID | Qué falta | Bloquea |
|---|---|---|
| TPD-1 | UI crear lead | T118, T119 |
| TPD-2 | UI crear ai_content | T120 |
| TPD-3 | bot_config form completo (prompt, persona, FAQs) | T121 |
| TPD-4 | super_admin seed/UI | T123 |
| TPD-5 | Re-correr T118-T121 + T123 post TPDs | — |

### Próximos lotes QA

- Lote 5 — Storage avatars (T125-T127) y otros bloques pendientes
- Lote 6+ — definidos en `docs/plans/2026-04-22-qa-exhaustive.md`

---

## 7. Documentos clave del proyecto

| Doc | Propósito |
|---|---|
| `CLAUDE.md` | Fuente de verdad de arquitectura, convenciones, decisiones técnicas. **Leer al iniciar cualquier sesión.** |
| `master-prompt.md` | Reglas del workflow (espejo del hook). |
| `docs/implementation-plan.md` | Plan general del proyecto, IMPs numerados. |
| `docs/plans/*.md` | Sub-plans específicos (auth migration, multi-org removal, fix invitations, etc.). |
| `docs/plans/2026-04-22-qa-exhaustive.md` | QA exhaustivo activo. Glosario de gaps (G1-G27 a la fecha). |
| `docs/roles-and-permissions.md` | Modelo de roles owner/admin/agent + plans. |
| `docs/tech-stack.md` | Stack completo. |
| `~/.claude/projects/.../memory/MEMORY.md` | Memoria personal del usuario (preferencias, decisiones pasadas). Persiste cross-session. |

---

## 8. Comandos rápidos de retomada

```bash
# Verificar dónde estás
cd /path/to/blackestate
git status
git log --oneline -10

# Leer el último estado del QA
less docs/plans/2026-04-22-qa-exhaustive.md  # buscar "Estado:" para ver tests pendientes

# Leer sub-plans abiertos
ls docs/plans/

# Verificar que Supabase MCP funcione
# (en Claude Code) → "list migrations"

# Arrancar dev
npm run dev
```

---

## 9. Resumen de hábitos que aprendimos juntos (no negociables)

1. **Antes de codear → diagnóstico A/B/C + esperar OK.** Nunca empezar sin confirmación.
2. **Code reviewer SIEMPRE** después de implementar, ANTES de tests.
3. **Resolver todos los issues del review** sin excepción. "MVP acceptable" no existe.
4. **Tests con UI real** (Playwright). Si no hay UI, anotar como TPD y diferir.
5. **Informe de tests obligatorio en tabla** ✅/❌/⏭️ con detalles.
6. **Migrations append-only.** Live SQL viejo se comenta con `🚫 DO NOT re-run` cuando se supersedea.
7. **Errors no leakean SQL/PII al UI.** Triple defensa: domain class + server boundary + ESLint rule.
8. **Multitenancy zero-tolerance.** Cada query usa `withRLS()`. Cada datos vive donde se consulta (denormalizar si hace falta).
9. **Commits HEREDOC con POR QUÉ.** No solo qué cambió.
10. **Plan al día.** Cada tarea actualiza checkboxes + notas en `docs/plans/`.

---

Hasta acá. En la otra compu retomas leyendo este doc + `CLAUDE.md` + el QA exhaustivo (estado de tests + glosario). Suerte.
