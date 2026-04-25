import { InvitationDomainError } from "@/lib/errors/invitation-errors"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

export async function cancelInvitationUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
  invitationId: string,
): Promise<void> {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new InvitationDomainError("caller_role_insufficient")
  }

  await repo.markCancelled(ctx, invitationId)
}
