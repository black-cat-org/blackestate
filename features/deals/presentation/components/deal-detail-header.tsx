"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  deleteDealAction,
  moveDealStageAction,
} from "@/features/deals/presentation/actions"
import {
  describeDealDeleteError,
  describeDealMoveStageError,
} from "@/features/deals/presentation/deal-error-messages"
import { DEAL_STAGE_LABELS } from "@/lib/constants/deal"
import {
  TERMINAL_DEAL_STAGES,
  type Deal,
  type DealStage,
} from "@/features/deals/domain/deal.entity"
import { DealEditDialog } from "./deal-edit-dialog"
import { DealStageBadge } from "./deal-stage-badge"
import { LostDealDialog } from "./lost-deal-dialog"

interface DealDetailHeaderProps {
  deal: Deal
}

const ACTIVE_STAGES: DealStage[] = [
  "visit_scheduled",
  "negotiation",
  "reserved",
]

export function DealDetailHeader({ deal }: DealDetailHeaderProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [wonConfirmOpen, setWonConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isTerminal = TERMINAL_DEAL_STAGES.includes(deal.stage)

  const title = [deal.contactName, deal.propertyTitle]
    .filter(Boolean)
    .join(" · ") || "Negocio"

  const handleMoveStage = (toStage: DealStage) => {
    startTransition(async () => {
      try {
        await moveDealStageAction(deal.id, { toStage })
        toast.success(`Etapa actualizada a "${DEAL_STAGE_LABELS[toStage]}"`)
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeDealMoveStageError(code))
      }
    })
  }

  const handleMarkWon = () => {
    startTransition(async () => {
      try {
        await moveDealStageAction(deal.id, { toStage: "won" })
        toast.success("Negocio marcado como ganado")
        setWonConfirmOpen(false)
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeDealMoveStageError(code))
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteDealAction(deal.id)
        toast.success("Negocio eliminado")
        setDeleteOpen(false)
        router.push("/dashboard/deals")
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeDealDeleteError(code))
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/deals">
            <ArrowLeft className="mr-1 size-4" />
            Volver
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <DealStageBadge stage={deal.stage} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isTerminal && (
          <>
            <Button
              size="sm"
              onClick={() => setWonConfirmOpen(true)}
              disabled={isPending}
            >
              <Check className="mr-2 size-4" />
              Marcar ganada
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLostOpen(true)}
              disabled={isPending}
            >
              <XCircle className="mr-2 size-4" />
              Marcar perdida
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={isPending}>
                  <ArrowRight className="mr-2 size-4" />
                  Cambiar etapa
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {ACTIVE_STAGES.filter((s) => s !== deal.stage).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => handleMoveStage(s)}>
                    {DEAL_STAGE_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {isTerminal && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={isPending}>
                <RotateCcw className="mr-2 size-4" />
                Reabrir
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ACTIVE_STAGES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => handleMoveStage(s)}>
                  {DEAL_STAGE_LABELS[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              disabled={isPending}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Más acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="text-muted-foreground" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="text-muted-foreground" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DealEditDialog open={editOpen} onOpenChange={setEditOpen} deal={deal} />
      {!isTerminal && (
        <LostDealDialog
          open={lostOpen}
          onOpenChange={setLostOpen}
          deal={deal}
        />
      )}
      <DeleteConfirmDialog
        open={wonConfirmOpen}
        onOpenChange={setWonConfirmOpen}
        title="Marcar como ganada"
        description="El negocio saldrá del Kanban activo. Puedes reabrirlo después."
        onConfirm={handleMarkWon}
        confirming={isPending}
        confirmLabel="Marcar ganada"
        confirmingLabel="Marcando…"
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar negocio"
        description="El negocio se moverá a la papelera. Puedes restaurarlo luego."
        onConfirm={handleDelete}
        confirming={isPending}
      />
    </div>
  )
}
