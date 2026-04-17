import type { SessionContext } from "./session-context"
import type {
  Organization,
  OrganizationMembership,
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
} from "./organization.entity"

export interface IOrganizationRepository {
  findById(ctx: SessionContext, id: string): Promise<Organization | undefined>
  findAllForUser(userId: string): Promise<OrganizationMembership[]>
  create(userId: string, data: CreateOrganizationDTO, ownerInfo: { email: string; name?: string; avatarUrl?: string }): Promise<Organization>
  update(ctx: SessionContext, id: string, patch: UpdateOrganizationDTO): Promise<Organization>
  setActiveForUser(userId: string, orgId: string): Promise<void>
  isSlugTaken(slug: string): Promise<boolean>
  isMember(userId: string, orgId: string): Promise<boolean>
}
