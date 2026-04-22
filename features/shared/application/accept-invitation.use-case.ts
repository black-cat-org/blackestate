import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

/**
 * Accept an invitation. Thin orchestrator around the `accept_invitation`
 * SECURITY DEFINER RPC: all validation (token existence, status, expiry,
 * email match) and mutations (member row, active-org flip, invitation
 * status) happen atomically inside the function, so the use case only
 * needs to delegate and surface the translated error.
 *
 * Takes no `SessionContext` because the RPC reads `auth.uid()` and the
 * email claim directly from the caller's JWT — and the accepting user may
 * not yet have an `active_org_id`, which is exactly what `getSessionContext`
 * would require.
 */
export async function acceptInvitationUseCase(
  repo: IInvitationRepository,
  token: string,
): Promise<{ organizationId: string }> {
  return repo.accept(token)
}
