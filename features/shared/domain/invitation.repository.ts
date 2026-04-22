import type { Invitation, PendingInvitation, InvitableRole } from "./invitation.entity"
import type { SessionContext } from "./session-context"

export interface IInvitationRepository {
  /**
   * Check whether an `auth.users` row exists for the given email. Used by
   * the send-invitation flow to reject invitations aimed at people who
   * have not yet signed up — invitations are strictly for existing users.
   * Implemented as a SECURITY DEFINER RPC (`check_user_exists_by_email`)
   * because `auth.users` is not readable by the `authenticated` role.
   */
  userExists(email: string): Promise<boolean>
  create(
    ctx: SessionContext,
    data: {
      organizationId: string
      email: string
      role: InvitableRole
      token: string
      invitedByUserId: string
      expiresAt: Date
    },
  ): Promise<Invitation>
  findPendingByOrgId(ctx: SessionContext): Promise<PendingInvitation[]>
  hasPendingForEmail(ctx: SessionContext, email: string): Promise<boolean>
  markCancelled(ctx: SessionContext, invitationId: string): Promise<void>
  getOrgSeatInfo(ctx: SessionContext): Promise<{ maxSeats: number; currentMembers: number }>
  /**
   * Accept an invitation atomically via the `accept_invitation` SECURITY
   * DEFINER RPC. The RPC validates token, email match, and expiry, then
   * creates the member row, flips the active org, and marks the invitation
   * accepted in a single transaction — bypassing RLS because the caller is
   * not yet a member of the target org.
   *
   * Called directly by the presentation layer (no ctx needed): the RPC
   * reads `auth.uid()` and `auth.jwt() ->> 'email'` from the caller's JWT,
   * so the invitee's session already carries everything the function needs.
   */
  accept(token: string): Promise<{ organizationId: string }>
}
