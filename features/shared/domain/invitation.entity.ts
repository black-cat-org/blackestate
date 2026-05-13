export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired" | "cancelled"
export type InvitableRole = "admin" | "agent"

export interface Invitation {
  id: string
  organizationId: string
  email: string
  role: InvitableRole
  status: InvitationStatus
  token: string
  invitedByUserId?: string
  expiresAt: string
  acceptedAt?: string
  createdAt: string
}

export interface PendingInvitation {
  id: string
  email: string
  role: InvitableRole
  expiresAt: string
}

/**
 * Invitation the caller has received but not yet accepted. Includes the
 * inviting org's public metadata so the invitee UI can render a meaningful
 * "Aceptar / Rechazar" prompt without a follow-up lookup. The RLS policy
 * `organization_select_via_pending_invitation` authorises this join for
 * invitees whose email matches a pending, non-expired invitation.
 */
export interface IncomingInvitation {
  id: string
  token: string
  role: InvitableRole
  expiresAt: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  organizationLogoUrl?: string
}

export interface SendInvitationDTO {
  email: string
  role: InvitableRole
}

/**
 * Invitation that didn't reach acceptance: either the invitee declined
 * ("rejected") or the row's `expiresAt` passed while still in `pending`
 * status ("expired"). The status field is *derived* by the repository —
 * there is no background job that flips a `pending` row to `expired` in
 * the DB, so callers should not assume `expired` is persisted. Persisted
 * `cancelled` rows (admin-retracted) are intentionally excluded from this
 * list: they were never "rejected by the invitee" and the admin already
 * acknowledged them at cancellation time.
 *
 * Powers the "Invitaciones rechazadas y expiradas" panel in
 * `/dashboard/settings` → Equipo. Owner/admin only.
 */
export interface ArchivedInvitation {
  id: string
  email: string
  role: InvitableRole
  status: "rejected" | "expired"
  expiresAt: string
  createdAt: string
}
