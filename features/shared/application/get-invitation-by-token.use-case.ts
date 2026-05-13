import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IncomingInvitation } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

/**
 * Resolve a pending invitation by its single-use token so the
 * `/accept-invite?inv=<token>` confirmation page can render the
 * inviting org's name, role, and expiry before the user decides.
 *
 * The repository call enforces the four predicates the accept RPC
 * also enforces (email match, status pending, not expired, token
 * match), so a missing result here is the deterministic UI signal
 * that the accept attempt would also fail.
 *
 * Returns `undefined` (not `null`) to stay aligned with CLAUDE.md's
 * "App speaks undefined; DB speaks null" convention. The Server
 * Action layer narrows to `null` at its outer boundary if the caller
 * prefers, but the domain contract stays uniform.
 */
export async function getInvitationByTokenUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
  token: string,
): Promise<IncomingInvitation | undefined> {
  return repo.findByToken(ctx, token)
}
