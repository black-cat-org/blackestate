"use client"

import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { LeadChatDialog } from "@/features/leads/presentation/components/lead-chat-dialog"
import { BOT_ACTIVITY_LABELS } from "@/lib/constants/bot"
import type { BotActivity, BotActivityType, BotMessage } from "@/features/bot/domain/bot.entity"
import { formatRelativeTime } from "@/lib/utils/relative-time"

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

interface LeadTimelineProps {
  activities: BotActivity[]
  messages: BotMessage[]
  leadName: string
  leadPhone?: string
}

export function LeadTimeline({ activities, messages, leadName, leadPhone }: LeadTimelineProps) {
  const [chatOpen, setChatOpen] = useState(false)

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Bot className="mx-auto size-8 text-muted-foreground/50 mb-2" />
        <p className="text-muted-foreground text-sm">No hay actividad registrada aún.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MessageSquare className="size-4" />
        Actividad del bot
      </h3>

      <div className="space-y-0">
        {activities.map((activity, index) => {
          const Icon = ICON_MAP[activity.type]
          const isLast = index === activities.length - 1

          return (
            <div key={activity.id} className="flex gap-3 pb-6 relative">
              {!isLast && (
                <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
              )}
              <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 z-10">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-sm">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {messages.length > 0 && (
        <>
          <Button variant="outline" size="sm" onClick={() => setChatOpen(true)}>
            <MessageSquare className="size-3.5" />
            Ver conversación completa
          </Button>
          <LeadChatDialog
            open={chatOpen}
            onOpenChange={setChatOpen}
            messages={messages}
            leadName={leadName}
            leadPhone={leadPhone}
          />
        </>
      )}
    </div>
  )
}
