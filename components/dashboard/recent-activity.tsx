"use client"

import Link from "next/link"
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
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
}

interface RecentActivityProps {
  activities: BotActivity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Bot className="mx-auto size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((activity, index) => {
              const Icon = ICON_MAP[activity.type]
              const isLast = index === activities.length - 1

              return (
                <div
                  key={activity.id}
                  className="flex gap-3 pb-4 relative cursor-pointer hover:bg-accent/30 rounded-lg -mx-2 px-2 transition-colors"
                  onClick={() => router.push(`/dashboard/leads/${activity.leadId}`)}
                >
                  {!isLast && (
                    <div className="absolute left-[23px] top-7 bottom-0 w-px bg-border" />
                  )}
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 z-10">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 pt-0.5 flex-1">
                    <p className="text-xs leading-relaxed line-clamp-2">{activity.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
            <Link
              href="/dashboard/bot"
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              Ver toda la actividad <ArrowRight className="size-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
