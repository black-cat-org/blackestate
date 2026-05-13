"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { DrizzleMemberRepository } from "@/features/shared/infrastructure/drizzle-member.repository"
import { DrizzleOrganizationRepository } from "@/features/shared/infrastructure/drizzle-organization.repository"
import { listMembersUseCase, getSeatInfoUseCase } from "@/features/shared/application/list-members.use-case"
import { updateMemberRoleUseCase } from "@/features/shared/application/update-member-role.use-case"
import { removeMemberUseCase } from "@/features/shared/application/remove-member.use-case"
import { getOrganizationByIdUseCase } from "@/features/shared/application/get-organization-by-id.use-case"
import { broadcastMembershipChange } from "@/features/shared/infrastructure/realtime-broadcast"
import type { TeamMember, TeamSeatInfo } from "@/features/shared/domain/member.entity"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUUID(value: string): void {
  if (!UUID_REGEX.test(value)) throw new Error("invalid_uuid")
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

/**
 * Whitelisted, user-facing copy for the English domain-error tokens the
 * team management use cases (and `translateRemovalError` in the
 * repository) throw. Every other error returns the generic fallback so
 * internal SQL/RLS messages never leak to the toast.
 *
 * The whitelist KEYS are the English tokens raised by Application /
 * Infrastructure code. The whitelist VALUES are the Spanish strings the
 * user sees. Keep the two columns in sync if you add a new error path.
 */
const ROLE_CHANGE_ERROR_COPY: Record<string, string> = {
  only_owner_can_change_roles: "Solo el propietario puede cambiar roles.",
  member_not_found: "No encontramos a ese miembro.",
  cannot_change_own_role: "No puedes cambiar tu propio rol.",
  cannot_change_owner_role: "No puedes cambiar el rol del propietario.",
  // Boundary validation thrown by `assertUUID` before the use case runs.
  invalid_uuid: "El ID del miembro no es válido.",
}

const REMOVE_ERROR_COPY: Record<string, string> = {
  not_authorised: "No tienes permisos para remover miembros.",
  member_not_found: "No encontramos a ese miembro.",
  cannot_remove_self: "No puedes removerte a ti mismo.",
  cannot_remove_owner: "No puedes remover al propietario.",
  admin_cannot_remove_admin: "Un administrador no puede remover a otro administrador.",
  invalid_uuid: "El ID del miembro no es válido.",
  // Deadlock detected by Postgres after the repo's single retry also
  // hit it (very rare — would require sustained mutual remove storms).
  concurrent_operation: "Operación concurrente en curso. Intenta de nuevo.",
}

function sanitiseError(
  e: unknown,
  whitelist: Record<string, string>,
  fallback: string,
  context: string,
): string {
  const raw = e instanceof Error ? e.message : String(e)
  const friendly = whitelist[raw]
  if (friendly) return friendly
  // Log the raw error server-side for diagnosis. Never return it to the
  // client: SQL/RLS messages expose schema, parameters, and PII.
  console.error(`[member-actions] ${context} unexpected error:`, raw)
  return fallback
}

export async function updateMemberRoleAction(
  memberId: string,
  newRole: "admin" | "agent",
): Promise<{ error?: string }> {
  try {
    assertUUID(memberId)
    const ctx = await getSessionContext()
    const result = await updateMemberRoleUseCase(ctx, createRepo(), memberId, newRole)
    revalidatePath("/dashboard/settings")

    // Notify the affected user so their client refreshes the JWT and the UI
    // reflects the new role within ~1 second. Best-effort: a Realtime
    // failure here does not roll back the role change — the membership
    // RLS check (017a) keeps the data layer consistent regardless.
    const orgName = await resolveOrgName(ctx)
    await broadcastMembershipChange(result.targetUserId, {
      type: "role_changed",
      organizationId: ctx.orgId,
      organizationName: orgName,
      newRole: result.newRole,
    })

    return {}
  } catch (e) {
    return {
      error: sanitiseError(e, ROLE_CHANGE_ERROR_COPY, "No pudimos cambiar el rol. Intenta de nuevo.", "updateMemberRole"),
    }
  }
}

export async function removeMemberAction(
  memberId: string,
): Promise<{ error?: string }> {
  try {
    assertUUID(memberId)
    const ctx = await getSessionContext()
    // Resolve the org name before the removal: the caller (admin/owner)
    // retains org access either way, but doing the read first preserves
    // a strict read→write order and avoids any ambiguity if the org row
    // were renamed mid-flight by a concurrent settings update.
    const orgName = await resolveOrgName(ctx)
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
    return {
      error: sanitiseError(e, REMOVE_ERROR_COPY, "No pudimos remover al miembro. Intenta de nuevo.", "removeMember"),
    }
  }
}

async function resolveOrgName(ctx: Awaited<ReturnType<typeof getSessionContext>>): Promise<string> {
  // Routed through `getOrganizationByIdUseCase` so Presentation does not
  // instantiate `DrizzleOrganizationRepository.findById` directly (a
  // Presentation → Infrastructure boundary violation per CLAUDE.md). An
  // org row missing here would mean the session is pointing at an org
  // the user is no longer part of, which the mutation above would have
  // failed first. Falling back to an empty string keeps the broadcast
  // payload schema valid; the UI shows a generic message in that
  // pathological case.
  const org = await getOrganizationByIdUseCase(ctx, new DrizzleOrganizationRepository(), ctx.orgId)
  return org?.name ?? ""
}
