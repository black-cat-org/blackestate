import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

/**
 * Invitee rejects an invitation addressed to their email.
 *
 * Thin orchestrator: authorisation lives in the RLS policy
 * (`invitation_update_admin_or_invitee` — invitee branch matches the
 * caller's `auth.email()`) so the use case does not repeat ownership
 * checks in application code. Keeping the discipline "authorisation is
 * a DB invariant, not an app afterthought" consistent across the flow.
 */
export async function rejectInvitationUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
  token: string,
): Promise<void> {
  await repo.markRejected(ctx, token)
}
