"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Send,
  MessageSquare,
  Bot,
  CalendarPlus,
  CalendarCheck,
  CheckCircle,
  CalendarX,
  Bell,
  Eye,
  UserPlus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getLeadColor } from "@/lib/utils/lead-colors"
import { formatCalendarTime } from "@/lib/utils/relative-time"
import { BOT_ACTIVITY_LABELS, BOT_ACTIVITY_COLORS } from "@/lib/constants/bot"
import type { BotActivity, BotActivityType } from "@/features/bot/domain/bot.entity"

const ICON_MAP: Record<BotActivityType, React.ComponentType<{ className?: string }>> = {
  property_sent: Send,
  message_received: MessageSquare,
  message_sent: Bot,
  appointment_requested: CalendarPlus,
  appointment_confirmed: CalendarCheck,
  appointment_completed: CheckCircle,
  appointment_cancelled: CalendarX,
  reminder_sent: Bell,
  property_viewed: Eye,
  lead_created: UserPlus,
}

interface BotActivityLogProps {
  activities: BotActivity[]
}

function getDateGroup(timestamp: string): string {
  return timestamp.slice(0, 10)
}

export function BotActivityLog({ activities }: BotActivityLogProps) {
  const router = useRouter()

  const grouped = useMemo(() => {
    const map = new Map<string, BotActivity[]>()
    for (const a of activities) {
      const key = getDateGroup(a.timestamp)
      const arr = map.get(key) || []
      arr.push(a)
      map.set(key, arr)
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [activities])

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Bot className="mx-auto size-8 text-muted-foreground/50 mb-2" />
        <p className="text-muted-foreground text-sm">No se encontró actividad.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {grouped.map(([dateKey, items]) => (
        <div key={dateKey} className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground capitalize sticky top-0 bg-background py-1">
            {formatCalendarTime(dateKey + "T12:00:00")}
          </p>
          <div className="space-y-0.5">
            {items.map((activity) => {
              const Icon = ICON_MAP[activity.type]
              const leadColor = getLeadColor(activity.leadId)

              return (
                <button
                  key={activity.id}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/50"
                  onClick={() => router.push(`/dashboard/leads/${activity.leadId}`)}
                >
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="size-3.5" />
                  </div>
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: leadColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{activity.leadName}</span>
                      <Badge className={`text-[9px] px-1 py-0 border-0 ${BOT_ACTIVITY_COLORS[activity.type]}`}>{BOT_ACTIVITY_LABELS[activity.type]}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{activity.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
