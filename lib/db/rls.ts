import { sql } from "drizzle-orm";
import { db } from "./index";

export interface SessionContext {
  userId: string;
  orgId: string;
  role: "owner" | "admin" | "agent";
  isSuperAdmin?: boolean;
}

interface RLSOptions {
  includeDeleted?: boolean;
}

/**
 * Execute a callback within a transaction that enforces RLS.
 *
 * Sets LOCAL role to 'authenticated' so Postgres RLS policies apply,
 * then injects claims (userId, orgId, role) that policies read via
 * current_setting('request.jwt.claims').
 *
 * Use `opts.includeDeleted` to enable trash/restore view for owner/admin
 * (agent only sees own deleted records, enforced by policy).
 */
export async function withRLS<T>(
  ctx: SessionContext,
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
  opts?: RLSOptions,
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({
      sub: ctx.userId,
      org_id: ctx.orgId,
      org_role: ctx.role,
      is_super_admin: ctx.isSuperAdmin ?? false,
    });

    await tx.execute(sql`SET LOCAL role = 'authenticated'`);
    await tx.execute(sql`SET LOCAL request.jwt.claims = ${claims}`);

    if (opts?.includeDeleted) {
      await tx.execute(sql`SET LOCAL app.include_deleted = 'true'`);
    }

    return callback(tx);
  });
}
