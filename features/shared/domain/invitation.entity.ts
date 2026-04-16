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

export interface SendInvitationDTO {
  email: string
  role: InvitableRole
}
