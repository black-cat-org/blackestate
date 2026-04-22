import Image from "next/image"
import { Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { listMyPendingInvitationsAction } from "@/features/shared/presentation/invitation-actions"
import { PendingInvitationActions } from "./pending-invitation-actions.client"

const ROLE_LABELS: Record<"admin" | "agent", string> = {
  admin: "Administrador",
  agent: "Agente",
}

function formatExpiresAt(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays <= 0) return "Expira hoy"
  if (diffDays === 1) return "Expira mañana"
  return `Expira en ${diffDays} días`
}

/**
 * Panel rendering pending invitations addressed to the caller at the top
 * of the dashboard. Server component: fetches the list through the Server
 * Action, returns `null` when there is nothing to show so the caller does
 * not pay layout cost for an empty state.
 *
 * The accept/reject buttons live in a client subcomponent so this
 * surface can stream statically and each card owns its own loading /
 * error scope.
 */
export async function PendingInvitationsPanel() {
  const invitations = await listMyPendingInvitationsAction()

  if (invitations.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-muted-foreground" />
          <CardTitle>Invitaciones pendientes</CardTitle>
          <Badge variant="secondary">{invitations.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              {inv.organizationLogoUrl ? (
                <Image
                  src={inv.organizationLogoUrl}
                  alt={inv.organizationName}
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
                  {inv.organizationName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium">{inv.organizationName}</p>
                <p className="text-sm text-muted-foreground">
                  Te invitó como {ROLE_LABELS[inv.role]} · {formatExpiresAt(inv.expiresAt)}
                </p>
              </div>
            </div>
            <PendingInvitationActions
              token={inv.token}
              organizationName={inv.organizationName}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
