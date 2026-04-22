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
