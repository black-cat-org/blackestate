"use client"

import { MessageSquare, Send, BookOpen, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { BotActivity } from "@/features/bot/domain/bot.entity"

interface BotStatsProps {
  activities: BotActivity[]
}

interface StatItem {
  label: string
  value: number
  icon: React.ElementType
}

export function BotStats({ activities }: BotStatsProps) {
  const today = new Date().toISOString().slice(0, 10)

  const todayActivities = activities.filter((a) => a.timestamp.startsWith(today))

  const stats: StatItem[] = [
    {
      label: "Leads activos",
      value: new Set(activities.map((a) => a.leadId)).size,
      icon: Users,
    },
    {
      label: "Mensajes hoy",
      value: todayActivities.filter(
        (a) => a.type === "message_sent" || a.type === "message_received"
      ).length,
      icon: MessageSquare,
    },
    {
      label: "Propiedades enviadas hoy",
      value: todayActivities.filter((a) => a.type === "property_sent").length,
      icon: Send,
    },
    {
      label: "Propiedades vistas",
      value: activities.filter((a) => a.type === "property_viewed").length,
      icon: BookOpen,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="gap-0 py-0">
          <CardContent className="flex items-center gap-3 p-3!">
            <div className="rounded-md bg-muted p-2">
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
