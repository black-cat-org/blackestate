"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Settings, Users, Layers, Clock, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BOT_ACTIVITY_LABELS } from "@/lib/constants/bot"
import { BotStats } from "@/features/bot/presentation/components/bot-stats"
import { BotLeadsView } from "@/features/bot/presentation/components/bot-leads-view"
import { BotTypeView } from "@/features/bot/presentation/components/bot-type-view"
import { BotActivityLog } from "@/features/bot/presentation/components/bot-activity-log"
import type { BotActivity, BotMessage } from "@/features/bot/domain/bot.entity"

interface BotViewProps {
  activities: BotActivity[]
  messages: BotMessage[]
}

type ViewMode = "leads" | "tipo" | "cronologico"

const CATEGORY_TYPES: Record<string, string[]> = {
  messages: ["message_sent", "message_received"],
  properties: ["property_sent", "property_viewed"],
  appointments: ["appointment_requested", "appointment_confirmed", "appointment_completed", "appointment_cancelled"],
  system: ["lead_created", "reminder_sent"],
}


export function BotView({ activities, messages }: BotViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("leads")
  const [search, setSearch] = useState("")
  const [timeRange, setTimeRange] = useState("all")
  const [category, setCategory] = useState("all")
  const [activityType, setActivityType] = useState("all")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const now = new Date()

    return activities.filter((a) => {
      if (q && !a.leadName.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false

      if (timeRange !== "all") {
        const ts = new Date(a.timestamp)
        const diffH = (now.getTime() - ts.getTime()) / 3600000
        if (timeRange === "24h" && diffH > 24) return false
        if (timeRange === "7d" && diffH > 168) return false
      }

      if (category !== "all") {
        const types = CATEGORY_TYPES[category]
        if (types && !types.includes(a.type)) return false
      }

      if (activityType !== "all" && a.type !== activityType) return false

      return true
    })
  }, [activities, search, timeRange, category, activityType])

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* KPIs */}
      <BotStats activities={activities} />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Tiempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="messages">Mensajes</SelectItem>
              <SelectItem value="properties">Propiedades</SelectItem>
              <SelectItem value="appointments">Citas</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-auto min-w-[160px]">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(BOT_ACTIVITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 rounded-lg border p-1 w-fit">
        <Button
          variant={viewMode === "leads" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2.5"
          onClick={() => setViewMode("leads")}
        >
          <Users className="size-3.5 mr-1" />
          Por Lead
        </Button>
        <Button
          variant={viewMode === "tipo" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2.5"
          onClick={() => setViewMode("tipo")}
        >
          <Layers className="size-3.5 mr-1" />
          Por Tipo
        </Button>
        <Button
          variant={viewMode === "cronologico" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2.5"
          onClick={() => setViewMode("cronologico")}
        >
          <Clock className="size-3.5 mr-1" />
          Cronológico
        </Button>
      </div>

      {/* View content */}
      {viewMode === "leads" && <BotLeadsView activities={filtered} messages={messages} />}
      {viewMode === "tipo" && <BotTypeView activities={filtered} />}
      {viewMode === "cronologico" && <BotActivityLog activities={filtered} />}
    </div>
  )
}
