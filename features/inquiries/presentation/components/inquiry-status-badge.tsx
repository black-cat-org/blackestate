import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  INQUIRY_STATUS_BADGE_CLASSES,
  INQUIRY_STATUS_LABELS,
} from "@/lib/constants/inquiry"
import type { InquiryStatus } from "@/features/inquiries/domain/inquiry.entity"

interface InquiryStatusBadgeProps {
  status: InquiryStatus
  className?: string
}

export function InquiryStatusBadge({
  status,
  className,
}: InquiryStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(INQUIRY_STATUS_BADGE_CLASSES[status], className)}
    >
      {INQUIRY_STATUS_LABELS[status]}
    </Badge>
  )
}
