import Link from "next/link"
import {
  Building2,
  Calendar,
  CalendarClock,
  CircleDollarSign,
  Mail,
  MapPin,
  MessageCircleQuestion,
  MessageSquare,
  Phone,
  User,
  XCircle,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { DEAL_SOURCE_LABELS } from "@/lib/constants/deal"
import { Badge } from "@/components/ui/badge"
import type { Deal } from "@/features/deals/domain/deal.entity"

const dateTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
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

interface DealDetailInfoProps {
  deal: Deal
}

export function DealDetailInfo({ deal }: DealDetailInfoProps) {
  const hasQualification =
    deal.budget ||
    deal.propertyTypeSought ||
    deal.zoneOfInterest ||
    deal.expectedCloseAt ||
    deal.wantsOffers

  return (
    <div className="space-y-6">
      <InfoSection title="Contacto">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="text-muted-foreground size-4" />
            <Link
              href={`/dashboard/contacts/${deal.contactId}`}
              className="font-medium hover:underline"
            >
              {deal.contactName ?? "—"}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="text-muted-foreground size-4" />
            {deal.contactPhone ? (
              <a href={`tel:${deal.contactPhone}`} className="hover:underline">
                {deal.contactPhone}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-4" />
            {deal.contactEmail ? (
              <a href={`mailto:${deal.contactEmail}`} className="hover:underline">
                {deal.contactEmail}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </InfoSection>

      <Separator />

      <InfoSection title="Propiedad">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="text-muted-foreground size-4" />
          {deal.propertyTitle ? (
            <Link
              href={`/dashboard/properties/${deal.propertyId}`}
              className="font-medium hover:underline"
            >
              {deal.propertyTitle}
            </Link>
          ) : (
            <span className="text-muted-foreground">Propiedad eliminada</span>
          )}
        </div>
      </InfoSection>

      {deal.message && (
        <>
          <Separator />
          <InfoSection title="Nota">
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed whitespace-pre-line">{deal.message}</p>
            </div>
          </InfoSection>
        </>
      )}

      {deal.stage === "lost" && deal.lostReason && (
        <>
          <Separator />
          <InfoSection title="Motivo de pérdida">
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed whitespace-pre-line">
                {deal.lostReason}
              </p>
            </div>
          </InfoSection>
        </>
      )}

      {hasQualification && (
        <>
          <Separator />
          <InfoSection title="Calificación">
            <div className="space-y-2 text-sm">
              {deal.budget && (
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="text-muted-foreground size-4" />
                  <span>
                    <span className="text-muted-foreground">Presupuesto:</span>{" "}
                    {deal.budget}
                  </span>
                </div>
              )}
              {deal.propertyTypeSought && (
                <div className="flex items-center gap-2">
                  <Building2 className="text-muted-foreground size-4" />
                  <span>
                    <span className="text-muted-foreground">Tipo buscado:</span>{" "}
                    {deal.propertyTypeSought}
                  </span>
                </div>
              )}
              {deal.zoneOfInterest && (
                <div className="flex items-center gap-2">
                  <MapPin className="text-muted-foreground size-4" />
                  <span>
                    <span className="text-muted-foreground">Zona:</span>{" "}
                    {deal.zoneOfInterest}
                  </span>
                </div>
              )}
              {deal.expectedCloseAt && (
                <div className="flex items-center gap-2">
                  <CalendarClock className="text-muted-foreground size-4" />
                  <span>
                    <span className="text-muted-foreground">Cierre estimado:</span>{" "}
                    {dateFormatter.format(new Date(deal.expectedCloseAt))}
                  </span>
                </div>
              )}
              {deal.wantsOffers && (
                <div className="text-muted-foreground text-xs">
                  Quiere recibir ofertas similares
                </div>
              )}
            </div>
          </InfoSection>
        </>
      )}

      {deal.inquiryId && (
        <>
          <Separator />
          <InfoSection title="Consulta de origen">
            <Link
              href={`/dashboard/inquiries/${deal.inquiryId}`}
              className="flex items-center gap-2 text-sm font-medium hover:underline"
            >
              <MessageCircleQuestion className="text-muted-foreground size-4" />
              Ver consulta original
            </Link>
          </InfoSection>
        </>
      )}

      <Separator />

      <InfoSection title="Origen y fechas">
        <div className="space-y-2 text-sm">
          {deal.source ? (
            <Badge variant="secondary">{DEAL_SOURCE_LABELS[deal.source]}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">
              Origen no especificado
            </span>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground size-4" />
            <span>
              Creado el {dateTimeFormatter.format(new Date(deal.createdAt))}
            </span>
          </div>
          {deal.closedAt && (
            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground size-4" />
              <span>
                Cerrado el {dateTimeFormatter.format(new Date(deal.closedAt))}
              </span>
            </div>
          )}
        </div>
      </InfoSection>
    </div>
  )
}
