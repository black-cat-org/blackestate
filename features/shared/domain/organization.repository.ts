import type { SessionContext } from "./session-context"
import type {
  Organization,
  OrganizationMembership,
  UpdateOrganizationDTO,
} from "./organization.entity"

export interface IOrganizationRepository {
  findById(ctx: SessionContext, id: string): Promise<Organization | undefined>
  findAllForUser(ctx: SessionContext): Promise<OrganizationMembership[]>
  update(ctx: SessionContext, id: string, patch: UpdateOrganizationDTO): Promise<Organization>
  setActiveForUser(ctx: SessionContext, orgId: string): Promise<void>
  isMember(ctx: SessionContext, orgId: string): Promise<boolean>
}
