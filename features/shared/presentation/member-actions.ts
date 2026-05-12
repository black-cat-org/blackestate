"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { DrizzleMemberRepository } from "@/features/shared/infrastructure/drizzle-member.repository"
import { DrizzleOrganizationRepository } from "@/features/shared/infrastructure/drizzle-organization.repository"
import { listMembersUseCase, getSeatInfoUseCase } from "@/features/shared/application/list-members.use-case"
import { updateMemberRoleUseCase } from "@/features/shared/application/update-member-role.use-case"
import { removeMemberUseCase } from "@/features/shared/application/remove-member.use-case"
import { broadcastMembershipChange } from "@/features/shared/infrastructure/realtime-broadcast"
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
    const result = await updateMemberRoleUseCase(ctx, createRepo(), memberId, newRole)
    revalidatePath("/dashboard/settings")

    // Notify the affected user so their client refreshes the JWT and the UI
    // reflects the new role within ~1 second. Best-effort: a Realtime
    // failure here does not roll back the role change — the membership
    // RLS check (017a) keeps the data layer consistent regardless.
    const orgName = await fetchOrgName(ctx)
    await broadcastMembershipChange(result.targetUserId, {
      type: "role_changed",
      organizationId: ctx.orgId,
      organizationName: orgName,
      newRole: result.newRole,
    })

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
    // Resolve the org name before the removal: the caller (admin/owner)
    // retains org access either way, but doing the read first preserves
    // a strict read→write order and avoids any ambiguity if the org row
    // were renamed mid-flight by a concurrent settings update.
    const orgName = await fetchOrgName(ctx)
    const result = await removeMemberUseCase(ctx, createRepo(), memberId)
    revalidatePath("/dashboard/settings")

    // Notify the removed user so their client refreshes the JWT (orphan
    // defense in custom_access_token_hook nulls their active_org_id +
    // org_role) and the UI redirects them away. Best-effort: the data
    // layer security gap is closed by the membership RLS check (017a)
    // independent of whether this push is delivered.
    await broadcastMembershipChange(result.targetUserId, {
      type: "removed",
      organizationId: ctx.orgId,
      organizationName: orgName,
    })

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al remover el miembro" }
  }
}

async function fetchOrgName(ctx: Awaited<ReturnType<typeof getSessionContext>>): Promise<string> {
  // Defensive lookup: an org row missing here would mean the session is
  // pointing at an org the user is no longer part of, which the
  // mutation above would have failed first. Falling back to an empty
  // string keeps the broadcast payload schema valid; the UI shows a
  // generic message in that pathological case.
  const orgRepo = new DrizzleOrganizationRepository()
  const org = await orgRepo.findById(ctx, ctx.orgId)
  return org?.name ?? ""
}
