"use client"

import * as React from "react"
import {
  Building2,
  LayoutDashboard,
  LifeBuoy,
  Send,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

const data = {
  user: {
    name: "Gonzalo P.",
    email: "gonzalo@blackestate.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Propiedades",
      url: "/dashboard/properties",
      icon: Building2,
    },
    {
      title: "Leads",
      url: "/dashboard/contacts",
      icon: Users,
    },
    {
      title: "Contenido IA",
      url: "/dashboard/ai",
      icon: Sparkles,
    },
    {
      title: "Configuración",
      url: "#",
      icon: Settings2,
    },
  ],
  navSecondary: [
    { title: "Soporte", url: "#", icon: LifeBuoy },
    { title: "Feedback", url: "#", icon: Send },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Black Estate</span>
                  <span className="truncate text-xs">Gestión inmobiliaria</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
