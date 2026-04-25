"use server"

import { revalidatePath } from "next/cache"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { DrizzleInvitationRepository } from "@/features/shared/infrastructure/drizzle-invitation.repository"
import { sendInvitationUseCase } from "@/features/shared/application/send-invitation.use-case"
import { acceptInvitationUseCase } from "@/features/shared/application/accept-invitation.use-case"
import { cancelInvitationUseCase } from "@/features/shared/application/cancel-invitation.use-case"
import { listInvitationsUseCase } from "@/features/shared/application/list-invitations.use-case"
import { listMyPendingInvitationsUseCase } from "@/features/shared/application/list-my-pending-invitations.use-case"
import { rejectInvitationUseCase } from "@/features/shared/application/reject-invitation.use-case"
import { InvitationDomainError, sanitizeInvitationError } from "@/lib/errors/invitation-errors"
import type {
  IncomingInvitation,
  PendingInvitation,
  SendInvitationDTO,
} from "@/features/shared/domain/invitation.entity"

const repo = new DrizzleInvitationRepository()

async function refreshJwt(): Promise<void> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.refreshSession()
  if (error) {
    console.error("[invitation-actions] JWT refresh failed:", error.message)
  }
}

/**
 * Wrap a server-action body so any thrown error is translated into a
 * user-facing ES message before crossing the React serialization boundary.
 *
 * Why a wrapper instead of inline try/catch in every action:
 * - Single chokepoint where Drizzle / pg / framework errors are sanitised.
 *   The raw `Failed query: update "invitation" set ... params: <PII>` text
 *   that leaked into the UI (G24) is intercepted here, not in 6 different
 *   actions where one missed catch reopens the leak.
 * - Re-throws Next.js redirect signals untouched — those are control flow,
 *   not errors. (None of the current invitation actions redirect, but the
 *   guard is cheap and future-proofs callers that do.)
 * - Preserves the original throwable as `cause` so server logs keep the
 *   full stack trace for debugging while the client only sees the
 *   sanitised message.
 */
async function withInvitationActionBoundary<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isRedirectError(error)) throw error
    throw new Error(sanitizeInvitationError(error), { cause: error })
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
  return withInvitationActionBoundary(async () => {
    const ctx = await getSessionContext()
    // Use the JWT email claim directly instead of round-tripping to
    // supabase.auth.getUser(): the JWT is already canonical for RLS, and
    // falling back to "" on a missing user previously let a phone / anonymous
    // caller bypass the self-invite check inside the use case.
    if (!ctx.email) {
      throw new InvitationDomainError("caller_session_no_email")
    }

    const { invitation } = await sendInvitationUseCase(ctx, repo, input, ctx.email)

    revalidatePath("/dashboard/settings")
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    }
  })
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
  return withInvitationActionBoundary(async () => {
    const result = await acceptInvitationUseCase(repo, invToken)
    await refreshJwt()
    revalidatePath("/dashboard")
    return result
  })
}

export async function cancelInvitationAction(invitationId: string): Promise<void> {
  return withInvitationActionBoundary(async () => {
    const ctx = await getSessionContext()
    await cancelInvitationUseCase(ctx, repo, invitationId)
    revalidatePath("/dashboard/settings")
  })
}

export async function listInvitationsAction(): Promise<PendingInvitation[]> {
  return withInvitationActionBoundary(async () => {
    const ctx = await getSessionContext()
    return listInvitationsUseCase(ctx, repo)
  })
}

/**
 * List pending invitations addressed to the caller. Used by the dashboard
 * "Invitaciones pendientes" panel and the sidebar unread badge.
 */
export async function listMyPendingInvitationsAction(): Promise<IncomingInvitation[]> {
  return withInvitationActionBoundary(async () => {
    const ctx = await getSessionContext()
    return listMyPendingInvitationsUseCase(ctx, repo)
  })
}

/**
 * Invitee rejects an invitation. Takes the token (same shape as accept)
 * to avoid exposing invitation ids on the invitee surface.
 */
export async function rejectInvitationAction(token: string): Promise<void> {
  return withInvitationActionBoundary(async () => {
    const ctx = await getSessionContext()
    await rejectInvitationUseCase(ctx, repo, token)
    // Use "layout" so the sidebar badge count (computed in dashboard/layout.tsx)
    // re-fetches. "page" alone would only revalidate /dashboard and the badge
    // would keep the stale count until the next full navigation.
    revalidatePath("/dashboard", "layout")
  })
}
