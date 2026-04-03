"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import {
  Home,
  ListOrdered,
  CheckCircle2,
  Clock,
  Play,
  CalendarClock,
  MessageSquare,
  BookOpen,
  Plus,
  ImageIcon,
  Bot,
  Trophy,
  XCircle,
  Ban,
  Settings2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils/format"
import { formatRelativeTime } from "@/lib/utils/relative-time"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { LeadPropertyQueueItem } from "./lead-property-queue-item"
import { AddPropertyDialog } from "./add-property-dialog"
import {
  reorderQueue,
  sendQueueItemNow,
  removeFromQueue,
  addToQueue,
} from "@/lib/data/leads"
import { toast } from "sonner"
import type { Property } from "@/lib/types/property"
import type { SentProperty } from "@/lib/types/bot"
import type { CatalogTracking, QueueStatus, QueueStatusId, PropertyQueueItem } from "@/lib/types/lead"

// ─── Queue status config ───────────────────────────────────

const queueStatusConfig: Record<QueueStatusId, {
  label: string
  icon: React.ElementType
  color: string
  configLink?: string
  configLabel?: string
}> = {
  en_espera: {
    label: "En espera",
    icon: Clock,
    color: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/40",
    configLink: "/dashboard/settings",
    configLabel: "Configurar tiempo de espera",
  },
  activa: {
    label: "Activa — envío cada 24h",
    icon: Play,
    color: "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/40",
    configLink: "/dashboard/settings",
    configLabel: "Configurar cadencia",
  },
  pausada_conversacion: {
    label: "Pausada — conversación activa",
    icon: MessageSquare,
    color: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40",
    configLink: "/dashboard/settings",
    configLabel: "Configurar tiempo de inactividad",
  },
  pausada_cita: {
    label: "Pausada — cita pendiente",
    icon: CalendarClock,
    color: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/40",
  },
  inactiva_catalogo: {
    label: "Pausada — cliente abrió el catálogo",
    icon: BookOpen,
    color: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/40",
  },
  inactiva_cita_completada: {
    label: "Inactiva — cita completada",
    icon: CheckCircle2,
    color: "text-muted-foreground bg-muted/50 border-border",
  },
  inactiva_ganado: {
    label: "Inactiva — lead ganado",
    icon: Trophy,
    color: "text-muted-foreground bg-muted/50 border-border",
  },
  inactiva_perdido: {
    label: "Inactiva — lead perdido",
    icon: XCircle,
    color: "text-muted-foreground bg-muted/50 border-border",
  },
  inactiva_descartado: {
    label: "Inactiva — lead descartado",
    icon: Ban,
    color: "text-muted-foreground bg-muted/50 border-border",
  },
}

// ─── Props ─────────────────────────────────────────────────

interface LeadBotTimelineProps {
  leadId: string
  property?: Property
  originSentInfo?: SentProperty
  catalogTracking: CatalogTracking
  queueStatus: QueueStatus
  initialQueue: PropertyQueueItem[]
  allProperties: Property[]
  leadPropertyId: string
}

// ─── Component ─────────────────────────────────────────────

