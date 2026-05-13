import type { SessionContext } from "@/features/shared/domain/session-context"
import type { InvitableRole } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

export interface ResendInvitationTarget {
  oldInvitationId: string
  email: string
  role: InvitableRole
}

/**
 * Validate that a rejected invitation can be resent, returning the
 * data the action layer needs to dispatch a fresh invitation. This
 * use case is **read-only**: it does NOT cancel the old row.
 *
 * Order matters for the resend flow's failure mode: the action first
 * creates the new invitation via `sendInvitationUseCase`, then (only
 * on success) cancels the old rejected row. If we cancelled here, a
 * subsequent failure in `sendInvitationUseCase` (seat limit hit, user
 * deleted between read and create, etc.) would leave the admin with
 * the rejected row permanently gone and no replacement — the resend
 * would silently destroy the original invitation. Keeping the cancel
 * in the action's success path preserves the rejected row when the
 * new send fails.
 *
 * Only the org's owner / admin may resend (same authorisation
 * envelope as send-invitation). Only `rejected` invitations are
 * resendable — `pending` rows are still actionable by the invitee
 * and should not be silently replaced; `accepted` rows mean the user
 * is already a member; `cancelled` / `expired` rows are archived and
 * the admin should issue a brand-new invitation rather than "resend".
 */
export async function resendInvitationUseCase(
  ctx: SessionContext,
  repo: IInvitationRepository,
  invitationId: string,
): Promise<ResendInvitationTarget> {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new Error("only_owner_or_admin_can_resend")
  }

  const invitation = await repo.findByIdForOrg(ctx, invitationId)
  if (!invitation) {
    throw new Error("invitation_not_found")
  }
  if (invitation.status !== "rejected") {
    throw new Error("invitation_not_rejected")
  }

  return { oldInvitationId: invitationId, email: invitation.email, role: invitation.role }
}
