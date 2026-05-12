import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IMemberRepository } from "@/features/shared/domain/member.repository"

export interface MemberRoleChangeResult {
  /** auth.users.id of the member whose role was changed. */
  targetUserId: string
  /** Role assigned (echoed for downstream notification payloads). */
  newRole: "admin" | "agent"
}

export async function updateMemberRoleUseCase(
  ctx: SessionContext,
  repo: IMemberRepository,
  memberId: string,
  newRole: "admin" | "agent",
): Promise<MemberRoleChangeResult> {
  // Domain error tokens: stable, English, never user-facing. The Server
  // Action layer maps them to localised copy via `ROLE_CHANGE_ERROR_COPY`.
  if (ctx.role !== "owner") {
    throw new Error("only_owner_can_change_roles")
  }

  const target = await repo.findById(ctx, memberId)
  if (!target) throw new Error("member_not_found")

  if (target.userId === ctx.userId) {
    throw new Error("cannot_change_own_role")
  }

  if (target.role === "owner") {
    throw new Error("cannot_change_owner_role")
  }

  await repo.updateRole(ctx, memberId, newRole)

  return { targetUserId: target.userId, newRole }
}
