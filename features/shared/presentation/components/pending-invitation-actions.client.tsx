"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  acceptInvitationAction,
  rejectInvitationAction,
} from "@/features/shared/presentation/invitation-actions"

interface Props {
  token: string
  organizationName: string
}

/**
 * Accept / Reject buttons for a single pending invitation card.
 *
 * Separated from the server-rendered panel so the static markup can be
 * streamed without waiting for a client bundle, and so each card holds
 * its own optimistic-state scope (loading / error messages are per-row,
 * not global).
 */
export function PendingInvitationActions({ token, organizationName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<"accept" | "reject" | null>(null)

  function handleAccept() {
    setError(null)
    setAction("accept")
    startTransition(async () => {
      try {
        await acceptInvitationAction(token)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo aceptar la invitación")
        setAction(null)
      }
    })
  }

  function handleReject() {
    setError(null)
    setAction("reject")
    startTransition(async () => {
      try {
        await rejectInvitationAction(token)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo rechazar la invitación")
        setAction(null)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isPending}
          aria-label={`Rechazar invitación a ${organizationName}`}
        >
          {isPending && action === "reject" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          Rechazar
        </Button>
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isPending}
          aria-label={`Aceptar invitación a ${organizationName}`}
        >
          {isPending && action === "accept" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Aceptar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
