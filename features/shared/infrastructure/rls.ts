import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import type { SessionContext } from "@/features/shared/domain/session-context"

export type { SessionContext } from "@/features/shared/domain/session-context"

export type RLSTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Execute a callback within a transaction that enforces RLS.
 *
 * Drizzle queries run over a raw Postgres connection and therefore bypass
 * the Supabase-issued JWT. To apply the same RLS policies that the Supabase
 * client would, we:
 *
 *   1. Switch the role to `authenticated` so policies targeting that role
 *      (from `drizzle/sql/006_rls_policies_supabase_auth.sql`) take effect.
 *   2. Inject a JSON `request.jwt.claims` config that `auth.uid()`,
 *      `auth.jwt()`, and the `authorize()` helper read. Claim names mirror
 *      what the `custom_access_token` hook emits: `sub`, `active_org_id`,
 *      `org_role`, `is_super_admin`.
 *
 * Both settings are applied via `set_config(name, value, is_local := true)`
 * — `SET LOCAL` does not accept query parameters (Postgres parses it as a
 * statement, not a value), so the parametrised form is the only safe way
 * to pass dynamic user data without string concatenation.
 *
 * Soft-delete visibility is enforced per-policy: agents only see own
 * `deleted_at IS NOT NULL` rows; owner/admin see the full trash for their
 * org. Callers that need a "trash view" filter `deleted_at IS NOT NULL`
 * explicitly in their queries — there is no global GUC to flip.
 */
export async function withRLS<T>(
  ctx: SessionContext,
  callback: (tx: RLSTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({
      sub: ctx.userId,
      active_org_id: ctx.orgId,
      org_role: ctx.role,
      is_super_admin: ctx.isSuperAdmin ?? false,
    })

    await tx.execute(sql`SELECT set_config('role', 'authenticated', true)`)
    await tx.execute(sql`SELECT set_config('request.jwt.claims', ${claims}, true)`)

    return callback(tx)
  })
}
