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

export interface RefreshSessionResult {
  /**
   * The `active_org_id` claim on the freshly minted JWT (or `null` when
   * the user has no active org — e.g. they were just removed from their
   * last membership and the JWT hook's orphan defense cleared the
   * claim). `null` here is a legitimate eviction signal.
   */
  activeOrgId: string | null
  /**
   * `true` when the refresh itself failed (network error, rotated-token
   * race, etc.). In that case `activeOrgId` is `null` because we could
   * not read the fresh claims — NOT because the user has no org. The
   * distinction matters for callers that branch on `null`: a failed
   * refresh is a transient retry condition, an eviction is a permanent
   * UX hop.
   */
  error: boolean
}

/**
 * Force a JWT refresh from a client component, returning the resulting
 * `active_org_id` claim (or `null`).
 *
 * The client cannot safely call `supabase.auth.refreshSession()` directly
 * in our @supabase/ssr setup: the browser client looks the refresh token
 * up via `document.cookie`, but the cookie is httpOnly in some flows and
 * also rotates server-side via the proxy on every request. A direct
 * client-side refresh races with the proxy's own refresh and can land on
 * a stale rotated token, returning `Invalid Refresh Token: Refresh Token
 * Not Found` (auth log code `refresh_token_not_found`). The Supabase JS
 * client treats that error as a hard sign-out → the session is wiped and
 * the next render redirects to /sign-in.
 *
 * Going through this server action ensures the refresh runs against the
 * server-side cookie jar with the current rotated token, and the
 * @supabase/ssr cookie-write handler persists the new tokens cleanly.
 *
 * Returning `activeOrgId` lets callers (e.g. the realtime membership
 * listener) skip a redundant `switchActiveOrgAction` when the freshly
 * minted JWT already points at the org they intended to land on — the
 * `soft_delete_member_with_active_org_reset` RPC (drizzle/sql/023)
 * already flipped `user_active_org` server-side, so the post-refresh
 * claim usually matches the client-side fallback pick.
 *
 * The `error` flag disambiguates `activeOrgId: null` for callers:
 * `null + error=false` is a legitimate eviction (no active org); `null +
 * error=true` means the refresh failed and the claim is unknown.
 *
 * Use this from client components after a server-side change that needs
 * to be reflected in the JWT claims (e.g. role change → realtime push →
 * client triggers refresh to get the new `org_role` claim).
 */
export async function refreshSessionAction(): Promise<RefreshSessionResult> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.refreshSession()
  if (error) {
    console.error("[org-actions] JWT refresh failed:", error.message)
    return { activeOrgId: null, error: true }
  }
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims as Record<string, unknown> | undefined
  const orgId = claims?.active_org_id
  return { activeOrgId: typeof orgId === "string" ? orgId : null, error: false }
}

export async function getUserOrganizationsAction(): Promise<OrganizationMembership[]> {
  const ctx = await getSessionContext()
  return repo.findAllForUser(ctx)
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
