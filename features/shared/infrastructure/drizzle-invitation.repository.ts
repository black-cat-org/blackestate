import { eq, and, sql, isNull, gt } from "drizzle-orm"
import { invitation, member, organization } from "@/lib/db/schema"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { withRLS } from "./rls"
import { mapInvitationRowToEntity } from "./invitation.mapper"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Invitation, PendingInvitation, InvitableRole } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

const INVITABLE_ROLES: readonly string[] = ["admin", "agent"]

/**
 * Translate a Postgres error raised by `accept_invitation` into a domain
 * error. The RPC uses distinct `raise exception` tokens so the caller can
 * surface meaningful messages without parsing the raw text.
 */
function translateAcceptError(message: string | undefined): Error {
  switch (message) {
    case "invitation_not_found":
      return new Error("Invitation not found")
    case "invitation_not_pending":
      return new Error("Invitation has already been processed")
    case "invitation_expired":
      return new Error("Invitation has expired")
    case "invitation_email_mismatch":
      return new Error("This invitation belongs to a different email address")
    case "email_missing":
    case "not_authenticated":
      return new Error("Not authenticated")
    default:
      return new Error(message ?? "Failed to accept invitation")
  }
}

export class DrizzleInvitationRepository implements IInvitationRepository {
  async create(
    ctx: SessionContext,
    data: {
      organizationId: string
      email: string
      role: InvitableRole
      token: string
      invitedByUserId: string
      expiresAt: Date
    },
  ): Promise<Invitation> {
    const rows = await withRLS(ctx, (tx) =>
      tx
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
        .returning(),
    )
    const [row] = rows
    return mapInvitationRowToEntity(row)
  }

  /**
   * List pending invitations for the caller's active org. Enforced by the
   * `invitation_select_admin_or_invitee` policy — the admin branch
   * (`is_org_admin(organization_id)`) authorises owner/admin reads; the
   * invitee branch is irrelevant here because the caller is always admin
   * (the use case guards on `ctx.role`).
   */
  async findPendingByOrgId(ctx: SessionContext): Promise<PendingInvitation[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, ctx.orgId),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .orderBy(invitation.createdAt),
    )

    return rows
      .filter((r) => INVITABLE_ROLES.includes(r.role))
      .map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role as InvitableRole,
        expiresAt: r.expiresAt.toISOString(),
      }))
  }

  async hasPendingForEmail(ctx: SessionContext, email: string): Promise<boolean> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({ id: invitation.id })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, ctx.orgId),
            eq(invitation.email, email.toLowerCase()),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .limit(1),
    )
    return rows.length > 0
  }

  /**
   * Soft-cancel a pending invitation. No DELETE policy exists on the
   * `invitation` table (by design — no hard deletes in this project), so
   * cancellation is implemented as `status = 'cancelled'`. The filter on
   * `status = 'pending'` prevents double-cancel and racing an already-
   * accepted invitation. Authorised by the admin branch of
   * `invitation_update_admin_or_invitee`.
   */
  async markCancelled(ctx: SessionContext, invitationId: string): Promise<void> {
    const result = await withRLS(ctx, (tx) =>
      tx
        .update(invitation)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(invitation.id, invitationId),
            eq(invitation.organizationId, ctx.orgId),
            eq(invitation.status, "pending"),
          ),
        )
        .returning({ id: invitation.id }),
    )

    if (result.length === 0) {
      throw new Error("Invitation not found or cannot be cancelled")
    }
  }

  /**
   * Seat-limit probe for the send-invitation use case. Runs the three
   * counts inside a single RLS-scoped transaction so the snapshot is
   * consistent (no partial state between the member count and the
   * pending-invite count).
   */
  async getOrgSeatInfo(ctx: SessionContext): Promise<{ maxSeats: number; currentMembers: number }> {
    return withRLS(ctx, async (tx) => {
      const [org] = await tx
        .select({ maxSeats: organization.maxSeats })
        .from(organization)
        .where(eq(organization.id, ctx.orgId))
        .limit(1)

      const [memberCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(member)
        .where(and(eq(member.organizationId, ctx.orgId), isNull(member.deletedAt)))

      const [pendingCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, ctx.orgId),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )

      return {
        maxSeats: org?.maxSeats ?? 1,
        currentMembers: (memberCount?.count ?? 0) + (pendingCount?.count ?? 0),
      }
    })
  }

  async accept(token: string): Promise<{ organizationId: string }> {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.rpc("accept_invitation", { p_token: token })

    if (error) throw translateAcceptError(error.message)
    if (typeof data !== "string") {
      throw new Error("accept_invitation RPC returned an unexpected payload")
    }
    return { organizationId: data }
  }
}
