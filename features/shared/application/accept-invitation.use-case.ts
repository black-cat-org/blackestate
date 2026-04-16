import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

export async function acceptInvitationUseCase(
  caller: { userId: string },
  repo: IInvitationRepository,
  token: string,
  userEmail: string,
): Promise<{ organizationId: string }> {
  const inv = await repo.findByToken(token)

  if (!inv) {
    throw new Error("Invitation not found")
  }

  if (inv.status !== "pending") {
    throw new Error("Invitation has already been processed")
  }

  if (new Date(inv.expiresAt) < new Date()) {
    await repo.markExpired(inv.id)
    throw new Error("Invitation has expired")
  }

  if (inv.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("This invitation belongs to a different email address")
  }

  const alreadyMember = await repo.isMemberOfOrg(caller.userId, inv.organizationId)
  if (alreadyMember) {
    await repo.markAccepted(inv.id)
    return { organizationId: inv.organizationId }
  }

  await repo.acceptAndCreateMember({
    invitationId: inv.id,
    userId: caller.userId,
    organizationId: inv.organizationId,
    role: inv.role,
  })

  return { organizationId: inv.organizationId }
}
