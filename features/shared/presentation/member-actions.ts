"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { DrizzleMemberRepository } from "@/features/shared/infrastructure/drizzle-member.repository"
import { listMembersUseCase, getSeatInfoUseCase } from "@/features/shared/application/list-members.use-case"
import { updateMemberRoleUseCase } from "@/features/shared/application/update-member-role.use-case"
import { removeMemberUseCase } from "@/features/shared/application/remove-member.use-case"
import type { TeamMember, TeamSeatInfo } from "@/features/shared/domain/member.entity"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUUID(value: string, label: string): void {
  if (!UUID_REGEX.test(value)) throw new Error(`${label} inválido`)
}

function createRepo() {
  return new DrizzleMemberRepository()
}

export async function listMembersAction(): Promise<TeamMember[]> {
  const ctx = await getSessionContext()
  return listMembersUseCase(ctx, createRepo())
}

export async function getSeatInfoAction(): Promise<TeamSeatInfo> {
  const ctx = await getSessionContext()
  return getSeatInfoUseCase(ctx, createRepo())
}

export async function updateMemberRoleAction(
  memberId: string,
  newRole: "admin" | "agent",
): Promise<{ error?: string }> {
  try {
    assertUUID(memberId, "ID de miembro")
    const ctx = await getSessionContext()
    await updateMemberRoleUseCase(ctx, createRepo(), memberId, newRole)
    revalidatePath("/dashboard/settings")
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al cambiar el rol" }
  }
}

export async function removeMemberAction(
  memberId: string,
): Promise<{ error?: string }> {
  try {
    assertUUID(memberId, "ID de miembro")
    const ctx = await getSessionContext()
    await removeMemberUseCase(ctx, createRepo(), memberId)
    revalidatePath("/dashboard/settings")
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al remover el miembro" }
  }
}
