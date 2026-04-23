# Sub-plan — Slug consistency + handle_new_user trigger sync

**Creado:** 2026-04-23 · **Rama:** `qa/2026-04-22-exhaustive` · **Origen:** QA Lote 1 gaps G11 (P1) + G12 (P2)

## Problema

1. **G11 (P1) — Drift SQL file vs DB real.** `drizzle/sql/005_org_creation_trigger.sql` define una versión distinta del trigger `handle_new_user` a la que corre en prod. Source of truth perdido — regenerar DB desde repo produciría comportamiento distinto.
2. **G12 (P2) — Slug format inconsistente.** Versión actual solo agrega suffix en colisión. Resultado: unos slugs "bonitos" (`test-a`) y otros "feos" (`test-a-abc123`). Inconsistencia UX + URLs impredecibles para users.

## Decisión tomada (2026-04-23)

**Opción C (nanoid base62, 7 chars crypto-random):** todo slug nuevo tendrá formato `{display-slug}-{7chars}` siempre. `62^7 = 3.5T` → collision-free en la práctica. Industry standard (Linear/Vercel/Discord).

No se migran slugs pre-existentes (evita breaking URLs de orgs ya creadas).

## Alcance

- [x] 1. Crear función helper `public.random_base62(len int)` — crypto-random via `gen_random_bytes`
- [x] 2. Reemplazar `public.handle_new_user()` con versión canónica (suffix siempre)
- [x] 3. Aplicar migration via `mcp__supabase__apply_migration` (tracked en migrations table) — 2 migrations:
  - `handle_new_user_sync_with_slug_suffix` (initial)
  - `handle_new_user_sync_review_fixes` (applied 3 issues del code reviewer)
- [x] 4. Crear `drizzle/sql/011_handle_new_user_sync.sql` como mirror source of truth en repo
- [x] 5. Agregar nota `SUPERSEDED BY 011` al header de `005_org_creation_trigger.sql`
- [x] 6. Code review obligatorio (`feature-dev:code-reviewer`) — 2 MAJOR + 1 MINOR + 2 false positives encontrados
- [x] 7. Resolver issues del reviewer — todos los 3 accionables aplicados (atomicity + anon grant + member.name). El MINOR "out of scope" sobre `003` registrado como G13 en QA doc
- [x] 8. Runtime test: user F `test-f@blackestate.dev` creado via sign-up → slug = `test-f-Z5iMLdx` (regex `^test-f-[a-zA-Z0-9]{7}$` OK), member.name = "Test F" (display_name fallback funciona), user_active_org matches. Click email confirm → /dashboard OK
- [x] 9. Regression test: tsc ✅ sin errores, eslint ✅ sin errores nuevos (8 warnings preexistentes del proyecto)
- [x] 10. Update QA doc (`docs/plans/2026-04-22-qa-exhaustive.md`) — G11, G12 marcados ✅ con commit SHA
- [x] 11. Commit atómico en rama `qa/2026-04-22-exhaustive`

## Gaps descubiertos en code review

- **G13 (P3)**: `drizzle/sql/003_custom_access_token_hook.sql:88-89` no aplica `nullif/trim` al leer `full_name`/`name`. Inconsistente con 011 ahora. Out of scope de este sub-plan — fixer en sub-plan dedicado que toque 003 (requiere migration propia + test del JWT hook).

## Review fixes aplicados (2da migration)

| Issue | Severidad | Fix |
|---|---|---|
| M1 Atomicity — los 3 inserts no estaban en un solo savepoint. Partial failure dejaba org orphan | MAJOR | Wrap los 3 inserts en un inner BEGIN/EXCEPTION — savepoint cubre todo, retry completo en unique_violation |
| M2 `random_base62` GRANT a `anon` innecesario + inconsistente con least-privilege | MAJOR | REVOKE anon/public, mantener authenticated + supabase_auth_admin |
| M3 `member.name` sin fallback — regresión vs 005 | MINOR | Usar `display_name` coalesced (mismo fallback que organization.name) |
| M4 `003` sin nullif/trim | MINOR out-of-scope | Registrado como G13 |

## Decisiones de diseño

### Trigger canónico

| Aspecto | Decisión | Razón |
|---|---|---|
| Fuente del `base_slug` | `display_name` slugificado (no email local) | Match con comportamiento DB actual; emails sensibles no deberían filtrar en URL |
| Fallback display_name | `coalesce(full_name, split_part(email,'@',1), 'User')` | Robustez para OAuth (Google usa `full_name`) + phone-auth futuro |
| Suffix default | `random_base62(7)` **siempre** | Consistencia total de formato |
| Suffix en colisión | `random_base62(10)` retry | Extremadamente raro (62^7 ≠ match) pero defensivo |
| Random source | `extensions.gen_random_bytes(len)` | Crypto-random (no `random()` — no crypto-safe) |
| `search_path = ''` | Mantener | Canonical Supabase SECURITY DEFINER pattern |
| Exception handler outer | Mantener warning + RETURN NEW | Nunca bloquear sign-up; hook recovery vía active_org_id null |

### Función helper `random_base62`

- `SECURITY INVOKER` (no DEFINER) — no toca tablas protegidas
- `SET search_path = ''` — evita hijacking
- `extensions.gen_random_bytes(len)` — requiere extension `pgcrypto` (Supabase default) bajo schema `extensions`
- Math: `get_byte(bytes, i-1) % 62` → index en charset de 62 chars
- Charset: `a-zA-Z0-9` (62 chars, URL-safe, case-sensitive OK para slugs)

### Grants

- `GRANT EXECUTE ON FUNCTION public.random_base62(int) TO authenticated, supabase_auth_admin, anon;`
  — función pura sin side effects, puede ser llamada por cualquiera (no leak).

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Trigger break → users signup fallan | Outer exception handler conserva el comportamiento actual: RAISE WARNING + RETURN NEW. User lands sin org → JWT hook emite active_org_id=null → UI recovery |
| `random()` no crypto-random | Usar `extensions.gen_random_bytes` explícito |
| 62^7 colisiones teóricas | Retry con 10 chars en caso extremadamente raro |
| pgcrypto no disponible | Supabase tiene por default (confirmado) |
| Slugs pre-existentes sin suffix | Dejar intactos — URLs estables, consistencia aplicada solo a nuevos |

## Test plan (post-fix)

1. Sign-up user F `test-f@blackestate.dev` → DB check:
   - `organization.slug` ~= `test-f-[a-zA-Z0-9]{7}`
   - `member.role = 'owner'`, `user_id` + `organization_id` correctos
   - `user_active_org.organization_id` = org id
   - JWT post sign-in incluye `active_org_id`, `org_role='owner'`
2. Re-ejecutar T001 (smoke del Lote 1) — sign-up válido debe seguir funcionando
3. Query DB `SELECT slug FROM public.organization` — mix de slugs viejos (sin suffix) + nuevos (con suffix) esperado

## Out of scope

- Migración retroactiva de slugs pre-existentes (breaking URLs — diferido)
- G1 (resend confirmation flow) — sub-plan separado post este
- Otros Ps en QA doc
