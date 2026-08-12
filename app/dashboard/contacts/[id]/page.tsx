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
import { ContactDetailHeader } from "@/features/contacts/presentation/components/contact-detail-header"
import { ContactDetailInfo } from "@/features/contacts/presentation/components/contact-detail-info"
import { ContactRelatedTabs } from "@/features/contacts/presentation/components/contact-related-tabs"
import { ContactInquiriesList } from "@/features/contacts/presentation/components/contact-inquiries-list"
import { ContactDealsList } from "@/features/contacts/presentation/components/contact-deals-list"
import { ContactAppointmentsList } from "@/features/contacts/presentation/components/contact-appointments-list"
import { getContactByIdAction } from "@/features/contacts/presentation/actions"
import { getInquiriesByContactAction } from "@/features/inquiries/presentation/actions"
import { getDealsByContactAction } from "@/features/deals/presentation/actions"
import { getAppointmentsByContactAction } from "@/features/appointments/presentation/actions"

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params
  const contact = await getContactByIdAction(id)
  if (!contact) notFound()

  // Single Promise.all over the three related-data fetches so the
  // detail page renders in a single round-trip's worth of latency.
  const [inquiries, deals, appointments] = await Promise.all([
    getInquiriesByContactAction(id),
    getDealsByContactAction(id),
    getAppointmentsByContactAction(id),
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
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard/contacts">Contactos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{contact.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ContactDetailHeader contact={contact} />
        <ContactDetailInfo contact={contact} />
        <ContactRelatedTabs
          inquiriesCount={inquiries.length}
          dealsCount={deals.length}
          appointmentsCount={appointments.length}
          inquiriesSlot={<ContactInquiriesList inquiries={inquiries} />}
          dealsSlot={<ContactDealsList deals={deals} />}
          appointmentsSlot={<ContactAppointmentsList appointments={appointments} />}
        />
      </div>
    </>
  )
}
