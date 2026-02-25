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
import { LeadDetailHeader } from "@/components/contacts/lead-detail-header"
import { LeadDetailInfo } from "@/components/contacts/lead-detail-info"
import { LeadSuggestedProperties } from "@/components/contacts/lead-suggested-properties"
import { LeadSentProperties } from "@/components/contacts/lead-sent-properties"
import { LeadTimeline } from "@/components/contacts/lead-timeline"
import { getLeadById, getSuggestedProperties } from "@/lib/data/leads"
import { getPropertyById, getProperties } from "@/lib/data/properties"
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
  const lead = await getLeadById(id)

  if (!lead) {
    notFound()
  }

  const [property, allProperties, messages, activities, sentProperties] = await Promise.all([
    getPropertyById(lead.propertyId),
    getProperties(),
    getMessagesByLead(id),
    getActivitiesByLead(id),
    getSentPropertiesByLead(id),
  ])

  const suggestedProperties = getSuggestedProperties(lead, allProperties)

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
              <BreadcrumbLink href="/dashboard/contacts">Leads</BreadcrumbLink>
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
          <div className="space-y-6">
            <LeadSentProperties
              sentProperties={sentProperties}
              properties={allProperties}
            />
            <LeadSuggestedProperties
              lead={lead}
              suggestedProperties={suggestedProperties}
              allProperties={allProperties}
            />
          </div>
        </div>
        <LeadTimeline
          activities={activities}
          messages={messages}
          leadName={lead.name}
          leadPhone={lead.phone}
        />
      </div>
    </>
  )
}
