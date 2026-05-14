import { Badge } from "@/components/ui/badge"
import { INQUIRY_SOURCE_LABELS } from "@/lib/constants/inquiry"
import type { InquirySource } from "@/features/inquiries/domain/inquiry.entity"

interface InquirySourceBadgeProps {
  source: InquirySource
  className?: string
}

export function InquirySourceBadge({
  source,
  className,
}: InquirySourceBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      {INQUIRY_SOURCE_LABELS[source]}
    </Badge>
  )
}
