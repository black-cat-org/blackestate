import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { AnalyticsContent } from "@/features/analytics/presentation/components/analytics-content"
import { getAnalyticsDataAction } from "@/features/analytics/presentation/actions"

export default async function AnalyticsPage() {
  const {
    overviewData,
    inquiriesData,
    propertiesData,
    financialData,
    botData,
    myActivityData,
  } = await getAnalyticsDataAction()

  // `priceTrendZones` is derived once at the boundary so the client
  // component receives a plain string[] and never has to introspect
  // dynamic keys at render time. Stays here (not in the service)
  // because it's a presentational concern — the chart needs the zone
  // legend, and the underlying data shape is intentionally generic
  // (`TimeSeriesPoint` with arbitrary keys).
  const priceTrendZones = Object.keys(propertiesData.priceTrend[0] || {}).filter(
    (k) => k !== "date",
  )

  return (
    <>
      <DashboardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Analíticas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <AnalyticsContent
          overviewData={overviewData}
          inquiriesData={inquiriesData}
          propertiesData={{ ...propertiesData, priceTrendZones }}
          financialData={financialData}
          botData={botData}
          myActivityData={myActivityData}
        />
      </div>
    </>
  )
}
