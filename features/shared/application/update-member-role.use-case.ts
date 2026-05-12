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
  if (ctx.role !== "owner") {
    throw new Error("Solo el propietario puede cambiar roles")
  }

  const target = await repo.findById(ctx, memberId)
  if (!target) throw new Error("Miembro no encontrado")

  if (target.userId === ctx.userId) {
    throw new Error("No puedes cambiar tu propio rol")
  }

  if (target.role === "owner") {
    throw new Error("No puedes cambiar el rol del propietario")
  }

  await repo.updateRole(ctx, memberId, newRole)

  return { targetUserId: target.userId, newRole }
}
