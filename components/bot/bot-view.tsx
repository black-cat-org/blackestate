"use client"

import Link from "next/link"
import { BotActivityLog } from "@/components/bot/bot-activity-log"
import { Settings } from "lucide-react"
import type { BotActivity } from "@/lib/types/bot"

interface BotViewProps {
  activities: BotActivity[]
}

export function BotView({ activities }: BotViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Actividad del Bot</h2>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="size-3.5" />
          Configuración del bot
        </Link>
      </div>

      <BotActivityLog activities={activities} />
    </div>
  )
}
