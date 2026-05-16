import { notFound } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { DealDetailPage } from "@/features/deals/presentation/components/deal-detail-page"
import { DealAppointmentsList } from "@/features/deals/presentation/components/deal-appointments-list"
import { getDealByIdAction } from "@/features/deals/presentation/actions"
import { getAppointmentsByDealAction } from "@/features/appointments/presentation/actions"

interface DealDetailPageRouteProps {
  params: Promise<{ id: string }>
}

export default async function DealDetailRoute({
  params,
}: DealDetailPageRouteProps) {
  const { id } = await params
  const deal = await getDealByIdAction(id)
  if (!deal) notFound()

  // Secondary fetches in `Promise.all` for parity with `contacts/[id]`
  // — there is only one today but R47 will add bot history + AI content
  // sections under this same guard, and starting with the array shape
  // keeps the extension path obvious and parallel.
  const [appointments] = await Promise.all([getAppointmentsByDealAction(id)])

  const breadcrumbLabel = [deal.contactName, deal.propertyTitle]
    .filter(Boolean)
    .join(" · ")

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
              <BreadcrumbLink href="/dashboard/deals">Negocios</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{breadcrumbLabel || "Negocio"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DealDetailPage deal={deal} />
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Citas asociadas</h2>
          <DealAppointmentsList appointments={appointments} />
        </section>
      </div>
    </>
  )
}
