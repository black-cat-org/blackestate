import type { SessionContext } from "@/features/shared/domain/session-context"
import type { IMemberRepository } from "@/features/shared/domain/member.repository"

export async function removeMemberUseCase(
  ctx: SessionContext,
  repo: IMemberRepository,
  memberId: string,
): Promise<void> {
  if (ctx.role === "agent") {
    throw new Error("No tienes permisos para remover miembros")
  }

  const target = await repo.findById(ctx, memberId)
  if (!target) throw new Error("Miembro no encontrado")

  if (target.userId === ctx.userId) {
    throw new Error("No puedes removerte a ti mismo")
  }

  if (target.role === "owner") {
    throw new Error("No puedes remover al propietario")
  }

  if (ctx.role === "admin" && target.role === "admin") {
    throw new Error("Un administrador no puede remover a otro administrador")
  }

  await repo.softDelete(ctx, memberId)
}
