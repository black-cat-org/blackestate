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
import { LeadDetailHeader } from "@/features/leads/presentation/components/lead-detail-header"
import { LeadDetailInfo } from "@/features/leads/presentation/components/lead-detail-info"
import { LeadBotTimeline } from "@/features/leads/presentation/components/lead-bot-timeline"
import { LeadTimeline } from "@/features/leads/presentation/components/lead-timeline"
import {
  getLeadByIdAction,
  getCatalogTrackingAction,
  getQueueStatusAction,
  getPropertyQueueAction,
} from "@/features/leads/presentation/actions"
import { getPropertyByIdAction, getPropertiesAction } from "@/features/properties/presentation/actions"
import {
  getMessagesByLead,
  getActivitiesByLead,
  getSentPropertiesByLead,
} from "@/lib/data/bot"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lead = await getLeadByIdAction(id)

  if (!lead) {
    notFound()
  }

  const [
    property,
    allProperties,
    messages,
    activities,
    sentProperties,
    catalogTracking,
    queueStatus,
    propertyQueue,
  ] = await Promise.all([
    getPropertyByIdAction(lead.propertyId),
    getPropertiesAction(),
    getMessagesByLead(id),
    getActivitiesByLead(id),
    getSentPropertiesByLead(id),
    getCatalogTrackingAction(id),
    getQueueStatusAction(id),
    getPropertyQueueAction(id),
  ])

  const originSentInfo = sentProperties.find((sp) => sp.propertyId === lead.propertyId)

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
              <BreadcrumbLink href="/dashboard/leads">Leads</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{lead.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <LeadDetailHeader lead={lead} />
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="max-w-2xl">
            <LeadDetailInfo lead={lead} property={property} />
          </div>
          <div>
            <LeadBotTimeline
              leadId={id}
              property={property}
              originSentInfo={originSentInfo}
              catalogTracking={catalogTracking}
              queueStatus={queueStatus}
              initialQueue={propertyQueue}
              allProperties={allProperties}
              leadPropertyId={lead.propertyId}
            />
          </div>
        </div>
        <LeadTimeline
          activities={activities}
          messages={messages}
          leadName={lead.name}
          leadPhone={lead.phone ?? ""}
        />
      </div>
    </>
  )
}
