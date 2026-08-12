"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  lostDealFormSchema,
  type LostDealFormValues,
} from "@/lib/validations/deal"
import { moveDealStageAction } from "@/features/deals/presentation/actions"
import { describeDealMoveStageError } from "@/features/deals/presentation/deal-error-messages"
import { emptyToUndefined } from "@/lib/utils/form"
import type { Deal } from "@/features/deals/domain/deal.entity"

interface LostDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: Deal
  onLost?: (deal: Deal) => void
}

/**
 * Mark a Deal as `lost`. The optional `lostReason` rides along with
 * the stage transition on a single atomic call:
 *
 *   `moveDealStageAction(id, { toStage: 'lost', lostReason })`
 *
 * The repository writes `stage`, `closed_at = now()`, and
 * `lost_reason` in the same UPDATE inside one transaction, so a
 * partial failure cannot leave the Deal in an inconsistent state
 * (no race window between "reason saved" and "stage flipped").
 *
 * `MoveDealStageInput.lostReason` was added in R27 to close a gap
 * the codebase had documented in `mapPartialDTOToUpdate` ("lostReason
 * belongs to the stage-transition path") without exposing it. The
 * Kanban drag drop path leaves the field `undefined`, which is the
 * "generic loss without reason" behaviour — only the explicit
 * "Marcar como perdido" dialog (this component) captures text.
 */
export function LostDealDialog({
  open,
  onOpenChange,
  deal,
  onLost,
}: LostDealDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LostDealFormValues>({
    resolver: zodResolver(lostDealFormSchema),
    defaultValues: { lostReason: deal.lostReason ?? "" },
    mode: "onSubmit",
  })

  useEffect(() => {
    if (open) {
      form.reset({ lostReason: deal.lostReason ?? "" })
      setServerError(null)
    }
  }, [open, deal, form])

  const onSubmit = (values: LostDealFormValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const updated = await moveDealStageAction(deal.id, {
          toStage: "lost",
          lostReason: emptyToUndefined(values.lostReason),
        })
        toast.success("Negocio marcado como perdido")
        onLost?.(updated)
        router.refresh()
        onOpenChange(false)
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message = describeDealMoveStageError(code)
        setServerError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Marcar como perdido</DialogTitle>
          <DialogDescription>
            El negocio saldrá del Kanban activo. Puedes reabrirlo después si fue
            un error.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="lostReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: no le convenció el precio · compró en otra parte · sin presupuesto"
                      rows={3}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <p className="text-destructive text-sm" role="alert">
                {serverError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Marcar como perdido
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
