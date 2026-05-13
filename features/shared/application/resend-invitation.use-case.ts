import type { SessionContext } from "@/features/shared/domain/session-context"
import type { InvitableRole } from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

export interface ResendInvitationTarget {
  oldInvitationId: string
  email: string
  role: InvitableRole
}

/**
 * Validate that an archived invitation (rejected, expired, or pending
 * past its expiry) can be re-issued, returning the data the action
 * layer needs to dispatch a fresh invitation. This use case is
 * **read-only**: it does NOT cancel the old row.
 *
 * Order matters for the resend flow's failure mode: the action first
 * creates the new invitation via `sendInvitationUseCase`, then (only
 * on success) cancels the old row. If we cancelled here, a subsequent
 * failure in `sendInvitationUseCase` (seat limit hit, user deleted
 * between read and create, etc.) would leave the admin with the
 * archived row permanently gone and no replacement. Keeping the
 * cancel in the action's success path preserves the original row when
 * the new send fails.
 *
 * Resendable statuses (the same archival surface the admin sees in
 * the "Invitaciones rechazadas y expiradas" panel):
 *   - `rejected`: invitee actively declined; admin can try again.
 *   - `expired`: stored expiry status (future cron migration).
 *   - `pending` AND past expiry: same UX outcome as `expired`, just
 *     not yet flipped by a cron. Authorisation reads the raw DB
 *     state, not the UI's derived "expired" status.
 *
 * Non-resendable statuses:
 *   - `pending` (still in date): the invitee can still accept;
 *     replacing it silently would break their flow.
 *   - `accepted`: the user is already a member; resend has no meaning.
 *   - `cancelled`: tombstone of an earlier retraction. To re-invite,
 *     the admin should use the regular Invitar form.
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

  const isArchivable =
    invitation.status === "rejected" ||
    invitation.status === "expired" ||
    (invitation.status === "pending" &&
      new Date(invitation.expiresAt) < new Date())

  if (!isArchivable) {
    throw new Error("invitation_not_archivable")
  }

  return { oldInvitationId: invitationId, email: invitation.email, role: invitation.role }
}
