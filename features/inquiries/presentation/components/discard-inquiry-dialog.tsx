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
  discardInquiryFormSchema,
  type DiscardInquiryFormValues,
} from "@/lib/validations/inquiry"
import { discardInquiryAction } from "@/features/inquiries/presentation/actions"
import { describeInquiryDiscardError } from "@/features/inquiries/presentation/inquiry-error-messages"
import { emptyToUndefined } from "@/lib/utils/form"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

interface DiscardInquiryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inquiry: Inquiry
  onDiscarded?: (inquiry: Inquiry) => void
}

export function DiscardInquiryDialog({
  open,
  onOpenChange,
  inquiry,
  onDiscarded,
}: DiscardInquiryDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<DiscardInquiryFormValues>({
    resolver: zodResolver(discardInquiryFormSchema),
    defaultValues: { reason: "" },
    mode: "onSubmit",
  })

  useEffect(() => {
    if (open) {
      form.reset({ reason: "" })
      setServerError(null)
    }
  }, [open, form])

  const onSubmit = (values: DiscardInquiryFormValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const updated = await discardInquiryAction(
          inquiry.id,
          emptyToUndefined(values.reason),
        )
        toast.success("Consulta descartada")
        onDiscarded?.(updated)
        router.refresh()
        onOpenChange(false)
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message = describeInquiryDiscardError(code)
        setServerError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Descartar consulta</DialogTitle>
          <DialogDescription>
            La consulta saldrá del listado activo. Puedes restaurarla luego si fue
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: no contestó · compró en otra parte · fuera de presupuesto"
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
                Descartar consulta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
