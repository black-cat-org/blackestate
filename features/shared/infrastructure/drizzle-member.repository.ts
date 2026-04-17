import { eq, and, isNull, sql } from "drizzle-orm"
import { member, organization } from "@/lib/db/schema"
import { withRLS } from "./rls"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { TeamMember, TeamSeatInfo } from "@/features/shared/domain/member.entity"
import type { IMemberRepository } from "@/features/shared/domain/member.repository"

function orgScope(ctx: SessionContext) {
  return and(eq(member.organizationId, ctx.orgId), isNull(member.deletedAt))
}

type MemberRow = {
  id: string
  userId: string
  role: "owner" | "admin" | "agent"
  title: string | null
  createdAt: Date
}

type UserInfoMap = Map<string, { name?: string; email: string; avatarUrl?: string }>

async function buildUserInfoMap(userIds: string[]): Promise<UserInfoMap> {
  if (userIds.length === 0) return new Map()

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })

  if (error || !data?.users) return new Map()

  const idSet = new Set(userIds)
  const map: UserInfoMap = new Map()

  for (const user of data.users) {
    if (idSet.has(user.id)) {
      map.set(user.id, {
        name: (user.user_metadata?.full_name as string) ?? undefined,
        email: user.email ?? "",
        avatarUrl: (user.user_metadata?.avatar_url as string) ?? undefined,
      })
    }
  }

  return map
}

function mapRowsToMembers(rows: MemberRow[], userMap: UserInfoMap): TeamMember[] {
  return rows.map((row) => {
    const info = userMap.get(row.userId)
    return {
      id: row.id,
      userId: row.userId,
      name: info?.name,
      email: info?.email ?? "",
      avatarUrl: info?.avatarUrl,
      role: row.role,
      title: row.title ?? undefined,
      createdAt: row.createdAt.toISOString(),
    } satisfies TeamMember
  })
}

export class DrizzleMemberRepository implements IMemberRepository {
  async findAllByOrg(ctx: SessionContext): Promise<TeamMember[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          id: member.id,
          userId: member.userId,
          role: member.role,
          title: member.title,
          createdAt: member.createdAt,
        })
        .from(member)
        .where(orgScope(ctx))
        .orderBy(
          sql`CASE ${member.role} WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'agent' THEN 3 END`,
          member.createdAt,
        ),
    )

    const userMap = await buildUserInfoMap(rows.map((r) => r.userId))
    return mapRowsToMembers(rows, userMap)
  }

  async findById(ctx: SessionContext, memberId: string): Promise<TeamMember | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          id: member.id,
          userId: member.userId,
          role: member.role,
          title: member.title,
          createdAt: member.createdAt,
        })
        .from(member)
        .where(and(eq(member.id, memberId), orgScope(ctx)))
        .limit(1),
    )

    if (!rows[0]) return undefined

    const admin = getSupabaseAdmin()
    const { data } = await admin.auth.admin.getUserById(rows[0].userId)
    const user = data?.user

    return {
      id: rows[0].id,
      userId: rows[0].userId,
      name: (user?.user_metadata?.full_name as string) ?? undefined,
      email: user?.email ?? "",
      avatarUrl: (user?.user_metadata?.avatar_url as string) ?? undefined,
      role: rows[0].role,
      title: rows[0].title ?? undefined,
      createdAt: rows[0].createdAt.toISOString(),
    }
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
