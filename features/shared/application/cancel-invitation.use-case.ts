import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

export async function cancelInvitationUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
  invitationId: string,
): Promise<void> {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new Error("Only owner or admin can cancel invitations")
  }

  await repo.markCancelled(ctx, invitationId)
}
