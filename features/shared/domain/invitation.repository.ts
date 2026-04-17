import type { Invitation, PendingInvitation, InvitableRole } from "./invitation.entity"

export interface IInvitationRepository {
  findByToken(token: string): Promise<Invitation | undefined>
  findPendingByOrgId(orgId: string): Promise<PendingInvitation[]>
  hasPendingForEmail(orgId: string, email: string): Promise<boolean>
  create(data: {
    organizationId: string
    email: string
    role: InvitableRole
    token: string
    invitedByUserId: string
    expiresAt: Date
  }): Promise<Invitation>
  markAccepted(id: string): Promise<void>
  markExpired(id: string): Promise<void>
  markCancelled(orgId: string, invitationId: string): Promise<void>
  deleteByToken(token: string): Promise<void>
  getOrgSeatInfo(orgId: string): Promise<{ maxSeats: number; currentMembers: number }>
  isMemberOfOrg(userId: string, orgId: string): Promise<boolean>
  acceptAndCreateMember(data: {
    invitationId: string
    userId: string
    organizationId: string
    role: InvitableRole
    email: string
    name?: string
    avatarUrl?: string
  }): Promise<void>
}
