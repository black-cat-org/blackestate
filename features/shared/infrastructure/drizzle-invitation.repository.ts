import { eq, and, sql, isNull, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { invitation, member, organization, userActiveOrg } from "@/lib/db/schema"
import { mapInvitationRowToEntity } from "./invitation.mapper"
import type { Invitation, PendingInvitation, InvitableRole } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

const INVITABLE_ROLES: readonly string[] = ["admin", "agent"]

export class DrizzleInvitationRepository implements IInvitationRepository {
  async findByToken(token: string): Promise<Invitation | undefined> {
    const rows = await db
      .select()
      .from(invitation)
      .where(eq(invitation.token, token))
      .limit(1)

    if (!rows[0]) return undefined

    if (!INVITABLE_ROLES.includes(rows[0].role)) {
      throw new Error(`Unexpected invitation role in DB: ${rows[0].role}`)
    }

    return mapInvitationRowToEntity(rows[0])
  }

  async findPendingByOrgId(orgId: string): Promise<PendingInvitation[]> {
    const rows = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, orgId),
          eq(invitation.status, "pending"),
          gt(invitation.expiresAt, new Date()),
        ),
      )
      .orderBy(invitation.createdAt)

    return rows
      .filter((r) => INVITABLE_ROLES.includes(r.role))
      .map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role as InvitableRole,
        expiresAt: r.expiresAt.toISOString(),
      }))
  }

  async hasPendingForEmail(orgId: string, email: string): Promise<boolean> {
    const rows = await db
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, orgId),
          eq(invitation.email, email.toLowerCase()),
          eq(invitation.status, "pending"),
          gt(invitation.expiresAt, new Date()),
        ),
      )
      .limit(1)
    return rows.length > 0
  }

  async create(data: {
    organizationId: string
    email: string
    role: InvitableRole
    token: string
    invitedByUserId: string
    expiresAt: Date
  }): Promise<Invitation> {
    const [row] = await db
      .insert(invitation)
      .values({
        organizationId: data.organizationId,
        email: data.email.toLowerCase(),
        role: data.role,
        status: "pending",
        token: data.token,
        invitedByUserId: data.invitedByUserId,
        expiresAt: data.expiresAt,
      })
      .returning()
    return mapInvitationRowToEntity(row)
  }

  async markAccepted(id: string): Promise<void> {
    await db
      .update(invitation)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(invitation.id, id))
  }

  async markExpired(id: string): Promise<void> {
    await db
      .update(invitation)
      .set({ status: "expired" })
      .where(eq(invitation.id, id))
  }

  async markCancelled(orgId: string, invitationId: string): Promise<void> {
    const result = await db
      .update(invitation)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(invitation.id, invitationId),
          eq(invitation.organizationId, orgId),
          eq(invitation.status, "pending"),
        ),
      )
      .returning({ id: invitation.id })

    if (result.length === 0) {
      throw new Error("Invitation not found or cannot be cancelled")
    }
  }

  async deleteByToken(token: string): Promise<void> {
    await db.delete(invitation).where(eq(invitation.token, token))
  }

  async getOrgSeatInfo(orgId: string): Promise<{ maxSeats: number; currentMembers: number }> {
    const [org] = await db
      .select({ maxSeats: organization.maxSeats })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1)

    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(member)
      .where(and(eq(member.organizationId, orgId), isNull(member.deletedAt)))

    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, orgId),
          eq(invitation.status, "pending"),
          gt(invitation.expiresAt, new Date()),
        ),
      )

    return {
      maxSeats: org?.maxSeats ?? 1,
      currentMembers: (memberCount?.count ?? 0) + (pendingCount?.count ?? 0),
    }
  }

  async isMemberOfOrg(userId: string, orgId: string): Promise<boolean> {
    const rows = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(eq(member.userId, userId), eq(member.organizationId, orgId), isNull(member.deletedAt)),
      )
      .limit(1)
    return rows.length > 0
  }

  async acceptAndCreateMember(data: {
    invitationId: string
    userId: string
    organizationId: string
    role: InvitableRole
  }): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(member).values({
        userId: data.userId,
        organizationId: data.organizationId,
        role: data.role,
      })

      await tx
        .insert(userActiveOrg)
        .values({ userId: data.userId, organizationId: data.organizationId })
        .onConflictDoUpdate({
          target: userActiveOrg.userId,
          set: { organizationId: data.organizationId, updatedAt: new Date() },
        })

      await tx
        .update(invitation)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(invitation.id, data.invitationId))
    })
  }
}
