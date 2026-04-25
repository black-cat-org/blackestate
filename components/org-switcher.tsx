"use client"

import { useTransition } from "react"
import { Building2, ChevronsUpDown, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { switchActiveOrgAction } from "@/features/shared/presentation/organization-actions"
import type { OrganizationMembership } from "@/features/shared/domain/organization.entity"

export type { OrganizationMembership }

export interface OrgSwitcherProps {
  activeOrgId: string
  organizations: OrganizationMembership[]
}

export function OrgSwitcher({ activeOrgId, organizations }: OrgSwitcherProps) {
  const { isMobile } = useSidebar()
  const [isPending, startTransition] = useTransition()

  const activeOrg = organizations.find((o) => o.id === activeOrgId)
  const hasMultipleOrgs = organizations.length > 1

  const handleSwitch = (orgId: string) => {
    if (orgId === activeOrgId) return
    startTransition(async () => {
      try {
        await switchActiveOrgAction(orgId)
      } catch (error) {
        // `startTransition` swallows async throws — they neither reach a
        // React error boundary nor surface as an unhandled promise
        // rejection visible to the user. Log explicitly so the failure is
        // captured in dev console and Sentry before the reload clears
        // the page. The reload still fires (in `finally` below) so the
        // user lands on a fresh dashboard; if the switch did persist
        // server-side, the next render reflects the right org; if it
        // failed entirely, they end up back on the previous org without
        // a stuck UI.
        console.error("[OrgSwitcher] switchActiveOrgAction failed:", error)
      } finally {
        // Full reload (G27): the action's revalidatePath('/dashboard',
        // 'layout') correctly busts server-component caches, but this
        // codebase has client-component pages (e.g. properties, leads)
        // that fetch via useEffect on mount — they don't re-run on
        // router.refresh() because their props don't change. A full
        // reload guarantees every page on the dashboard refetches with
        // the new active_org_id JWT claim, regardless of whether the
        // page is a server or client component. The cost is a brief
        // flash; org switching is a rare action so this is acceptable
        // (matches Slack/GitHub workspace-switch UX).
        if (typeof window !== "undefined") {
          window.location.reload()
        }
      }
    })
  }

  if (!activeOrg) return null

  if (!hasMultipleOrgs) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <div>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrg.name}</span>
                <span className="truncate text-xs">{activeOrg.slug}</span>
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={isPending}
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrg.name}</span>
                <span className="truncate text-xs">{activeOrg.slug}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                disabled={isPending}
              >
                <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <Building2 className="size-3" />
                </div>
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === activeOrgId && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
