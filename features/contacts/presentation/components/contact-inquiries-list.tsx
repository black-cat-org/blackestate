import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  INQUIRY_STATUS_BADGE_CLASSES,
  INQUIRY_STATUS_LABELS,
  INQUIRY_SOURCE_LABELS,
} from "@/lib/constants/inquiry"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

interface ContactInquiriesListProps {
  inquiries: Inquiry[]
}

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function ContactInquiriesList({ inquiries }: ContactInquiriesListProps) {
  if (inquiries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Este contacto no tiene consultas registradas.
      </p>
    )
  }

  return (
    <ul className="divide-y rounded-md border">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id} className="p-3">
          <Link
            href={`/dashboard/inquiries/${inquiry.id}`}
            className="flex items-center justify-between gap-3 hover:opacity-80"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={INQUIRY_STATUS_BADGE_CLASSES[inquiry.status]}
                >
                  {INQUIRY_STATUS_LABELS[inquiry.status]}
                </Badge>
                {inquiry.source && (
                  <span className="text-xs text-muted-foreground">
                    {INQUIRY_SOURCE_LABELS[inquiry.source]}
                  </span>
                )}
              </div>
              {inquiry.message && (
                <p className="mt-1 truncate text-sm">{inquiry.message}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {dateFormatter.format(new Date(inquiry.createdAt))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
