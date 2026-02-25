"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BotConfigPanel } from "@/components/bot/bot-config-panel"
import { BotActivityLog } from "@/components/bot/bot-activity-log"
import { Settings, Activity } from "lucide-react"
import type { BotConfig, BotActivity } from "@/lib/types/bot"

interface BotViewProps {
  config: BotConfig
  activities: BotActivity[]
}

export function BotView({ config, activities }: BotViewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mi Bot</h2>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="size-3.5" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="size-3.5" />
            Actividad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <BotConfigPanel config={config} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <BotActivityLog activities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
