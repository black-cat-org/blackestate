import { cn } from "@/lib/utils"
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/constants/lead"
import type { LeadStatus } from "@/lib/types/lead"

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        LEAD_STATUS_COLORS[status]
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  )
}
