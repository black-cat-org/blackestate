"use server"

import { after } from "next/server"
import { createElement } from "react"
import { revalidatePath } from "next/cache"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { DrizzleInvitationRepository } from "@/features/shared/infrastructure/drizzle-invitation.repository"
import { DrizzleOrganizationRepository } from "@/features/shared/infrastructure/drizzle-organization.repository"
import { sendInvitationUseCase } from "@/features/shared/application/send-invitation.use-case"
import { acceptInvitationUseCase } from "@/features/shared/application/accept-invitation.use-case"
import { cancelInvitationUseCase } from "@/features/shared/application/cancel-invitation.use-case"
import { listInvitationsUseCase } from "@/features/shared/application/list-invitations.use-case"
import { listMyPendingInvitationsUseCase } from "@/features/shared/application/list-my-pending-invitations.use-case"
import { rejectInvitationUseCase } from "@/features/shared/application/reject-invitation.use-case"
import { sendEmail } from "@/lib/email"
import {
  InvitationEmail,
  invitationEmailSubject,
} from "@/features/shared/infrastructure/email/invitation-email"
import type {
  IncomingInvitation,
  PendingInvitation,
  SendInvitationDTO,
} from "@/features/shared/domain/invitation.entity"

const repo = new DrizzleInvitationRepository()
const orgRepo = new DrizzleOrganizationRepository()

/**
 * Build the absolute accept-invite URL from NEXT_PUBLIC_APP_URL + the
 * invitation token. The query param name is `inv` (memory G37) — kept
 * stable across the email and the in-app pending invitations panel.
 *
 * Fails loud when the env var is missing rather than degrading to a
 * relative URL: email clients can't navigate `/accept-invite?inv=...`,
 * so a missing var produces invitations with dead CTAs — but `sendEmail`
 * would still report success. The thrown error is caught inside the
 * `after()` wrapper at the call site and logged with the invitationId
 * for operator visibility, while the action itself still returns the
 * persisted invitation (best-effort contract D-8 preserved).
 *
 * Mirrors the literal-access pattern from `requireSupabaseEnv` — written
 * inline because we have only one consumer for now; if more callers
 * need NEXT_PUBLIC_APP_URL we extract a shared `requireAppUrl()` helper
 * alongside requireSupabaseEnv.
 */
function buildAcceptUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL
  if (!base) {
    throw new Error(
      "[invitation] NEXT_PUBLIC_APP_URL is not set — cannot build accept URL",
    )
  }
  // Trim any trailing slash so we don't generate `//accept-invite?...`.
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base
  return `${normalized}/accept-invite?inv=${token}`
}

/**
 * Derive a friendly display name for the inviter. JWT claim `user_name`
 * is the canonical source (populated by handle_new_user from full_name
 * → name → email local-part). Email local-part fallback covers the rare
 * case where the claim is missing.
 */
function resolveInviterName(userName: string | null, email: string): string {
  if (userName && userName.trim()) return userName.trim()
  return email.split("@")[0] ?? email
}

async function refreshJwt(): Promise<void> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.refreshSession()
  if (error) {
    console.error("[invitation-actions] JWT refresh failed:", error.message)
  }
}

/**
 * Create an invitation row + dispatch the invitation email.
 *
 * Invitations are strictly for users who already have a Black Estate
 * account — the use case rejects unknown emails via the
 * `check_user_exists_by_email` RPC.
 *
 * Email delivery is wired here following the Fase 1 architecture from
 * docs/plans/2026-05-12-mailing-architecture.md: render the React Email
 * template with the data the action has on hand, then call sendEmail
 * inside `after()` so SMTP latency does not block the action response.
 * Best-effort per D-8: if the email fails the row is still saved and
 * the admin can resend; the invitee can also be told the invitation
 * exists via the in-app pending invitations panel.
 */
export async function sendInvitationAction(input: SendInvitationDTO): Promise<PendingInvitation> {
  const ctx = await getSessionContext()
  // Use the JWT email claim directly instead of round-tripping to
  // supabase.auth.getUser(): the JWT is already canonical for RLS, and
  // falling back to "" on a missing user previously let a phone / anonymous
  // caller bypass the self-invite check inside the use case.
  if (!ctx.email) {
    throw new Error("Cannot send invitation: caller session has no email claim")
  }

  const { invitation, token } = await sendInvitationUseCase(ctx, repo, input, ctx.email)

  // Resolve org metadata now (sync, fast) so the deferred sendEmail call
  // has stable inputs even if the org row is mutated later by another
  // request. `findById` honors RLS via the caller's ctx; admins always
  // have read access to their active org.
  const organization = await orgRepo.findById(ctx, ctx.orgId)
  const inviterName = resolveInviterName(ctx.userName, ctx.email)

  after(async () => {
    // Defer the SMTP roundtrip — Server Action returns first, email
    // delivery happens after. Best-effort per D-8: the invitation row is
    // already persisted, the admin can resend, the invitee can refresh
    // the dashboard to see the in-app pending invitations panel.
    //
    // Two distinct failure modes are caught here:
    //   (a) Transport errors caught inside `sendEmail` — surface as
    //       `{ success: false, error }` and we log them structured.
    //   (b) Config errors that `sendEmail` re-throws (missing SMTP env
    //       vars, transporter init failure) AND the synchronous throw
    //       from `buildAcceptUrl` when NEXT_PUBLIC_APP_URL is unset —
    //       these escape `sendEmail`'s try/catch by design. Without the
    //       outer try/catch they would surface as unhandled rejections
    //       in the Next.js `after()` runtime: an opaque stderr trace
    //       with no invitationId context. Wrap so an operator sees
    //       which invitation failed and why.
    if (!organization) {
      console.error(
        "[invitation-actions] cannot send invitation email: org not found",
        { orgId: ctx.orgId, invitationId: invitation.id },
      )
      return
    }
    try {
      const result = await sendEmail({
        to: invitation.email,
        subject: invitationEmailSubject({
          inviterName,
          organizationName: organization.name,
        }),
        react: createElement(InvitationEmail, {
          inviterName,
          organizationName: organization.name,
          role: invitation.role,
          acceptUrl: buildAcceptUrl(token),
          expiresAtIso: invitation.expiresAt,
        }),
      })
      if (!result.success) {
        console.error(
          "[invitation-actions] email send failed:",
          result.error.message,
          { invitationId: invitation.id, to: invitation.email },
        )
      }
    } catch (err) {
      console.error(
        "[invitation-actions] email runtime error (config or url):",
        err,
        { invitationId: invitation.id, to: invitation.email },
      )
    }
  })

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

/**
 * List pending invitations addressed to the caller. Used by the dashboard
 * "Invitaciones pendientes" panel and the sidebar unread badge.
 */
export async function listMyPendingInvitationsAction(): Promise<IncomingInvitation[]> {
  const ctx = await getSessionContext()
  return listMyPendingInvitationsUseCase(ctx, repo)
}

/**
 * Invitee rejects an invitation. Takes the token (same shape as accept)
 * to avoid exposing invitation ids on the invitee surface.
 */
export async function rejectInvitationAction(token: string): Promise<void> {
  const ctx = await getSessionContext()
  await rejectInvitationUseCase(ctx, repo, token)
  // Use "layout" so the sidebar badge count (computed in dashboard/layout.tsx)
  // re-fetches. "page" alone would only revalidate /dashboard and the badge
  // would keep the stale count until the next full navigation.
  revalidatePath("/dashboard", "layout")
}
