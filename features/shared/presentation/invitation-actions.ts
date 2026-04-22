"use server"

import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
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

/**
 * Create an invitation row. Invitations are strictly for users who already
 * have a Black Estate account — the use case rejects unknown emails via the
 * `check_user_exists_by_email` RPC. No email is sent; the invitee sees the
 * invitation in-app the next time they log in or refresh the dashboard.
 * Email delivery (via Resend) will land as part of Capa 4 (Observabilidad
 * y Notificaciones), not here.
 */
export async function sendInvitationAction(input: SendInvitationDTO): Promise<PendingInvitation> {
  const ctx = await getSessionContext()
  const supabase = await getSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  const callerEmail = userData.user?.email ?? ""

  const { invitation } = await sendInvitationUseCase(ctx, repo, input, callerEmail)

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
 * action does not need to materialise a SessionContext — important because
 * a brand-new invitee may not yet have an `active_org_id` and
 * `getSessionContext()` would throw.
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
