import { redirect } from "next/navigation"
import Link from "next/link"
import { Inbox } from "lucide-react"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getInvitationByTokenAction } from "@/features/shared/presentation/invitation-actions"
import { AcceptInvitationCard } from "@/features/shared/presentation/components/accept-invitation-card.client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Confirmation-page pattern (GitHub / Atlassian style) — page does NOT
 * auto-accept on render. Reasons:
 *   1. `acceptInvitationAction` previously ran during the page render,
 *      and any side effect inside it that touched `revalidatePath`
 *      raised the "used revalidatePath during render" Next.js error.
 *   2. Auto-accepting on visit is a footgun: the invitee never sees
 *      what they're accepting (org name, role, expiry) and cannot
 *      decline without joining first.
 *   3. Email previews in some clients (Outlook desktop, scanner bots)
 *      pre-fetch links — auto-accept would mark an invitation accepted
 *      just because the email was opened.
 *
 * Flow:
 *   1. Read `?inv=<token>` from the query (memory G37: param name `inv`).
 *   2. If no token or no auth session, redirect to sign-in with `next`.
 *   3. Fetch the invitation via the action — uses
 *      `getInviteeAuthIdentity` internally so a brand-new invitee
 *      without `active_org_id` can still look up their pending row.
 *   4. If the invitation is missing/expired/email-mismatched → render
 *      the InvitationNotFoundCard (no destructive options, just
 *      navigation back to the dashboard or sign-out).
 *   5. If the invitation is valid → render the AcceptInvitationCard
 *      Client Component with the org info + Aceptar / Rechazar buttons.
 *      The card handles the action calls + post-action navigation.
 */

interface Props {
  searchParams: Promise<{ inv?: string }>
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.inv

  if (!token) redirect("/sign-in")

  const supabase = await getSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/accept-invite?inv=${token}`)}`)
  }

  const invitation = await getInvitationByTokenAction(token)

  if (!invitation) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl font-bold">Invitación no disponible</CardTitle>
            <CardDescription className="text-base">
              No encontramos una invitación pendiente con este enlace. Puede que
              haya expirado, que ya la hayas respondido, o que esté dirigida a
              otra cuenta. Si crees que es un error, pide al administrador que
              te envíe una nueva.
            </CardDescription>
          </CardHeader>
          <CardContent />
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/dashboard">Ir al dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <AcceptInvitationCard invitation={invitation} />
    </div>
  )
}
