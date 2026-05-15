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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  appointmentCreateSchema,
  type AppointmentCreateValues,
} from "@/lib/validations/appointment"
import { createAppointmentAction } from "@/features/appointments/presentation/actions"
import { emptyToUndefined } from "@/lib/utils/form"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"
import type { Deal } from "@/features/deals/domain/deal.entity"

interface AppointmentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Active Deals (non-terminal, non-deleted) for the agent to choose
   * from. The Deal already carries its Contact + Property, so the
   * appointment automatically inherits both — no separate property
   * select. Pre-fetched by the page route via `getDealsAction()`.
   */
  deals: Deal[]
  onCreated?: (appointment: Appointment) => void
}

const DEFAULTS: AppointmentCreateValues = {
  dealId: "",
  propertyId: "",
  date: "",
  time: "",
  endTime: "",
  notes: "",
}

export function AppointmentCreateDialog({
  open,
  onOpenChange,
  deals,
  onCreated,
}: AppointmentCreateDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<AppointmentCreateValues>({
    resolver: zodResolver(appointmentCreateSchema),
    defaultValues: DEFAULTS,
    mode: "onSubmit",
  })

  useEffect(() => {
    if (open) {
      form.reset(DEFAULTS)
      setServerError(null)
    }
  }, [open, form])

  const onSubmit = (values: AppointmentCreateValues) => {
    setServerError(null)
    const deal = deals.find((d) => d.id === values.dealId)
    if (!deal) {
      setServerError("Negocio inválido")
      return
    }
    startTransition(async () => {
      try {
        const apt = await createAppointmentAction({
          dealId: deal.id,
          contactId: deal.contactId,
          contactName: deal.contactName ?? "Sin contacto",
          contactPhone: deal.contactPhone,
          propertyId: deal.propertyId,
          propertyTitle: deal.propertyTitle ?? "Sin propiedad",
          date: values.date,
          time: values.time,
          endTime: values.endTime,
          origin: "agent",
          notes: emptyToUndefined(values.notes),
        })
        toast.success("Cita creada")
        router.refresh()
        onCreated?.(apt)
        onOpenChange(false)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al crear la cita"
        setServerError(message)
        toast.error("No se pudo crear la cita")
      }
    })
  }

  // The property select is hidden but still in the form to satisfy the
  // schema (which keeps `propertyId` required to match the DB column
  // that survives R34). We mirror the selected deal's propertyId into
  // the form state whenever the deal changes.
  const handleDealChange = (dealId: string) => {
    form.setValue("dealId", dealId)
    const deal = deals.find((d) => d.id === dealId)
    form.setValue("propertyId", deal?.propertyId ?? "")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dealId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Negocio *</FormLabel>
                  <Select value={field.value} onValueChange={handleDealChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un negocio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {deals.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No tienes negocios activos todavía.
                        </div>
                      ) : (
                        deals.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.contactName ?? "Sin contacto"}
                            {d.propertyTitle ? ` · ${d.propertyTitle}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha *</FormLabel>
                  <FormControl>
                    <Input type="date" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio *</FormLabel>
                    <FormControl>
                      <Input type="time" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora fin *</FormLabel>
                    <FormControl>
                      <Input type="time" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas opcionales…"
                      rows={2}
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
              <p className="text-sm text-destructive" role="alert">
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
                Crear cita
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
