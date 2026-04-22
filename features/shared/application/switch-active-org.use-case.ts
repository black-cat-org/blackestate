import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IOrganizationRepository } from "@/features/shared/domain/organization.repository"

export async function switchActiveOrgUseCase(
  ctx: SessionContext,
  repo: IOrganizationRepository,
  newOrgId: string,
): Promise<void> {
  if (newOrgId === ctx.orgId) return

  const belongsToOrg = await repo.isMember(ctx, newOrgId)
  if (!belongsToOrg) {
    throw new Error("User is not a member of this organization")
  }

  await repo.setActiveForUser(ctx, newOrgId)
}
