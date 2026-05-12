import { eq, and, isNull, sql } from "drizzle-orm"
import { member, organization } from "@/lib/db/schema"
import { withRLS } from "./rls"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { TeamMember, TeamSeatInfo } from "@/features/shared/domain/member.entity"
import type { IMemberRepository } from "@/features/shared/domain/member.repository"

/**
 * Translate a Postgres error raised by
 * `soft_delete_member_with_active_org_reset` (drizzle/sql/023) into a
 * stable English domain-error token. The RPC uses distinct `raise
 * exception` tokens so the action layer can map each one to localised
 * copy without parsing raw SQL text.
 *
 * `code` is the Postgres SQLSTATE. `40P01` (deadlock_detected) is
 * special-cased because it surfaces when two concurrent removals race
 * for the same pair of rows. This is benign at the data layer (one tx
 * commits, the other aborts cleanly), so we map it to a retry token.
 *
 * The default branch never propagates the raw Postgres message: it
 * could contain SQL fragments, constraint names, schema details, or
 * incidental PII. We log it server-side for diagnosis and return a
 * fixed English token to the caller.
 */
function translateRemovalError(message: string | undefined, code?: string): Error {
  if (code === "40P01") {
    return new Error("concurrent_operation")
  }
  switch (message) {
    case "not_authenticated":
    case "member_not_found":
    case "cannot_remove_owner":
    case "not_authorised":
      return new Error(message)
    case "member_already_removed":
      // Collapse "already removed" into "not found" at the domain level
      // — the action layer only needs to tell the user the member is no
      // longer there; whether they were just removed by someone else or
      // never existed is an implementation detail.
      return new Error("member_not_found")
    default:
      console.error(
        "[drizzle-member-repo] unexpected RPC error from soft_delete_member_with_active_org_reset:",
        { code, message },
      )
      return new Error("removal_failed")
  }
}

function orgScope(ctx: SessionContext) {
  return and(eq(member.organizationId, ctx.orgId), isNull(member.deletedAt))
}

function mapRowToTeamMember(row: {
  id: string
  userId: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: "owner" | "admin" | "agent"
  title: string | null
  createdAt: Date
}): TeamMember {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    name: row.name ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    role: row.role,
    title: row.title ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}

const MEMBER_COLUMNS = {
  id: member.id,
  userId: member.userId,
  email: member.email,
  name: member.name,
  avatarUrl: member.avatarUrl,
  role: member.role,
  title: member.title,
  createdAt: member.createdAt,
} as const

export class DrizzleMemberRepository implements IMemberRepository {
  async findAllByOrg(ctx: SessionContext): Promise<TeamMember[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(MEMBER_COLUMNS)
        .from(member)
        .where(orgScope(ctx))
        .orderBy(
          sql`CASE ${member.role} WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'agent' THEN 3 END`,
          member.createdAt,
        ),
    )

    return rows.map(mapRowToTeamMember)
  }

  async findById(ctx: SessionContext, memberId: string): Promise<TeamMember | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(MEMBER_COLUMNS)
        .from(member)
        .where(and(eq(member.id, memberId), orgScope(ctx)))
        .limit(1),
    )

    return rows[0] ? mapRowToTeamMember(rows[0]) : undefined
  }

  async updateRole(
    ctx: SessionContext,
    memberId: string,
    newRole: "admin" | "agent",
  ): Promise<void> {
    await withRLS(ctx, (tx) =>
      tx
        .update(member)
        .set({ role: newRole })
        .where(and(eq(member.id, memberId), orgScope(ctx))),
    )
  }

  async softDeleteWithActiveOrgReset(
    _ctx: SessionContext,
    memberId: string,
  ): Promise<{ targetUserId: string; newActiveOrgId: string | null }> {
    // Cross-row write to `user_active_org` (RLS-blocked for the caller)
    // is the reason we go through the SECURITY DEFINER RPC instead of a
    // direct Drizzle UPDATE. The RPC re-checks caller authorisation via
    // an inline locked SELECT against `public.member`, so SECURITY
    // DEFINER widens capability, not authorisation. See drizzle/sql/023.
    //
    // Retry once on Postgres SQLSTATE 40P01 (deadlock_detected). The
    // RPC acquires FOR UPDATE on the target row and FOR SHARE on the
    // caller's row in a fixed order; two simultaneous removals targeting
    // each other (admin A removes admin B while admin B removes admin
    // A) trip the deadlock detector. Postgres aborts one of the two
    // transactions cleanly — a single retry succeeds because the other
    // transaction has by then committed and the second-comer either
    // observes `member_already_removed` (target was them) or proceeds
    // normally (target is unrelated).
    const supabase = await getSupabaseServerClient()
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase.rpc(
        "soft_delete_member_with_active_org_reset",
        { p_member_id: memberId },
      )
      if (!error) {
        const payload = data as {
          target_user_id: string
          new_active_org_id: string | null
        }
        return {
          targetUserId: payload.target_user_id,
          newActiveOrgId: payload.new_active_org_id,
        }
      }
      const code = (error as { code?: string }).code
      if (code === "40P01" && attempt === 0) continue
      throw translateRemovalError(error.message, code)
    }
    throw new Error("unreachable")
  }

  async getSeatInfo(ctx: SessionContext): Promise<TeamSeatInfo> {
    return withRLS(ctx, async (tx) => {
      const memberRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(member)
        .where(orgScope(ctx))

      const orgRows = await tx
        .select({ maxSeats: organization.maxSeats })
        .from(organization)
        .where(eq(organization.id, ctx.orgId))
        .limit(1)

      return {
        maxSeats: orgRows[0]?.maxSeats ?? 1,
        currentMembers: memberRows[0]?.count ?? 0,
      }
    })
  }

  async countOwners(ctx: SessionContext): Promise<number> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({ count: sql<number>`count(*)::int` })
        .from(member)
        .where(and(eq(member.role, "owner"), orgScope(ctx))),
    )
    return rows[0]?.count ?? 0
  }
}
