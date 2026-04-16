import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getAuthState } from "@/features/shared/infrastructure/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { organization } from "@/lib/db/schema"

type UserMetadata = { full_name?: string; avatar_url?: string }

function displayName(claims: Record<string, unknown>): string {
  const fromHook = claims.user_name
  if (typeof fromHook === "string" && fromHook.length > 0) return fromHook

  const meta = claims.user_metadata as UserMetadata | undefined
  if (meta?.full_name) return meta.full_name

  const email = claims.email
  if (typeof email === "string") return email.split("@")[0] ?? "Usuario"

  return "Usuario"
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let authState
  try {
    authState = await getAuthState()
  } catch {
    redirect("/sign-in")
  }

  const { ctx, claims } = authState

  const orgRows = await withRLS(ctx, (tx) =>
    tx
      .select({ id: organization.id, name: organization.name, slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, ctx.orgId))
      .limit(1),
  )

  const activeOrg = orgRows[0]
  if (!activeOrg) {
    // JWT references an org that no longer exists, or RLS denied the read
    // (user was removed from the org). Signal a clean re-auth rather than
    // crash downstream consumers.
    redirect("/sign-in")
  }

  const meta = claims.user_metadata as UserMetadata | undefined
  const user = {
    id: ctx.userId,
    name: displayName(claims),
    email: typeof claims.email === "string" ? claims.email : "",
    avatarUrl: meta?.avatar_url,
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} activeOrg={activeOrg} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
