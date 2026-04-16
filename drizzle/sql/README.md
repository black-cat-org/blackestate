# Manual SQL Migrations

SQL ejecutado a mano via Supabase MCP `execute_sql` o `psql` CLI. No gestionado por Drizzle Kit.

Contienen: hooks, triggers, functions, policies, rewires de FKs, y migraciones de auth.

## Orden de aplicación

| # | Archivo | Sub-plan | Qué hace |
|---|---|---|---|
| 001 | `001_pre_rename_better_auth_tables.sql` | 01 | Rename Better Auth tablas → `*_legacy_better_auth` (preamble) |
| 002 | `002_invitation_check_constraint.sql` | 01 | CHECK constraint: pending invitations require inviter |
| 003 | `003_custom_access_token_hook.sql` | 03 | JWT custom claims hook (Supabase Auth) |
| 004 | `004_authorize_function.sql` | 04 | RBAC seed + `authorize()` function |
| 005 | `005_org_creation_trigger.sql` | 05 | Auto-create org on new auth.users insert |
| 006 | `006_rls_policies_supabase_auth.sql` | 07 | Rewrite RLS para Supabase Auth |
| 011 | `011_rewire_fks.sql` | 11 | Re-wire FKs de tablas dominio → nueva `organization` |
| 012 | `012_drop_legacy_tables.sql` | 12 | Drop tablas Better Auth legacy |

## Aplicar

Opción A (preferida): Supabase MCP `execute_sql` con el contenido del archivo.

Opción B: `psql "$DATABASE_URL" -f drizzle/sql/NNN_*.sql`
