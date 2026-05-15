import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { InquiriesView } from "@/features/inquiries/presentation/components/inquiries-view"
import { InquiryCreateButton } from "@/features/inquiries/presentation/components/inquiry-create-button"
import { getInquiriesAction } from "@/features/inquiries/presentation/actions"
import { getActivePropertiesAction } from "@/features/properties/presentation/actions"

export default async function InquiriesPage() {
  const [inquiries, properties] = await Promise.all([
    getInquiriesAction(),
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
              <BreadcrumbPage>Consultas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Consultas</h1>
          <InquiryCreateButton properties={properties} />
        </div>

        <InquiriesView inquiries={inquiries} />
      </div>
    </>
  )
}
