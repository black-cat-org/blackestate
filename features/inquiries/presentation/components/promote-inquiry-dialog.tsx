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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  promoteInquiryFormSchema,
  type PromoteInquiryFormValues,
} from "@/lib/validations/inquiry"
import { promoteInquiryAction } from "@/features/inquiries/presentation/actions"
import { describeInquiryPromoteError } from "@/features/inquiries/presentation/inquiry-error-messages"
import { emptyToUndefined } from "@/lib/utils/form"
import { NONE_SENTINEL } from "@/lib/constants/form"
import { DEAL_SOURCE_LABELS, DEAL_STAGE_LABELS } from "@/lib/constants/deal"
import type {
  Deal,
  DealSource,
  DealStage,
} from "@/features/deals/domain/deal.entity"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

/**
 * Sentinel for "no preference" Select items. Radix Select forbids
 * `value=""`, so we use a non-empty token and translate it back at
 * submit time. Mirrors the R24 contact-edit-dialog pattern.
 *
 * Stage Select does NOT use this sentinel — stage is always required
 * and defaults to `visit_scheduled` (the form default and Zod default
 * path). Only the optional Source Select needs the "no preference"
 * affordance.
 */

interface PromoteInquiryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inquiry: Inquiry
  onPromoted?: (result: { deal: Deal; inquiry: Inquiry }) => void
}

/**
 * Promote an Inquiry → Deal. Captures the MINIMUM set of fields the
 * agent typically knows at the moment a visit is scheduled (stage,
 * source, optional note). Budget / zone / property type / wantsOffers
 * are deferred to the Deal detail page — adding them here would slow
 * down the rapid "scheduling visit, click promote" flow.
 *
 * Atomicity of the underlying two-row update (INSERT deal + UPDATE
 * inquiry status='promoted' + back-link both sides) lives in the
 * repository — this component just collects input and renders the
 * outcome. See `IInquiryRepository.promote` JSDoc.
 */
export function PromoteInquiryDialog({
  open,
  onOpenChange,
  inquiry,
  onPromoted,
}: PromoteInquiryDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<PromoteInquiryFormValues>({
    resolver: zodResolver(promoteInquiryFormSchema),
    defaultValues: {
      stage: "visit_scheduled",
      source: "",
      message: inquiry.message ?? "",
    },
    mode: "onSubmit",
  })

  useEffect(() => {
    if (open) {
      form.reset({
        stage: "visit_scheduled",
        source: "",
        message: inquiry.message ?? "",
      })
      setServerError(null)
    }
  }, [open, inquiry, form])

  const onSubmit = (values: PromoteInquiryFormValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const stage = values.stage === "" ? undefined : values.stage
        const source = values.source === "" ? undefined : values.source
        const result = await promoteInquiryAction(inquiry.id, {
          stage: stage as DealStage | undefined,
          source: source as DealSource | undefined,
          message: emptyToUndefined(values.message),
        })
        toast.success("Consulta promovida a negocio")
        onPromoted?.(result)
        router.refresh()
        onOpenChange(false)
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message = describeInquiryPromoteError(code)
        setServerError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Promover a negocio</DialogTitle>
          <DialogDescription>
            La consulta queda enlazada al nuevo negocio. Podrás completar
            presupuesto, zona y otros datos desde el detalle del negocio.
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
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etapa inicial</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "visit_scheduled"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DEAL_STAGE_LABELS).map(([value, label]) => (
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
                  <FormLabel>Nota inicial</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contexto del primer contacto, expectativas, próximos pasos…"
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
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Crear negocio
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
