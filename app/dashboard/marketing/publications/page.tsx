import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { ComingSoon } from "@/components/coming-soon"

export default function PublicationsPage() {
  return (
    <>
      <DashboardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard/marketing/brochures">Marketing</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Publicaciones</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>
      <ComingSoon
        title="Portal de publicaciones"
        description="Publica tus propiedades directamente en Facebook, Instagram, TikTok y portales inmobiliarios desde un solo lugar. Programa publicaciones y mide su rendimiento."
      />
    </>
  )
}
