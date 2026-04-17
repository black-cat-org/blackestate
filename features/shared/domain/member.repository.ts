import type { SessionContext } from "./session-context"
import type { TeamMember, TeamSeatInfo } from "./member.entity"

export interface IMemberRepository {
  findAllByOrg(ctx: SessionContext): Promise<TeamMember[]>
  findById(ctx: SessionContext, memberId: string): Promise<TeamMember | undefined>
  updateRole(ctx: SessionContext, memberId: string, newRole: "admin" | "agent"): Promise<void>
  softDelete(ctx: SessionContext, memberId: string): Promise<void>
  getSeatInfo(ctx: SessionContext): Promise<TeamSeatInfo>
  countOwners(ctx: SessionContext): Promise<number>
}
