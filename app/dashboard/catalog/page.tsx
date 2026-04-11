import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { ComingSoon } from "@/components/coming-soon"

export default function CatalogPage() {
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
              <BreadcrumbPage>Catálogo</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>
      <ComingSoon
        title="Catálogo público"
        description="Configura y personaliza tu catálogo público de propiedades. Tus clientes podrán ver todas tus propiedades activas en un solo lugar con tu marca personal."
      />
    </>
  )
}
