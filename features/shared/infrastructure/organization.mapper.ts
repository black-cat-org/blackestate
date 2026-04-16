import type { Organization } from "@/features/shared/domain/organization.entity"
import type { OrganizationRow } from "./organization.model"

export function mapOrgRowToEntity(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl ?? undefined,
    plan: row.plan,
    maxSeats: row.maxSeats,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
