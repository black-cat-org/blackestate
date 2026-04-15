import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../auth";
import { db } from "./index";
import { platformAdmins } from "./schema";
import type { SessionContext } from "./rls";

/**
 * Extract RLS session context from the current Better Auth session.
 *
 * Returns userId, orgId, org role, and super admin status.
 * Throws if no session or no active organization.
 *
 * Usage in Server Components / Server Actions:
 *   const ctx = await getSessionContext();
 *   const data = await withRLS(ctx, (tx) => tx.select()...);
 */
export async function getSessionContext(): Promise<SessionContext> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Not authenticated");
  }

  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    throw new Error("No active organization");
  }

  const activeMember = await auth.api.getActiveMember({
    headers: await headers(),
  });

  if (!activeMember) {
    throw new Error("Not a member of the active organization");
  }

  const role = activeMember.role as "owner" | "admin" | "agent";

  const superAdminRow = await db
    .select({ userId: platformAdmins.userId })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, session.user.id))
    .limit(1);

  return {
    userId: session.user.id,
    orgId,
    role,
    isSuperAdmin: superAdminRow.length > 0,
  };
}
