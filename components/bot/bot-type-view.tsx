"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  MessageSquare,
  Send,
  Calendar,
  Bot,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getLeadColor } from "@/lib/utils/lead-colors"
import { formatRelativeTime } from "@/lib/utils/relative-time"
import { BOT_ACTIVITY_LABELS, BOT_ACTIVITY_COLORS } from "@/lib/constants/bot"
import type { BotActivity, BotActivityType } from "@/lib/types/bot"

interface BotTypeViewProps {
  activities: BotActivity[]
}

interface Category {
  id: string
  label: string
  icon: React.ElementType
  types: BotActivityType[]
  color: string
}

const CATEGORIES: Category[] = [
  {
    id: "messages",
    label: "Mensajes",
    icon: MessageSquare,
    types: ["message_sent", "message_received"],
    color: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "properties",
    label: "Propiedades",
    icon: Send,
    types: ["property_sent", "property_viewed"],
    color: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "appointments",
    label: "Citas",
    icon: Calendar,
    types: ["appointment_requested", "appointment_confirmed", "appointment_completed", "appointment_cancelled"],
    color: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30",
  },
  {
    id: "system",
    label: "Sistema",
    icon: Bot,
    types: ["lead_created", "reminder_sent"],
    color: "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
  },
]

export function BotTypeView({ activities }: BotTypeViewProps) {
  const router = useRouter()

  const grouped = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: activities
        .filter((a) => cat.types.includes(a.type))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    }))
  }, [activities])

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {grouped.map((cat) => {
        const CatIcon = cat.icon
        return (
          <div key={cat.id} className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <div className={`rounded-md p-1.5 ${cat.color}`}>
                <CatIcon className="size-3.5" />
              </div>
              <h4 className="text-sm font-semibold">{cat.label}</h4>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cat.items.length}</Badge>
            </div>

            {cat.items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-xs text-muted-foreground">Sin actividad</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-0.5">
                  {cat.items.map((activity) => {
                    const leadColor = getLeadColor(activity.leadId)
                    return (
                      <button
                        key={activity.id}
                        type="button"
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
                        onClick={() => router.push(`/dashboard/leads/${activity.leadId}`)}
                      >
                        <span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: leadColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate">{activity.leadName}</span>
                            <Badge className={`text-[9px] px-1 py-0 border-0 shrink-0 ${BOT_ACTIVITY_COLORS[activity.type]}`}>{BOT_ACTIVITY_LABELS[activity.type]}</Badge>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{activity.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )
      })}
    </div>
  )
}
