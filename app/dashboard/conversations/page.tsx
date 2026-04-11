import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { ComingSoon } from "@/components/coming-soon"

export default function ConversationsPage() {
  return (
    <>
      <DashboardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Conversaciones</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>
      <ComingSoon
        title="Conversaciones"
        description="Tu inbox de WhatsApp integrado. Ve todas las conversaciones con tus leads en un solo lugar, responde directamente y deja que el bot te ayude cuando no estés disponible."
      />
    </>
  )
}
