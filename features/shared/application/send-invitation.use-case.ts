import { InvitationDomainError } from "@/lib/errors/invitation-errors"
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
    throw new InvitationDomainError("caller_role_insufficient")
  }

  if (ctx.role === "admin" && data.role === "admin") {
    throw new InvitationDomainError("admin_cannot_invite_admin")
  }

  if (callerEmail.toLowerCase() === data.email.toLowerCase()) {
    throw new InvitationDomainError("self_invite")
  }

  // Invitations are for users who already exist in Black Estate. Onboarding
  // brand-new people happens via sign-up (and eventually the referral link
  // flow). Rejecting unknown emails upfront avoids creating "zombie"
  // invitation rows that can never be accepted.
  const exists = await repo.userExists(data.email)
  if (!exists) {
    throw new InvitationDomainError("email_not_registered")
  }

  const hasPending = await repo.hasPendingForEmail(ctx, data.email)
  if (hasPending) {
    throw new InvitationDomainError("pending_already_exists")
  }

  const { maxSeats, currentMembers } = await repo.getOrgSeatInfo(ctx)
  if (currentMembers >= maxSeats) {
    throw new InvitationDomainError("seat_limit_reached")
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const inv = await repo.create(ctx, {
    organizationId: ctx.orgId,
    email: data.email,
    role: data.role,
    token,
    invitedByUserId: ctx.userId,
    expiresAt,
  })

  return { invitation: inv, token }
}
