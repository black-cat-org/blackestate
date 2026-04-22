import type { SessionContext } from "./session-context"
import type {
  Organization,
  OrganizationMembership,
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
} from "./organization.entity"

export interface IOrganizationRepository {
  findById(ctx: SessionContext, id: string): Promise<Organization | undefined>
  findAllForUser(ctx: SessionContext): Promise<OrganizationMembership[]>
  create(
    ctx: SessionContext,
    data: CreateOrganizationDTO,
    ownerInfo: { email: string; name?: string; avatarUrl?: string },
  ): Promise<Organization>
  update(ctx: SessionContext, id: string, patch: UpdateOrganizationDTO): Promise<Organization>
  setActiveForUser(ctx: SessionContext, orgId: string): Promise<void>
  isMember(ctx: SessionContext, orgId: string): Promise<boolean>
}
