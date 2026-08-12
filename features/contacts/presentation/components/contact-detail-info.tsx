import { Phone, Mail, Tag, Calendar, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Contact } from "@/features/contacts/domain/contact.entity"

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

interface ContactDetailInfoProps {
  contact: Contact
}

export function ContactDetailInfo({ contact }: ContactDetailInfoProps) {
  return (
    <div className="space-y-6">
      <InfoSection title="Datos de contacto">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="text-muted-foreground size-4" />
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="hover:underline">
                {contact.phone}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-4" />
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="hover:underline">
                {contact.email}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </InfoSection>

      {contact.tags.length > 0 && (
        <>
          <Separator />
          <InfoSection title="Etiquetas">
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="gap-1">
                  <Tag className="size-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </InfoSection>
        </>
      )}

      {contact.notes && (
        <>
          <Separator />
          <InfoSection title="Notas">
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed whitespace-pre-line">{contact.notes}</p>
            </div>
          </InfoSection>
        </>
      )}

      <Separator />

      <InfoSection title="Historial">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground size-4" />
            <span>
              Creado el {dateTimeFormatter.format(new Date(contact.createdAt))}
            </span>
          </div>
          {contact.lastInquiryAt && (
            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground size-4" />
              <span>
                Última consulta:{" "}
                {dateTimeFormatter.format(new Date(contact.lastInquiryAt))}
              </span>
            </div>
          )}
        </div>
      </InfoSection>
    </div>
  )
}
