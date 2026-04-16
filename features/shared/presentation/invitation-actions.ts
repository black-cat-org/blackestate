"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { DrizzleInvitationRepository } from "@/features/shared/infrastructure/drizzle-invitation.repository"
import { sendInvitationUseCase } from "@/features/shared/application/send-invitation.use-case"
import { acceptInvitationUseCase } from "@/features/shared/application/accept-invitation.use-case"
import { cancelInvitationUseCase } from "@/features/shared/application/cancel-invitation.use-case"
import { listInvitationsUseCase } from "@/features/shared/application/list-invitations.use-case"
import type { PendingInvitation, SendInvitationDTO } from "@/features/shared/domain/invitation.entity"

const repo = new DrizzleInvitationRepository()

async function refreshJwt(): Promise<void> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.refreshSession()
  if (error) {
    console.error("[invitation-actions] JWT refresh failed:", error.message)
  }
}

export async function sendInvitationAction(input: SendInvitationDTO): Promise<void> {
  const ctx = await getSessionContext()
  const supabase = await getSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  const callerEmail = userData.user?.email ?? ""

  const { token } = await sendInvitationUseCase(ctx, repo, input, callerEmail)

  const admin = getSupabaseAdmin()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const redirectTo = `${origin}/accept-invite?inv=${token}`

  const { error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo,
    data: {
      invited_to_org_id: ctx.orgId,
      invited_role: input.role,
    },
  })

  if (error) {
    await repo.deleteByToken(token)
    throw new Error(`Failed to send invitation email: ${error.message}`)
  }

  revalidatePath("/dashboard/settings")
}

/**
 * Accept an invitation. Uses `supabase.auth.getUser()` directly instead of
 * `getSessionContext()` because the accepting user may be brand-new (invited
 * via `inviteUserByEmail`) and their JWT may not yet contain `active_org_id`
 * — `getSessionContext()` would throw for these users.
 */
export async function acceptInvitationAction(
  invToken: string,
): Promise<{ organizationId: string }> {
  const supabase = await getSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  if (!user?.id || !user.email) {
    throw new Error("Not authenticated")
  }

  const result = await acceptInvitationUseCase(
    { userId: user.id },
    repo,
    invToken,
    user.email,
  )

  await refreshJwt()
  revalidatePath("/dashboard")
  return result
}

export async function cancelInvitationAction(invitationId: string): Promise<void> {
  const ctx = await getSessionContext()
  await cancelInvitationUseCase(ctx, repo, invitationId)
  revalidatePath("/dashboard/settings")
}

export async function listInvitationsAction(): Promise<PendingInvitation[]> {
  const ctx = await getSessionContext()
  return listInvitationsUseCase(ctx, repo)
}
