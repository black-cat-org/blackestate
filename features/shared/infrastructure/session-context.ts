import { headers } from "next/headers"
import { eq, sql } from "drizzle-orm"
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
  let role: "owner" | "admin" | "agent" | undefined

  // Try to get active member from the session cookie
  if (orgId) {
    const activeMember = await auth.api.getActiveMember({ headers: h })
    if (activeMember) {
      role = activeMember.role as "owner" | "admin" | "agent"
    }
  }

  // Fallback: if session cookie doesn't have activeOrganizationId yet
  // (first request after login/signup), read directly from member table.
  // The dashboard layout calls ensureOrganization() first, so the org
  // always exists in DB by the time this runs.
  if (!orgId || !role) {
    const memberRows = await db.execute(
      sql`SELECT "organizationId", "role" FROM "member" WHERE "userId" = ${session.user.id} LIMIT 1`
    )
    const row = (memberRows.rows as Array<{ organizationId: string; role: string }>)[0]

    if (row) {
      orgId = row.organizationId
      role = row.role as "owner" | "admin" | "agent"
    }
  }

  if (!orgId || !role) {
    throw new Error("No active organization")
  }

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
