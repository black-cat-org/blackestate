import type { SessionContext } from "./session-context"
import type { TeamMember, TeamSeatInfo } from "./member.entity"

export interface IMemberRepository {
  findAllByOrg(ctx: SessionContext): Promise<TeamMember[]>
  findById(ctx: SessionContext, memberId: string): Promise<TeamMember | undefined>
  updateRole(ctx: SessionContext, memberId: string, newRole: "admin" | "agent"): Promise<void>
  /**
   * Soft-delete a member and reset that user's `user_active_org` if it
   * was pointing at the org being removed. Implemented as a single
   * SECURITY DEFINER RPC (drizzle/sql/021) so the cross-row write to
   * `user_active_org` (which RLS blocks for the caller) and the soft-
   * delete commit atomically.
   *
   * @returns the affected user's id and the org they were flipped to,
   *   or `null` if no remaining membership and the row was deleted.
   */
  softDeleteWithActiveOrgReset(
    ctx: SessionContext,
    memberId: string,
  ): Promise<{ targetUserId: string; newActiveOrgId: string | null }>
  getSeatInfo(ctx: SessionContext): Promise<TeamSeatInfo>
  countOwners(ctx: SessionContext): Promise<number>
}
