import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import Link from "next/link"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { acceptInvitationAction } from "@/features/shared/presentation/invitation-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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

  let errorMessage: string | null = null

  try {
    await acceptInvitationAction(token)
  } catch (error) {
    if (isRedirectError(error)) throw error
    errorMessage = error instanceof Error ? error.message : "Error processing invitation"
  }

  if (!errorMessage) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Invitación</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