export function LeadBotTimeline({
  leadId,
  property,
  originSentInfo,
  catalogTracking,
  queueStatus,
  initialQueue,
  allProperties,
  leadPropertyId,
}: LeadBotTimelineProps) {
  const [queue, setQueue] = useState(initialQueue)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const statusId = queueStatus.status
  const statusCfg = queueStatusConfig[statusId]
  const StatusIcon = statusCfg.icon
  const isTerminal = statusId === "inactiva_perdido" || statusId === "inactiva_descartado"
  const dimmed = isTerminal

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = queue.findIndex((q) => q.id === active.id)
    const newIndex = queue.findIndex((q) => q.id === over.id)
    const reordered = arrayMove(queue, oldIndex, newIndex)
    setQueue(reordered)
    await reorderQueue(leadId, reordered.map((q) => q.id))
  }, [queue, leadId])

  const handleSendNow = async (queueItemId: string) => {
    try {
      const updated = await sendQueueItemNow(leadId, queueItemId)
      setQueue((prev) => prev.map((q) => (q.id === queueItemId ? updated : q)))
      toast.success("Propiedad enviada")
    } catch {
      toast.error("Error al enviar")
    }
  }

  const handleRemove = async (queueItemId: string) => {
    try {
      await removeFromQueue(leadId, queueItemId)
      setQueue((prev) => prev.filter((q) => q.id !== queueItemId))
      toast.success("Propiedad removida de la cola")
    } catch {
      toast.error("Error al remover")
    }
  }

  const handleAddProperty = async (p: Property) => {
    if (queue.some((q) => q.propertyId === p.id)) {
      toast.warning("Esta propiedad ya está en la cola")
      return
    }
    try {
      const item = await addToQueue(leadId, p.id, p.title)
      setQueue((prev) => [...prev, item])
      toast.success("Propiedad agregada a la cola")
    } catch {
      toast.error("Error al agregar")
    }
  }

  const queuedPropertyIds = new Set(queue.map((q) => q.propertyId))
  const sentPropertyIds = new Set(queue.filter((q) => q.status === "enviada").map((q) => q.propertyId))
  const availableProperties = allProperties.filter(
    (p) => p.id !== leadPropertyId
  )

  return (
    <div className={`space-y-4 ${dimmed ? "opacity-50" : ""}`}>
      <h3 className="text-sm font-semibold">Flujo del bot</h3>

      {/* ── Section 1: Origin property ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Home className="size-4 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Propiedad de origen</h4>
        </div>

        {property ? (
          <div className="space-y-2">
            <Link href={`/dashboard/properties/${property.id}`} className="flex gap-3 rounded-lg border p-2 transition-colors hover:bg-accent/50">
              <div className="relative size-14 shrink-0 overflow-hidden rounded bg-muted">
                {property.media.photos[0] ? (
                  <Image src={property.media.photos[0]} alt={property.title} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium">{property.title}</p>
                <p className="text-xs font-semibold text-primary">{formatPrice(property.price)}</p>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">{PROPERTY_TYPE_LABELS[property.type]}</Badge>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">{OPERATION_TYPE_LABELS[property.operationType]}</Badge>
                </div>
              </div>
            </Link>

            {originSentInfo && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Bot className="size-3" />
                <span>Enviado por el bot · {formatRelativeTime(originSentInfo.sentAt)}</span>
              </div>
            )}

          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Propiedad no disponible</p>
        )}
      </div>

      {/* ── Section 2: Catalog tracking ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catálogo</h4>
        </div>

        {catalogTracking.openedAt ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/60 p-2.5 dark:border-green-900/40 dark:bg-green-950/20">
            <CheckCircle2 className="size-4 text-green-600 shrink-0" />
            <div>
              <p className="text-xs font-medium text-green-700 dark:text-green-400">Cliente abrió el catálogo</p>
              <p className="text-[11px] text-muted-foreground">{formatRelativeTime(catalogTracking.openedAt)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50/40 p-2.5 dark:border-yellow-900/40 dark:bg-yellow-950/20">
            <Clock className="size-4 text-yellow-600 shrink-0" />
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Catálogo no abierto</p>
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* ── Section 2: Property queue ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cola de propiedades</h4>
        </div>

        {/* Queue items with inline status badge */}
        {queue.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay propiedades en la cola.</p>
        ) : (
          <div className="space-y-1.5">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={queue.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {queue.map((item, index) => {
                  const prevItem = index > 0 ? queue[index - 1] : null
                  const showStatusBadge =
                    item.status !== "enviada" &&
                    (index === 0 || prevItem?.status === "enviada")

                  return (
                    <div key={item.id}>
                      {showStatusBadge && (
                        <div className={`mb-1.5 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 ${statusCfg.color}`}>
                          <StatusIcon className="size-3" />
                          <span className="text-[11px] font-medium">{statusCfg.label}</span>
                          {statusCfg.configLink && (
                            <Link href={statusCfg.configLink} className="ml-auto inline-flex items-center gap-0.5 text-[10px] opacity-70 hover:opacity-100">
                              <Settings2 className="size-2.5" />
                              {statusCfg.configLabel}
                            </Link>
                          )}
                        </div>
                      )}
                      <LeadPropertyQueueItem
                        item={item}
                        onSendNow={handleSendNow}
                        onRemove={handleRemove}
                        actionsDisabled={isTerminal}
                      />
                    </div>
                  )
                })}
              </SortableContext>
            </DndContext>

            {/* If all items are sent, show status at the end */}
            {queue.every((q) => q.status === "enviada") && (
              <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 ${statusCfg.color}`}>
                <StatusIcon className="size-3" />
                <span className="text-[11px] font-medium">{statusCfg.label}</span>
                {statusCfg.configLink && (
                  <Link href={statusCfg.configLink} className="ml-auto inline-flex items-center gap-0.5 text-[10px] opacity-70 hover:opacity-100">
                    <Settings2 className="size-2.5" />
                    {statusCfg.configLabel}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add button — hidden for terminal states */}
        {!isTerminal && (
          <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-1 size-3" />
            Agregar propiedad
          </Button>
        )}

        <AddPropertyDialog
          title="Agregar propiedad a la cola"
          properties={availableProperties}
          queuedPropertyIds={queuedPropertyIds}
          sentPropertyIds={sentPropertyIds}
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAdd={handleAddProperty}
        />
      </div>
    </div>
  )
}
