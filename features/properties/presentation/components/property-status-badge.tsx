import { cn } from "@/lib/utils"
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUS_COLORS } from "@/lib/constants/property"
import type { PropertyStatus } from "@/lib/types/property"

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        PROPERTY_STATUS_COLORS[status]
      )}
    >
      {PROPERTY_STATUS_LABELS[status]}
    </span>
  )
}
