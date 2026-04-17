"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext, getAuthState } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { DrizzleOrganizationRepository } from "@/features/shared/infrastructure/drizzle-organization.repository"
import { switchActiveOrgUseCase } from "@/features/shared/application/switch-active-org.use-case"
import { createOrganizationUseCase } from "@/features/shared/application/create-organization.use-case"
import { updateOrganizationUseCase } from "@/features/shared/application/update-organization.use-case"
import type { Organization, OrganizationMembership, UpdateOrganizationDTO } from "@/features/shared/domain/organization.entity"

const repo = new DrizzleOrganizationRepository()

async function refreshJwt(): Promise<void> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.refreshSession()
  if (error) {
    console.error("[org-actions] JWT refresh failed:", error.message)
  }
}

export async function getUserOrganizationsAction(): Promise<OrganizationMembership[]> {
  const ctx = await getSessionContext()
  return repo.findAllForUser(ctx.userId)
}

export async function switchActiveOrgAction(newOrgId: string): Promise<void> {
  const ctx = await getSessionContext()
  await switchActiveOrgUseCase(ctx, repo, newOrgId)
  await refreshJwt()
  revalidatePath("/dashboard")
}

export async function createOrganizationAction(input: {
  name: string
  slug: string
}): Promise<Organization> {
  const { ctx, claims } = await getAuthState()
  const ownerInfo = {
    email: (claims.email as string) ?? "",
    name: (claims.user_name as string) ?? undefined,
    avatarUrl: (claims.avatar_url as string) ?? undefined,
  }
  const org = await createOrganizationUseCase(ctx, repo, input, ownerInfo)
  await refreshJwt()
  revalidatePath("/dashboard")
  return org
}

export async function updateOrganizationAction(
  orgId: string,
  patch: UpdateOrganizationDTO,
): Promise<void> {
  const ctx = await getSessionContext()
  await updateOrganizationUseCase(ctx, repo, orgId, patch)
  revalidatePath("/dashboard/settings")
}
