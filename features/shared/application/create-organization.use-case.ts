import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Organization, CreateOrganizationDTO } from "@/features/shared/domain/organization.entity"
import type { IOrganizationRepository } from "@/features/shared/domain/organization.repository"

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

/**
 * Orchestrate organization creation.
 *
 * Applies pre-validation for friendly error messages, then delegates to the
 * repository which calls the `bootstrap_organization` RPC. The RPC enforces
 * the same rules atomically (name_required / invalid_slug / slug_taken) so
 * the validation here is defence-in-depth for UX — a race that slips past
 * this check still fails cleanly at the database.
 */
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

  return repo.create(ctx, data, ownerInfo)
}
