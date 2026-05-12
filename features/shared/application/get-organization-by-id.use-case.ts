import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Organization } from "@/features/shared/domain/organization.entity"
import type { IOrganizationRepository } from "@/features/shared/domain/organization.repository"

/**
 * Resolves an organization the caller belongs to. RLS on `organization`
 * already restricts visibility to orgs the user is a member of, so the
 * repository call returns `undefined` when the id is invalid OR when the
 * caller is not a member — no separate authorisation check is needed at
 * this layer.
 *
 * The use case exists so presentation never has to instantiate
 * `DrizzleOrganizationRepository` directly (Presentation → Infrastructure
 * is forbidden per CLAUDE.md).
 */
export async function getOrganizationByIdUseCase(
  ctx: SessionContext,
  repo: IOrganizationRepository,
  orgId: string,
): Promise<Organization | undefined> {
  return repo.findById(ctx, orgId)
}
