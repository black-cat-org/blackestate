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
import { getDealsAction } from "@/features/deals/presentation/actions"

export default async function AppointmentsPage() {
  const [appointments, deals] = await Promise.all([
    getAppointmentsAction(),
    getDealsAction(),
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
        <AppointmentsView appointments={appointments} deals={deals} />
      </div>
    </>
  )
}
