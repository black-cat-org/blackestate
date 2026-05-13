import type { Metadata } from "next"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { TrashContent } from "@/features/shared/presentation/components/trash-content"
import { getDeletedPropertiesAction } from "@/features/properties/presentation/actions"
import { getDeletedLeadsAction } from "@/features/leads/presentation/actions"
import { getDeletedAppointmentsAction } from "@/features/appointments/presentation/actions"

export const metadata: Metadata = {
  title: "Papelera | Black Estate",
}

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const initialTab =
    tab === "leads"
      ? "leads"
      : tab === "appointments"
        ? "appointments"
        : "properties"

  const [properties, leads, appointments] = await Promise.all([
    getDeletedPropertiesAction(),
    getDeletedLeadsAction(),
    getDeletedAppointmentsAction(),
  ])

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
              <BreadcrumbPage>Papelera</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Papelera</h1>
          <p className="text-sm text-muted-foreground">
            Propiedades, leads y citas eliminados. Puedes restaurarlos desde
            acá. Cada fila muestra cuándo se eliminó y quién lo hizo.
          </p>
        </div>

        <TrashContent
          properties={properties}
          leads={leads}
          appointments={appointments}
          initialTab={initialTab}
        />
      </div>
    </>
  )
}
