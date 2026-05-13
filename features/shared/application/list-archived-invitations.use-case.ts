import type { SessionContext } from "@/features/shared/domain/session-context"
import type { ArchivedInvitation } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

/**
 * List archived invitations (rejected + expired) for the caller's active
 * org. Powers the "Invitaciones rechazadas y expiradas" panel in
 * `/dashboard/settings` → Equipo.
 *
 * Agents are not allowed to see this list — invitation management is an
 * owner/admin concern. Returning an empty array (instead of throwing)
 * mirrors `listInvitationsUseCase`: the UI hides the section when the
 * role lacks access, no error surfaces.
 */
export async function listArchivedInvitationsUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
): Promise<ArchivedInvitation[]> {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return []
  }

  return repo.findArchivedByOrgId(ctx)
}
