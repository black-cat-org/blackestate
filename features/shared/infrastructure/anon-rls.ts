import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import type { RLSTransaction } from "@/features/shared/infrastructure/rls"

/**
 * Execute a callback within a transaction that runs as the Supabase `anon`
 * role, with no JWT claims attached.
 *
 * The companion to `withRLS()`: where `withRLS` switches to `authenticated`
 * for member-scoped queries, `withAnon` switches to `anon` for the public
 * landing flow (`/p/[id]`). Both wrappers exist so that NO domain query
 * runs as the underlying `postgres` superuser, which has `BYPASSRLS=true`
 * and would silently skip every policy. The only legitimate caller of
 * `db` direct (postgres) is the `withRLS` / `withAnon` wrappers themselves
 * — every other read or write must go through one of them so that an RLS
 * policy is always evaluated.
 *
 * The anon role can only see rows whose policies explicitly allow `TO
 * anon`. The relevant policies live in `drizzle/sql/017b_anon_public_policies.sql`:
 *
 * - `properties_select_public`: SELECT only `status='active' AND deleted_at IS NULL`
 * - `analytics_events_insert_public_visit`: INSERT only `event_type='property_visit'`
 *
 * Any anon query against another table or attempting a forbidden operation
 * returns zero rows / zero rows affected — failing closed.
 *
 * `set_config(..., true)` is transaction-local, so the role reverts to
 * `postgres` automatically when the transaction commits or rolls back.
 */
export async function withAnon<T>(
  callback: (tx: RLSTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('role', 'anon', true)`)
    return callback(tx)
  })
}
