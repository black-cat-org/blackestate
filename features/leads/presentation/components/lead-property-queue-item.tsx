"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Send, Trash2, Clock, CheckCircle2, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatRelativeTime } from "@/lib/utils/relative-time"
import type { PropertyQueueItem } from "@/features/leads/domain/lead.entity"

interface LeadPropertyQueueItemProps {
  item: PropertyQueueItem
  onSendNow: (id: string) => void
  onRemove: (id: string) => void
  actionsDisabled?: boolean
}

const statusConfig = {
  pending: { label: "Pendiente", icon: Clock, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  sent: { label: "Enviada", icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  paused: { label: "Pausada", icon: Pause, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
}

export function LeadPropertyQueueItem({ item, onSendNow, onRemove, actionsDisabled }: LeadPropertyQueueItemProps) {
  const isSent = item.status === "sent"
  const draggable = !isSent
  const showActions = !isSent && !actionsDisabled

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !draggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const config = statusConfig[item.status]
  const StatusIcon = config.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border p-2.5 ${isSent ? "bg-muted/30" : "bg-card"} ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      {draggable ? (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <div className="w-4" />
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSent ? "text-muted-foreground" : ""}`}>{item.propertyTitle}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
            <StatusIcon className="mr-0.5 size-2.5" />
            {config.label}
          </Badge>
          {item.status === "pending" && item.estimatedSendAt && (
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(item.estimatedSendAt)}
            </span>
          )}
          {item.status === "sent" && item.sentAt && (
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(item.sentAt)}
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onSendNow(item.id)}
          >
            <Send className="mr-1 size-3" />
            Enviar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="mr-1 size-3" />
            Quitar
          </Button>
        </div>
      )}
    </div>
  )
}
