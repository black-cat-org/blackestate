import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Visual tone for the small role/status badge used across team UI.
 * Four presets keep visual standards consistent platform-wide:
 *   - owner     → primary fill (filled, emphasises the special role)
 *   - member    → outline (admins + agents, neutral peer role)
 *   - rejected  → destructive fill (mirrors owner shape, red colour)
 *   - expired   → secondary fill (mirrors owner/rejected shape, grey
 *                 — passive timeout, not an active rejection)
 *
 * Sizing overrides keep all four tones at the same outer dimensions:
 *   - `text-[10px]` smaller than the default `text-xs` because these
 *     badges sit inline next to names.
 *   - `px-1.5 py-0 leading-none` strip the default `py-0.5` vertical
 *     padding and collapse the line-box.
 *   - `h-[18px] box-border` lock the outer height so the 1px border
 *     (transparent on filled variants, visible on outline) does NOT
 *     shift layout between tones.
 */
export type RoleBadgeTone = "owner" | "member" | "rejected" | "expired"

interface RoleBadgeProps {
  tone: RoleBadgeTone
  children: React.ReactNode
  className?: string
}

const TONE_VARIANT: Record<
  RoleBadgeTone,
  "default" | "outline" | "destructive" | "secondary"
> = {
  owner: "default",
  member: "outline",
  rejected: "destructive",
  expired: "secondary",
}

export function RoleBadge({ tone, children, className }: RoleBadgeProps) {
  return (
    <Badge
      variant={TONE_VARIANT[tone]}
      className={cn(
        "shrink-0 h-[18px] box-border text-[10px] px-1.5 py-0 leading-none",
        className,
      )}
    >
      {children}
    </Badge>
  )
}
