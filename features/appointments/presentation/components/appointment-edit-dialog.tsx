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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  appointmentEditSchema,
  type AppointmentEditValues,
} from "@/lib/validations/appointment"
import { updateAppointmentAction } from "@/features/appointments/presentation/actions"
import { nullable } from "@/lib/utils/form"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"

interface AppointmentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment
  onUpdated?: (appointment: Appointment) => void
}

export function AppointmentEditDialog({
  open,
  onOpenChange,
  appointment,
  onUpdated,
}: AppointmentEditDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<AppointmentEditValues>({
    resolver: zodResolver(appointmentEditSchema),
    defaultValues: {
      date: appointment.date,
      time: appointment.time,
      endTime: appointment.endTime,
      notes: appointment.notes ?? "",
    },
    mode: "onSubmit",
  })

  useEffect(() => {
    if (open) {
      form.reset({
        date: appointment.date,
        time: appointment.time,
        endTime: appointment.endTime,
        notes: appointment.notes ?? "",
      })
      setServerError(null)
    }
  }, [open, appointment, form])

  const onSubmit = (values: AppointmentEditValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const updated = await updateAppointmentAction(appointment.id, {
          date: values.date,
          time: values.time,
          endTime: values.endTime,
          notes: nullable(values.notes),
        })
        toast.success("Cita actualizada")
        router.refresh()
        onUpdated?.(updated)
        onOpenChange(false)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al actualizar la cita"
        setServerError(message)
        toast.error("No se pudo actualizar la cita")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar cita</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">{appointment.leadName}</div>
          <div className="truncate">{appointment.propertyTitle}</div>
        </div>

        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
