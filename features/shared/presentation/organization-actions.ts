"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { DrizzleOrganizationRepository } from "@/features/shared/infrastructure/drizzle-organization.repository"
import { switchActiveOrgUseCase } from "@/features/shared/application/switch-active-org.use-case"
import { updateOrganizationUseCase } from "@/features/shared/application/update-organization.use-case"
import type {
  OrganizationMembership,
  UpdateOrganizationDTO,
} from "@/features/shared/domain/organization.entity"

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
  return repo.findAllForUser(ctx)
}

export async function switchActiveOrgAction(newOrgId: string): Promise<void> {
  const ctx = await getSessionContext()
  await switchActiveOrgUseCase(ctx, repo, newOrgId)
  await refreshJwt()
  // "layout" scope invalidates `/dashboard/layout.tsx` AND every nested
  // page (`/dashboard/properties`, `/dashboard/leads`, etc.) so the
  // full-page reload triggered by the client (window.location.reload()
  // in components/org-switcher.tsx) hits cold server-component caches
  // and refetches with the new active_org_id JWT claim. Without "layout"
  // Next.js would only invalidate `/dashboard/page.tsx`; nested routes
  // would serve the previous org's cached data on the post-reload GET.
  revalidatePath("/dashboard", "layout")
}

export async function updateOrganizationAction(
  orgId: string,
  patch: UpdateOrganizationDTO,
): Promise<void> {
  const ctx = await getSessionContext()
  await updateOrganizationUseCase(ctx, repo, orgId, patch)
  revalidatePath("/dashboard/settings")
}
