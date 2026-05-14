import Link from "next/link"
import {
  Building2,
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  User,
  XCircle,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { DEAL_STAGE_LABELS } from "@/lib/constants/deal"
import { InquirySourceBadge } from "./inquiry-source-badge"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

const dateTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function InfoSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  )
}

interface InquiryDetailInfoProps {
  inquiry: Inquiry
}

export function InquiryDetailInfo({ inquiry }: InquiryDetailInfoProps) {
  return (
    <div className="space-y-6">
      <InfoSection title="Contacto">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="text-muted-foreground size-4" />
            <Link
              href={`/dashboard/contacts/${inquiry.contactId}`}
              className="font-medium hover:underline"
            >
              {inquiry.contactName ?? "—"}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="text-muted-foreground size-4" />
            {inquiry.contactPhone ? (
              <a href={`tel:${inquiry.contactPhone}`} className="hover:underline">
                {inquiry.contactPhone}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-4" />
            {inquiry.contactEmail ? (
              <a href={`mailto:${inquiry.contactEmail}`} className="hover:underline">
                {inquiry.contactEmail}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </InfoSection>

      <Separator />

      <InfoSection title="Propiedad de interés">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="text-muted-foreground size-4" />
          {inquiry.propertyTitle ? (
            <Link
              href={`/dashboard/properties/${inquiry.propertyId}`}
              className="font-medium hover:underline"
            >
              {inquiry.propertyTitle}
            </Link>
          ) : (
            <span className="text-muted-foreground">Propiedad eliminada</span>
          )}
        </div>
      </InfoSection>

      {inquiry.message && (
        <>
          <Separator />
          <InfoSection title="Mensaje">
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed whitespace-pre-line">{inquiry.message}</p>
            </div>
          </InfoSection>
        </>
      )}

      {inquiry.status === "discarded" && inquiry.discardedReason && (
        <>
          <Separator />
          <InfoSection title="Motivo de descarte">
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed whitespace-pre-line">
                {inquiry.discardedReason}
              </p>
            </div>
          </InfoSection>
        </>
      )}

      {inquiry.status === "promoted" && inquiry.promotedDealId && (
        <>
          <Separator />
          <InfoSection title="Negocio asociado">
            <Link
              href={`/dashboard/deals/${inquiry.promotedDealId}`}
              className="text-sm font-medium hover:underline"
            >
              Ver negocio
              {inquiry.promotedDealStage && (
                <span className="text-muted-foreground ml-2 font-normal">
                  · {DEAL_STAGE_LABELS[inquiry.promotedDealStage]}
                </span>
              )}
            </Link>
          </InfoSection>
        </>
      )}

      <Separator />

      <InfoSection title="Origen y fecha">
        <div className="space-y-2 text-sm">
          {inquiry.source ? (
            <InquirySourceBadge source={inquiry.source} />
          ) : (
            <span className="text-muted-foreground text-xs">Origen no especificado</span>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground size-4" />
            <span>
              Creada el {dateTimeFormatter.format(new Date(inquiry.createdAt))}
            </span>
          </div>
        </div>
      </InfoSection>
    </div>
  )
}
