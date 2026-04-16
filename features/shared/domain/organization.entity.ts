export type OrganizationPlan = "free" | "pro" | "enterprise"

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: OrganizationPlan
  maxSeats: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OrganizationMembership {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: OrganizationPlan
  role: "owner" | "admin" | "agent"
}

export interface CreateOrganizationDTO {
  name: string
  slug: string
}

export interface UpdateOrganizationDTO {
  name?: string
  logoUrl?: string | null
}
