"use client"

import * as React from "react"
import {
  BarChart3,
  Bot,
  Building2,
  Calendar,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Send,
  Settings2,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { OrgSwitcher } from "@/components/org-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

const data = {
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
      url: "/dashboard/leads",
      icon: Users,
    },
    {
      title: "Conversaciones",
      url: "/dashboard/conversations",
      icon: MessageSquare,
    },
    {
      title: "Citas",
      url: "/dashboard/appointments",
      icon: Calendar,
    },
    {
      title: "Mi Bot",
      url: "/dashboard/bot",
      icon: Bot,
    },
    {
      title: "Analíticas",
      url: "/dashboard/analytics",
      icon: BarChart3,
    },
    {
      title: "Marketing",
      url: "/dashboard/marketing/brochures",
      icon: Megaphone,
      items: [
        { title: "Brochures", url: "/dashboard/marketing/brochures" },
        { title: "Firma digital", url: "/dashboard/marketing/signature" },
        { title: "Publicaciones", url: "/dashboard/marketing/publications" },
      ],
    },
    {
      title: "Configuración",
      url: "/dashboard/settings",
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
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
