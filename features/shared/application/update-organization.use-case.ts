import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Organization, UpdateOrganizationDTO } from "@/features/shared/domain/organization.entity"
import type { IOrganizationRepository } from "@/features/shared/domain/organization.repository"

export async function updateOrganizationUseCase(
  ctx: SessionContext,
  repo: IOrganizationRepository,
  orgId: string,
  patch: UpdateOrganizationDTO,
): Promise<Organization> {
  if (ctx.orgId !== orgId) {
    throw new Error("Can only update the active organization")
  }

  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new Error("Only owner or admin can update the organization")
  }

  return repo.update(ctx, orgId, patch)
}
