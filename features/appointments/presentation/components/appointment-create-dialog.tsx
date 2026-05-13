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
import { nullable } from "@/lib/utils/form"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"
import type { Lead } from "@/features/leads/domain/lead.entity"
import type { Property } from "@/features/properties/domain/property.entity"

interface AppointmentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leads: Lead[]
  properties: Property[]
  onCreated?: (appointment: Appointment) => void
}

const DEFAULTS: AppointmentCreateValues = {
  leadId: "",
  propertyId: "",
  date: "",
  time: "",
  endTime: "",
  notes: "",
}

export function AppointmentCreateDialog({
  open,
  onOpenChange,
  leads,
  properties,
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
    const lead = leads.find((l) => l.id === values.leadId)
    const property = properties.find((p) => p.id === values.propertyId)
    if (!lead || !property) {
      setServerError("Lead o propiedad inválidos")
      return
    }
    startTransition(async () => {
      try {
        const apt = await createAppointmentAction({
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          propertyId: property.id,
          propertyTitle: property.title,
          date: values.date,
          time: values.time,
          endTime: values.endTime,
          origin: "agent",
          notes: nullable(values.notes),
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
              name="leadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un lead" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leads.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No tienes leads todavía.
                        </div>
                      ) : (
                        leads.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
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
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propiedad *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una propiedad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No tienes propiedades todavía.
                        </div>
                      ) : (
                        properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title}
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
