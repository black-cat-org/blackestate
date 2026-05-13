import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Visual tone for the small role/status badge used across team UI.
 * Three presets keep visual standards consistent platform-wide:
 *   - owner     → primary fill (filled, emphasises the special role)
 *   - member    → outline (admins + agents, neutral peer role)
 *   - rejected  → destructive fill (mirrors owner shape, red colour)
 *
 * Sizing intentionally smaller than the default shadcn Badge (text-[10px],
 * px-1.5, py-0, leading-normal) because these badges sit inline next to
 * names where the default size visually competes with the text.
 */
export type RoleBadgeTone = "owner" | "member" | "rejected"

interface RoleBadgeProps {
  tone: RoleBadgeTone
  children: React.ReactNode
  className?: string
}

const TONE_VARIANT: Record<RoleBadgeTone, "default" | "outline" | "destructive"> = {
  owner: "default",
  member: "outline",
  rejected: "destructive",
}

export function RoleBadge({ tone, children, className }: RoleBadgeProps) {
  return (
    <Badge
      variant={TONE_VARIANT[tone]}
      className={cn("shrink-0 text-[10px] px-1.5 py-0 leading-normal", className)}
    >
      {children}
    </Badge>
  )
}
