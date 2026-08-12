"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  dealEditFormSchema,
  type DealEditFormValues,
} from "@/lib/validations/deal"
import { DEAL_SOURCE_LABELS } from "@/lib/constants/deal"
import { NONE_SENTINEL } from "@/lib/constants/form"
import { updateDealAction } from "@/features/deals/presentation/actions"
import { describeDealUpdateError } from "@/features/deals/presentation/deal-error-messages"
import { emptyToUndefined } from "@/lib/utils/form"
import { cn } from "@/lib/utils"
import type {
  Deal,
  DealSource,
  UpdateDealDTO,
} from "@/features/deals/domain/deal.entity"

interface DealEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: Deal
  onUpdated?: (deal: Deal) => void
}

function buildDefaultValues(deal: Deal): DealEditFormValues {
  return {
    source: deal.source ?? "",
    message: deal.message ?? "",
    budget: deal.budget ?? "",
    propertyTypeSought: deal.propertyTypeSought ?? "",
    zoneOfInterest: deal.zoneOfInterest ?? "",
    wantsOffers: deal.wantsOffers,
    expectedCloseAt: deal.expectedCloseAt ?? "",
  }
}

export function DealEditDialog({
  open,
  onOpenChange,
  deal,
  onUpdated,
}: DealEditDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const form = useForm<DealEditFormValues>({
    resolver: zodResolver(dealEditFormSchema),
    defaultValues: buildDefaultValues(deal),
    mode: "onSubmit",
  })

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(deal))
      setServerError(null)
      setAdvancedOpen(false)
    }
  }, [open, deal, form])

  const onSubmit = (values: DealEditFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const source =
        values.source === "" ? undefined : (values.source as DealSource)

      const patch: UpdateDealDTO = {
        source,
        message: emptyToUndefined(values.message),
        budget: emptyToUndefined(values.budget),
        propertyTypeSought: emptyToUndefined(values.propertyTypeSought),
        zoneOfInterest: emptyToUndefined(values.zoneOfInterest),
        wantsOffers: values.wantsOffers,
        expectedCloseAt: emptyToUndefined(values.expectedCloseAt),
      }

      try {
        const updated = await updateDealAction(deal.id, patch)
        toast.success("Negocio actualizado")
        onUpdated?.(updated)
        router.refresh()
        onOpenChange(false)
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message = describeDealUpdateError(code)
        setServerError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Editar negocio</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origen</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === NONE_SENTINEL ? "" : value)
                    }
                    value={field.value ? field.value : NONE_SENTINEL}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>Sin especificar</SelectItem>
                      {Object.entries(DEAL_SOURCE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contexto, expectativas, próximos pasos…"
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

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                >
                  Más detalles
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      advancedOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Presupuesto</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="off"
                            placeholder="USD 80.000 — 120.000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expectedCloseAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cierre estimado</FormLabel>
                        <FormControl>
                          <Input type="date" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="propertyTypeSought"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de propiedad buscada</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="off"
                          placeholder="Casa, departamento, terreno…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zoneOfInterest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona de interés</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="off"
                          placeholder="Zona Sur, Equipetrol, Achumani…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wantsOffers"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Quiere recibir ofertas similares
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

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
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
