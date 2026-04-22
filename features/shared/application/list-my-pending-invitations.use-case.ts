import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IncomingInvitation } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

/**
 * Return the pending invitations addressed to the caller (invitee side).
 *
 * Matching is done DB-side via the invitee branch of
 * `invitation_select_admin_or_invitee` (`lower(email) = lower(auth.email())`).
 * The use case short-circuits to an empty list when the caller has no
 * email claim — this is a safety net for future auth providers (phone /
 * anonymous) that would bypass the email check entirely.
 */
export async function listMyPendingInvitationsUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
): Promise<IncomingInvitation[]> {
  if (!ctx.email) return []
  return repo.findMyPending(ctx)
}
