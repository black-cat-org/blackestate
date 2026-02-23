import { SOURCE_LABELS, type LeadSource, VALID_SOURCES } from "@/lib/constants/sources"

export function LeadSourceBadge({ source }: { source: string | null }) {
  if (!source) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  const label = (VALID_SOURCES as readonly string[]).includes(source)
    ? SOURCE_LABELS[source as LeadSource]
    : source

  return (
    <span className="bg-muted inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
      {label}
    </span>
  )
}
