import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Invitation, SendInvitationDTO } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

const INVITE_EXPIRY_DAYS = 7

export async function sendInvitationUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
  data: SendInvitationDTO,
  callerEmail: string,
): Promise<{ invitation: Invitation; token: string }> {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new Error("Only owner or admin can send invitations")
  }

  if (ctx.role === "admin" && data.role === "admin") {
    throw new Error("Only the owner can invite administrators")
  }

  if (callerEmail.toLowerCase() === data.email.toLowerCase()) {
    throw new Error("Cannot invite yourself")
  }

  const hasPending = await repo.hasPendingForEmail(ctx.orgId, data.email)
  if (hasPending) {
    throw new Error("A pending invitation already exists for this email")
  }

  const { maxSeats, currentMembers } = await repo.getOrgSeatInfo(ctx.orgId)
  if (currentMembers >= maxSeats) {
    throw new Error(
      `Organization seat limit reached (${maxSeats}). Upgrade the plan to invite more members.`,
    )
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const inv = await repo.create({
    organizationId: ctx.orgId,
    email: data.email,
    role: data.role,
    token,
    invitedByUserId: ctx.userId,
    expiresAt,
  })

  return { invitation: inv, token }
}
