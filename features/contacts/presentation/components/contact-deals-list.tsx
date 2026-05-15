import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  DEAL_STAGE_BADGE_CLASSES,
  DEAL_STAGE_LABELS,
  DEAL_SOURCE_LABELS,
} from "@/lib/constants/deal"
import type { Deal } from "@/features/deals/domain/deal.entity"

interface ContactDealsListProps {
  deals: Deal[]
}

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function ContactDealsList({ deals }: ContactDealsListProps) {
  if (deals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Este contacto no tiene negocios registrados.
      </p>
    )
  }

  return (
    <ul className="divide-y rounded-md border">
      {deals.map((deal) => (
        <li key={deal.id} className="p-3">
          <Link
            href={`/dashboard/deals/${deal.id}`}
            className="flex items-center justify-between gap-3 hover:opacity-80"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={DEAL_STAGE_BADGE_CLASSES[deal.stage]}
                >
                  {DEAL_STAGE_LABELS[deal.stage]}
                </Badge>
                {deal.source && (
                  <span className="text-xs text-muted-foreground">
                    {DEAL_SOURCE_LABELS[deal.source]}
                  </span>
                )}
              </div>
              {deal.message && (
                <p className="mt-1 truncate text-sm">{deal.message}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {dateFormatter.format(new Date(deal.createdAt))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
