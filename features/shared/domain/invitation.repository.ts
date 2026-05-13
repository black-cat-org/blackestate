import type {
  ArchivedInvitation,
  Invitation,
  InvitationStatus,
  PendingInvitation,
  IncomingInvitation,
  InvitableRole,
} from "./invitation.entity"
import type { SessionContext } from "./session-context"

/**
 * Narrow projection of an invitation row scoped to fields the
 * Presentation layer is allowed to consume. Notably omits `token`:
 * the token is the secret that authorises invitation acceptance, and
 * surfacing it to a Server Action that does not need to forward it
 * is unnecessary exposure.
 *
 * Includes `expiresAt` so the resend flow can detect derived expiry
 * (status='pending' + expiresAt<now()) against the raw DB state — UI
 * DTOs derive "expired" from this same combination, but authorisation
 * decisions must read the persisted truth, not the UI projection.
 */
export interface InvitationSummary {
  id: string
  email: string
  role: InvitableRole
  status: InvitationStatus
  expiresAt: string
}

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
  /**
   * List archived invitations for the caller's active org: rows that the
   * invitee rejected, plus rows that timed out (`pending` with
   * `expiresAt < now()`). `cancelled` rows are intentionally excluded —
   * those were retracted by an admin and need no further visibility.
   *
   * The "expired" status is *derived* in the repository: there is no
   * background job that flips `pending` → `expired` in the DB. The mapper
   * sets `status='expired'` for rows where `expiresAt < now()` AND the
   * stored status is still `pending`. Persisted `expired` rows (if any
   * future migration adds a cron) are mapped through the same path.
   *
   * Authorised by `invitation_select_admin_or_invitee` (admin branch) —
   * the use case additionally guards on `ctx.role` so agents can't reach
   * this query.
   */
  findArchivedByOrgId(ctx: SessionContext): Promise<ArchivedInvitation[]>
  /**
   * Fetch a narrow projection (id, email, role, status) of an
   * invitation scoped to the caller's org. Returns the
   * `InvitationSummary` DTO instead of the full `Invitation` entity
   * so the secret `token` field never reaches the Server Action.
   */
  findByIdForOrg(
    ctx: SessionContext,
    invitationId: string,
  ): Promise<InvitationSummary | undefined>
  /**
   * Look up a single pending invitation by its token, joined with the
   * inviting org. Returns `undefined` when the token does not exist,
   * does not match the caller's email, is no longer pending, or has
   * expired. Powers the `/accept-invite?inv=<token>` confirmation page.
   */
  findByToken(ctx: SessionContext, token: string): Promise<IncomingInvitation | undefined>
  hasPendingForEmail(ctx: SessionContext, email: string): Promise<boolean>
  /**
   * List invitations the caller has pending inbox-side (email matches the
   * caller's JWT email claim). Joined with the inviting org to expose
   * name/slug/logo in a single round trip. Authorised by the
   * `invitation_select_admin_or_invitee` policy (invitee branch) and the
   * `organization_select_via_pending_invitation` policy added in 010.
   */
  findMyPending(ctx: SessionContext): Promise<IncomingInvitation[]>
  markCancelled(ctx: SessionContext, invitationId: string): Promise<void>
  /**
   * Invitee-initiated rejection. Uses `token` rather than id so the call
   * lines up with the accept flow and so an invitee cannot probe other
   * users' invitation ids. Authorised by the
   * `invitation_update_admin_or_invitee` policy.
   */
  markRejected(ctx: SessionContext, token: string): Promise<void>
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
