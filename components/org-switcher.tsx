"use client"

import { Building2 } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface ActiveOrg {
  id: string
  name: string
  slug: string
}

/**
 * Active organization display for the sidebar header.
 *
 * Multi-org switching, "create organization", and invite-flow UI land in
 * sub-plan 09 task #66 (`organization-actions.ts`). Until then this renders
 * a static label to unblock the rest of the Supabase Auth migration.
 */
export function OrgSwitcher({ activeOrg }: { activeOrg: ActiveOrg }) {
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
