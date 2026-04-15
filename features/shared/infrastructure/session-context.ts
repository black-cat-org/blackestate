import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { platformAdmins } from "@/lib/db/schema"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Extract RLS session context from the current Better Auth session.
 *
 * Returns userId, orgId, org role, and super admin status.
 * Throws if no session or no active organization.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const h = await headers()

  const session = await auth.api.getSession({ headers: h })

  if (!session) {
    throw new Error("Not authenticated")
  }

  let orgId = session.session.activeOrganizationId

  if (!orgId) {
    const orgs = await auth.api.listOrganizations({ headers: h })
    if (orgs && orgs.length > 0) {
      await auth.api.setActiveOrganization({
        headers: h,
        body: { organizationId: orgs[0].id },
      })
      orgId = orgs[0].id
    }
  }

  if (!orgId) {
    throw new Error("No active organization")
  }

  const activeMember = await auth.api.getActiveMember({ headers: h })

  if (!activeMember) {
    throw new Error("Not a member of the active organization")
  }

  const role = activeMember.role as "owner" | "admin" | "agent"

  const superAdminRow = await db
    .select({ userId: platformAdmins.userId })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, session.user.id))
    .limit(1)

  return {
    userId: session.user.id,
    orgId,
    role,
    isSuperAdmin: superAdminRow.length > 0,
  }
}
