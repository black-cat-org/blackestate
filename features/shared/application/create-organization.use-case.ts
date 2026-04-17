import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Organization, CreateOrganizationDTO } from "@/features/shared/domain/organization.entity"
import type { IOrganizationRepository } from "@/features/shared/domain/organization.repository"

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

export async function createOrganizationUseCase(
  ctx: SessionContext,
  repo: IOrganizationRepository,
  data: CreateOrganizationDTO,
  ownerInfo: { email: string; name?: string; avatarUrl?: string },
): Promise<Organization> {
  if (!data.name.trim()) {
    throw new Error("Organization name is required")
  }

  if (!SLUG_PATTERN.test(data.slug)) {
    throw new Error(
      "Slug must be 3-50 characters, lowercase alphanumeric or hyphens, " +
        "cannot start or end with a hyphen",
    )
  }

  const taken = await repo.isSlugTaken(data.slug)
  if (taken) {
    throw new Error("Slug is already taken")
  }

  return repo.create(ctx.userId, data, ownerInfo)
}
