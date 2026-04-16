import type { Invitation, InvitableRole } from "@/features/shared/domain/invitation.entity"
import type { InvitationRow } from "./invitation.model"

export function mapInvitationRowToEntity(row: InvitationRow): Invitation {
  return {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    role: row.role as InvitableRole,
    status: row.status,
    token: row.token,
    invitedByUserId: row.invitedByUserId ?? undefined,
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}
