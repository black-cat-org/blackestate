import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { AppointmentsView } from "@/features/appointments/presentation/components/appointments-view"
import { getAppointmentsAction } from "@/features/appointments/presentation/actions"
import { getLeadsAction } from "@/features/leads/presentation/actions"
import { getPropertiesAction } from "@/features/properties/presentation/actions"

export default async function AppointmentsPage() {
  const [appointments, leads, properties] = await Promise.all([
    getAppointmentsAction(),
    getLeadsAction(),
    getPropertiesAction(),
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
              <BreadcrumbPage>Citas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <AppointmentsView appointments={appointments} leads={leads} properties={properties} />
      </div>
    </>
  )
}
