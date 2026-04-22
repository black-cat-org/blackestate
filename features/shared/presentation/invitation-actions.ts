"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient, getSupabaseAdmin } from "@/lib/supabase/server"
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

export async function sendInvitationAction(input: SendInvitationDTO): Promise<PendingInvitation> {
  const ctx = await getSessionContext()
  const supabase = await getSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  const callerEmail = userData.user?.email ?? ""

  const { invitation, token } = await sendInvitationUseCase(ctx, repo, input, callerEmail)

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

  if (error && error.code !== "email_exists") {
    // Roll back the just-created invitation row by soft-cancelling it via
    // `markCancelled`. There is no DELETE policy on `invitation` (no hard
    // deletes by design), and soft cancel goes through withRLS like every
    // other mutation — no db-direct escape hatch.
    //
    // Swallow rollback failures: the primary error is the email delivery
    // failure, which is what the user needs to see. If the rollback fails
    // the invitation row is left in `pending` (the token will expire after
    // 7 days), but logging it surfaces the inconsistency for operators.
    try {
      await repo.markCancelled(ctx, invitation.id)
    } catch (rollbackError) {
      console.error(
        "[invitation-actions] Failed to roll back invitation after email error",
        { invitationId: invitation.id, rollbackError },
      )
    }
    throw new Error(`Failed to send invitation email: ${error.message}`)
  }

  revalidatePath("/dashboard/settings")
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  }
}

/**
 * Accept an invitation. The `accept_invitation` SECURITY DEFINER RPC reads
 * `auth.uid()` and `auth.jwt() ->> 'email'` from the caller's JWT, so the
 * action does not need to materialise a SessionContext here — which is
 * important because a brand-new invitee (just signed up via `inviteUserByEmail`)
 * may not yet have an `active_org_id`, and `getSessionContext()` would throw.
 */
export async function acceptInvitationAction(
  invToken: string,
): Promise<{ organizationId: string }> {
  const result = await acceptInvitationUseCase(repo, invToken)
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
