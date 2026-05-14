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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  contactFormSchema,
  parseTagsInput,
  serializeTagsInput,
  type ContactFormValues,
} from "@/lib/validations/contact"
import { PREFERRED_CHANNEL_LABELS } from "@/lib/constants/contact"
import {
  createContactAction,
  updateContactAction,
} from "@/features/contacts/presentation/actions"
import { describeContactSaveError } from "@/features/contacts/presentation/contact-error-messages"
import { emptyToUndefined } from "@/lib/utils/form"
import type {
  Contact,
  ContactPreferredChannel,
  CreateContactDTO,
  UpdateContactDTO,
} from "@/features/contacts/domain/contact.entity"

/**
 * Sentinel used by the `preferredChannel` Select to model the "no
 * preference" option. Radix Select forbids `<SelectItem value="">`,
 * so we use a non-empty token and translate it back to the empty
 * string (the form's "no preference" representation) in
 * `onValueChange` — and translate the form value to this sentinel
 * when binding the trigger so the option is selectable in both
 * create and edit modes.
 */
const NO_CHANNEL_SENTINEL = "__none__"

interface ContactEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Existing contact to edit. Omit for "create new contact" mode.
   * The dialog renders the same form either way — the resolved values
   * are routed to `createContactAction` or `updateContactAction`
   * depending on whether `contact` is present.
   */
  contact?: Contact
  /** Fired after a successful save. The page caller decides whether to refresh, navigate, or close any wrapping flow (e.g. the contact-autocomplete "create inline" mode). */
  onSaved?: (contact: Contact) => void
}

function buildDefaultValues(contact?: Contact): ContactFormValues {
  return {
    name: contact?.name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    notes: contact?.notes ?? "",
    tags: serializeTagsInput(contact?.tags),
    preferredChannel: contact?.preferredChannel ?? "",
  }
}

export function ContactEditDialog({
  open,
  onOpenChange,
  contact,
  onSaved,
}: ContactEditDialogProps) {
  const router = useRouter()
  const isEdit = Boolean(contact)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: buildDefaultValues(contact),
    mode: "onSubmit",
  })

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(contact))
      setServerError(null)
    }
  }, [open, contact, form])

  const onSubmit = (values: ContactFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const preferredChannel =
        values.preferredChannel === "" ? undefined : values.preferredChannel

      try {
        if (contact) {
          const patch: UpdateContactDTO = {
            name: values.name.trim(),
            phone: emptyToUndefined(values.phone),
            email: emptyToUndefined(values.email),
            notes: emptyToUndefined(values.notes),
            tags: parseTagsInput(values.tags),
            preferredChannel: preferredChannel as ContactPreferredChannel | undefined,
          }
          const updated = await updateContactAction(contact.id, patch)
          toast.success("Contacto actualizado")
          onSaved?.(updated)
        } else {
          const payload: CreateContactDTO = {
            name: values.name.trim(),
            phone: emptyToUndefined(values.phone),
            email: emptyToUndefined(values.email),
            notes: emptyToUndefined(values.notes),
            tags: parseTagsInput(values.tags),
            preferredChannel: preferredChannel as ContactPreferredChannel | undefined,
          }
          const created = await createContactAction(payload)
          toast.success("Contacto creado")
          onSaved?.(created)
        }
        router.refresh()
        onOpenChange(false)
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message = describeContactSaveError(code, isEdit)
        setServerError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      placeholder="Nombre completo"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="off"
                        inputMode="tel"
                        placeholder="+591 7…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="off"
                        inputMode="email"
                        placeholder="nombre@dominio.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="preferredChannel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canal preferido</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === NO_CHANNEL_SENTINEL ? "" : value)
                    }
                    value={field.value ? field.value : NO_CHANNEL_SENTINEL}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CHANNEL_SENTINEL}>
                        Sin preferencia
                      </SelectItem>
                      {Object.entries(PREFERRED_CHANNEL_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etiquetas</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      placeholder="vip, urgente, inversor"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    Separa las etiquetas con coma.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas internas opcionales…"
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
                {isEdit ? "Guardar cambios" : "Crear contacto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
