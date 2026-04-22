import type { SessionContext } from "@/features/shared/domain/session-context"
import type { PendingInvitation } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

export async function listInvitationsUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
): Promise<PendingInvitation[]> {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return []
  }

  return repo.findPendingByOrgId(ctx)
}
