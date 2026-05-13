import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IMemberRepository } from "@/features/shared/domain/member.repository"

export interface MemberRemovalResult {
  /** auth.users.id of the member that was removed. */
  targetUserId: string
  /**
   * Org the removed user was flipped to (or `null` if they had no
   * remaining memberships and `user_active_org` was cleared). The
   * action layer does not need to forward this to the client — the
   * Realtime payload only tells the client to redirect — but it is
   * exposed so the action can log / audit the resulting state.
   */
  newActiveOrgId: string | null
}

export async function removeMemberUseCase(
  ctx: SessionContext,
  repo: IMemberRepository,
  memberId: string,
): Promise<MemberRemovalResult> {
  // Domain error tokens: stable, English, never user-facing. The Server
  // Action layer maps them to localised copy via `REMOVE_ERROR_COPY`.
  if (ctx.role === "agent") {
    throw new Error("not_authorised")
  }

  const target = await repo.findById(ctx, memberId)
  if (!target) throw new Error("member_not_found")

  if (target.userId === ctx.userId) {
    throw new Error("cannot_remove_self")
  }

  if (target.role === "owner") {
    throw new Error("cannot_remove_owner")
  }

  if (ctx.role === "admin" && target.role === "admin") {
    throw new Error("admin_cannot_remove_admin")
  }

  // Soft-delete + active-org reset run atomically inside the RPC. The
  // RPC also re-checks authorisation server-side (is_org_admin),
  // shadowing the JS checks above — the JS layer provides friendlier
  // error messages and earlier short-circuit, but the DB has the final
  // say.
  const { targetUserId, newActiveOrgId } = await repo.softDeleteWithActiveOrgReset(
    ctx,
    memberId,
  )

  return { targetUserId, newActiveOrgId }
}
