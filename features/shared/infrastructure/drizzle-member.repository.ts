import { eq, and, isNull, sql } from "drizzle-orm"
import { member, organization } from "@/lib/db/schema"
import { withRLS } from "./rls"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { TeamMember, TeamSeatInfo } from "@/features/shared/domain/member.entity"
import type { IMemberRepository } from "@/features/shared/domain/member.repository"

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

  async softDelete(ctx: SessionContext, memberId: string): Promise<void> {
    await withRLS(ctx, (tx) =>
      tx
        .update(member)
        .set({ deletedAt: new Date() })
        .where(and(eq(member.id, memberId), orgScope(ctx))),
    )
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
