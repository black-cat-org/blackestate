import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { DealsView } from "@/features/deals/presentation/components/deals-view"
import { DealCreateButton } from "@/features/deals/presentation/components/deal-create-button"
import { getDealsAction } from "@/features/deals/presentation/actions"
import { getActivePropertiesAction } from "@/features/properties/presentation/actions"

export default async function DealsPage() {
  const [deals, properties] = await Promise.all([
    getDealsAction(),
    getActivePropertiesAction(),
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
              <BreadcrumbPage>Negocios</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Negocios</h1>
          <DealCreateButton properties={properties} />
        </div>

        <DealsView deals={deals} />
      </div>
    </>
  )
}
