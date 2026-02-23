import Link from "next/link"
import { Phone, Mail, Building2, MessageSquare, Calendar, Bell } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { Lead } from "@/lib/types/lead"
import type { Property } from "@/lib/types/property"

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  )
}

export function LeadDetailInfo({
  lead,
  property,
}: {
  lead: Lead
  property?: Property
}) {
  return (
    <div className="space-y-6">
      <InfoSection title="Datos de contacto">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" />
            <a href={`tel:${lead.phone}`} className="hover:underline">
              {lead.phone}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <a href={`mailto:${lead.email}`} className="hover:underline">
              {lead.email}
            </a>
          </div>
        </div>
      </InfoSection>

      <Separator />

      {property && (
        <>
          <InfoSection title="Propiedad de interés">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 text-muted-foreground" />
              <Link
                href={`/dashboard/properties/${property.id}`}
                className="font-medium hover:underline"
              >
                {property.title}
              </Link>
            </div>
          </InfoSection>
          <Separator />
        </>
      )}

      {lead.message && (
        <>
          <InfoSection title="Mensaje">
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="mt-0.5 size-4 text-muted-foreground shrink-0" />
              <p className="leading-relaxed">{lead.message}</p>
            </div>
          </InfoSection>
          <Separator />
        </>
      )}

      {(lead.propertyTypeSought || lead.budget || lead.zoneOfInterest) && (
        <>
          <InfoSection title="Preferencias">
            <div className="space-y-2 text-sm">
              {lead.propertyTypeSought && (
                <div>
                  <span className="text-muted-foreground">Tipo buscado:</span>{" "}
                  {lead.propertyTypeSought}
                </div>
              )}
              {lead.budget && (
                <div>
                  <span className="text-muted-foreground">Presupuesto:</span>{" "}
                  {lead.budget}
                </div>
              )}
              {lead.zoneOfInterest && (
                <div>
                  <span className="text-muted-foreground">Zona:</span>{" "}
                  {lead.zoneOfInterest}
                </div>
              )}
            </div>
          </InfoSection>
          <Separator />
        </>
      )}

      <InfoSection title="Otros">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <span>Recibir ofertas: {lead.wantsOffers ? "Sí" : "No"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <span>
              Fecha de contacto:{" "}
              {new Date(lead.createdAt).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </InfoSection>
    </div>
  )
}
