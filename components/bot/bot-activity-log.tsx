"use client"

import { useState, useMemo } from "react"
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
  Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BOT_ACTIVITY_LABELS } from "@/lib/constants/bot"
import type { BotActivity, BotActivityType } from "@/lib/types/bot"

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

const ACTIVITY_TYPES = Object.keys(BOT_ACTIVITY_LABELS) as BotActivityType[]

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Justo ahora"
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) {
    return `Ayer a las ${date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
  }
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

interface BotActivityLogProps {
  activities: BotActivity[]
}

export function BotActivityLog({ activities }: BotActivityLogProps) {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = useMemo(() => {
    let result = activities
    if (typeFilter !== "all") {
      result = result.filter((a) => a.type === typeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.leadName.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [activities, typeFilter, searchQuery])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[200px]">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {BOT_ACTIVITY_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Bot className="mx-auto size-8 text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground text-sm">No se encontró actividad.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map((activity, index) => {
            const Icon = ICON_MAP[activity.type]
            const isLast = index === filtered.length - 1

            return (
              <div
                key={activity.id}
                className="flex gap-3 pb-6 relative cursor-pointer hover:bg-accent/30 rounded-lg -mx-2 px-2 transition-colors"
                onClick={() => router.push(`/dashboard/contacts/${activity.leadId}`)}
              >
                {!isLast && (
                  <div className="absolute left-[23px] top-8 bottom-0 w-px bg-border" />
                )}
                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 z-10">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 pt-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">{activity.leadName}</span>
                  </div>
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
