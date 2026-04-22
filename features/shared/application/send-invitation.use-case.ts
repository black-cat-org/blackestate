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

  // Invitations are for users who already exist in Black Estate. Onboarding
  // brand-new people happens via sign-up (and eventually the referral link
  // flow). Rejecting unknown emails upfront avoids creating "zombie"
  // invitation rows that can never be accepted.
  const exists = await repo.userExists(data.email)
  if (!exists) {
    // Matches the other English-sentence error messages thrown from this
    // use case (e.g. "Cannot invite yourself"). The presentation layer
    // surfaces these directly; when a translation dictionary lands, this
    // string moves there alongside the others.
    throw new Error("Invited email is not registered in Black Estate")
  }

  const hasPending = await repo.hasPendingForEmail(ctx, data.email)
  if (hasPending) {
    throw new Error("A pending invitation already exists for this email")
  }

  const { maxSeats, currentMembers } = await repo.getOrgSeatInfo(ctx)
  if (currentMembers >= maxSeats) {
    throw new Error(
      `Organization seat limit reached (${maxSeats}). Upgrade the plan to invite more members.`,
    )
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
