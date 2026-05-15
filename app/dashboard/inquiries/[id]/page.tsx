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
import { InquiryDetailHeader } from "@/features/inquiries/presentation/components/inquiry-detail-header"
import { InquiryDetailInfo } from "@/features/inquiries/presentation/components/inquiry-detail-info"
import { getInquiryByIdAction } from "@/features/inquiries/presentation/actions"

interface InquiryDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InquiryDetailPage({
  params,
}: InquiryDetailPageProps) {
  const { id } = await params
  const inquiry = await getInquiryByIdAction(id)
  if (!inquiry) notFound()

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
              <BreadcrumbLink href="/dashboard/inquiries">Consultas</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{inquiry.contactName ?? "—"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <InquiryDetailHeader inquiry={inquiry} />
        <div className="max-w-2xl">
          <InquiryDetailInfo inquiry={inquiry} />
        </div>
      </div>
    </>
  )
}
