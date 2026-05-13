"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Building2, Check, Loader2, ShieldAlert, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  acceptInvitationAction,
  rejectInvitationAction,
} from "@/features/shared/presentation/invitation-actions"
import type {
  IncomingInvitation,
  InvitableRole,
} from "@/features/shared/domain/invitation.entity"
import { formatFriendlyDate } from "@/lib/utils/relative-time"

/**
 * Confirmation card rendered by `/accept-invite?inv=<token>` when the
 * invitation is valid for the current session. Modelled on the
 * GitHub / Atlassian accept-invite UX: the invitee sees the inviting
 * org + role + expiry, then explicitly clicks "Aceptar" or "Rechazar".
 *
 * Why a client component instead of a Server Component with `<form
 * action={...}>`:
 *   - Per-button loading state with `useTransition` is much easier to
 *     express here than coordinating two form actions on the same
 *     page.
 *   - Both actions navigate after success — we control the post-action
 *     hop deterministically (router.replace to `/dashboard`) instead of
 *     relying on `redirect()` thrown from the Server Action, which
 *     would force every caller of `acceptInvitationAction` /
 *     `rejectInvitationAction` to handle the throw.
 *
 * Why `router.replace("/dashboard")` for both branches:
 *   - Accept → user joined the org; dashboard is the right next page.
 *   - Reject → user does NOT want this org; dashboard surfaces their
 *     other memberships. If the user has no other org, the proxy
 *     (`proxy.ts`) bounces them through `/auth/sign-out-removed` to
 *     `/sign-in?reason=removed`. The branch logic lives once in the
 *     proxy, not duplicated here.
 *   - `replace` (not `push`) so the back button does not return to
 *     this single-use accept-invite URL.
 */

interface AcceptInvitationCardProps {
  invitation: IncomingInvitation
}

const ROLE_LABELS: Record<InvitableRole, string> = {
  admin: "Administrador",
  agent: "Agente",
}

const ROLE_VARIANTS: Record<InvitableRole, "secondary" | "outline"> = {
  admin: "secondary",
  agent: "outline",
}

export function AcceptInvitationCard({ invitation }: AcceptInvitationCardProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<"accept" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Synchronous guard against double-clicks. The async path below
  // setting `pendingAction` only re-renders after the next tick; a
  // fast double-tap before that render would otherwise enqueue two
  // calls. The RPCs are idempotent so a double call is harmless at
  // the data layer, but the user would see a brief flash of the
  // second error.
  const submittingRef = useRef(false)
  const isPending = pendingAction !== null

  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role
  const friendlyExpiry = formatFriendlyDate(invitation.expiresAt)

  // Plain async + state instead of `useTransition`. Wrapping the
  // server-action + `router.replace` in `startTransition` interacted
  // badly with the navigation: the transition held `isPending` true
  // through the post-action navigation and never cleared the spinner
  // on the reject branch. With plain state, the spinner is cleared
  // synchronously on success (component unmounts on navigation) or
  // on error (catch block resets state). No router.refresh — the
  // `replace` navigates to a fresh route render of /dashboard.
  function handle(action: "accept" | "reject"): void {
    if (submittingRef.current) return
    submittingRef.current = true
    setError(null)
    setPendingAction(action)
    void runAction(action)
  }

  async function runAction(action: "accept" | "reject"): Promise<void> {
    try {
      if (action === "accept") {
        await acceptInvitationAction(invitation.token)
      } else {
        await rejectInvitationAction(invitation.token)
      }
      // Same destination for both: the dashboard layout / proxy
      // decide what to show based on the user's remaining org
      // memberships.
      router.replace("/dashboard")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : action === "accept"
            ? "No pudimos aceptar la invitación. Intenta de nuevo."
            : "No pudimos rechazar la invitación. Intenta de nuevo.",
      )
      setPendingAction(null)
      submittingRef.current = false
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center overflow-hidden rounded-full bg-muted">
          {invitation.organizationLogoUrl ? (
            <Image
              src={invitation.organizationLogoUrl}
              alt={`Logotipo de ${invitation.organizationName}`}
              width={56}
              height={56}
              className="size-14 object-cover"
            />
          ) : (
            <Building2 className="size-6 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <CardTitle className="text-2xl font-bold">Te invitaron a un equipo</CardTitle>
        <CardDescription className="text-base">
          Recibiste una invitación para unirte a{" "}
          <strong className="text-foreground">{invitation.organizationName}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">Rol asignado</span>
          <Badge variant={ROLE_VARIANTS[invitation.role] ?? "outline"}>{roleLabel}</Badge>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            La invitación vence {friendlyExpiry}. Si no reconoces este equipo, puedes
            rechazarla con seguridad.
          </span>
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => handle("reject")}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending && pendingAction === "reject" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          Rechazar
        </Button>
        <Button
          type="button"
          onClick={() => handle("accept")}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending && pendingAction === "accept" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Aceptar invitación
        </Button>
      </CardFooter>
    </Card>
  )
}
