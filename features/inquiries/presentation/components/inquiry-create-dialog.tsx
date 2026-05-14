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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContactAutocomplete } from "@/features/contacts/presentation/components/contact-autocomplete"
import {
  inquiryCreateFormSchema,
  type InquiryCreateFormValues,
} from "@/lib/validations/inquiry"
import { INQUIRY_SOURCE_LABELS } from "@/lib/constants/inquiry"
import { createInquiryAction } from "@/features/inquiries/presentation/actions"
import { describeInquiryCreateError } from "@/features/inquiries/presentation/inquiry-error-messages"
import { emptyToUndefined } from "@/lib/utils/form"
import type { Contact } from "@/features/contacts/domain/contact.entity"
import type {
  CreateInquiryDTO,
  Inquiry,
  InquirySource,
} from "@/features/inquiries/domain/inquiry.entity"
import type { Property } from "@/features/properties/domain/property.entity"

const NONE_SENTINEL = "__none__"

type ContactMode = "existing" | "new"

interface InquiryCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Active properties available for selection. The caller (the
   * /dashboard/inquiries page in R39) is expected to load this list
   * via `getActivePropertiesAction` and pass it down — the dialog
   * does not fetch on its own to keep it a pure render component.
   */
  properties: Property[]
  /**
   * Optionally pre-select a property (e.g. when the dialog is opened
   * from a property's detail page). Disables the property select if
   * provided, since the context is fixed.
   */
  initialPropertyId?: string
  onCreated?: (inquiry: Inquiry) => void
}

export function InquiryCreateDialog({
  open,
  onOpenChange,
  properties,
  initialPropertyId,
  onCreated,
}: InquiryCreateDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [contactMode, setContactMode] = useState<ContactMode>("existing")
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>()

  const form = useForm<InquiryCreateFormValues>({
    resolver: zodResolver(inquiryCreateFormSchema),
    defaultValues: {
      contactMode: "existing",
      contactId: "",
      contactDraftName: "",
      contactDraftPhone: "",
      contactDraftEmail: "",
      propertyId: initialPropertyId ?? "",
      source: "manual",
      message: "",
    },
    mode: "onSubmit",
  })

  useEffect(() => {
    if (open) {
      form.reset({
        contactMode: "existing",
        contactId: "",
        contactDraftName: "",
        contactDraftPhone: "",
        contactDraftEmail: "",
        propertyId: initialPropertyId ?? "",
        source: "manual",
        message: "",
      })
      setContactMode("existing")
      setSelectedContact(undefined)
      setServerError(null)
    }
  }, [open, initialPropertyId, form])

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact)
    form.setValue("contactId", contact.id, { shouldValidate: false })
  }

  const handleContactModeChange = (mode: ContactMode) => {
    setContactMode(mode)
    // Sync the discriminator into form state — the Zod superRefine
    // reads it to decide which branch of fields to validate. Without
    // this sync, errors leak across tabs.
    form.setValue("contactMode", mode, { shouldValidate: false })
    if (mode === "new") {
      setSelectedContact(undefined)
      form.setValue("contactId", "", { shouldValidate: false })
      // Clear any pending contactId error from a previous "existing"
      // submit attempt so the user doesn't see a stale red border on
      // the autocomplete after switching away.
      form.clearErrors("contactId")
    } else {
      form.setValue("contactDraftName", "", { shouldValidate: false })
      form.setValue("contactDraftPhone", "", { shouldValidate: false })
      form.setValue("contactDraftEmail", "", { shouldValidate: false })
      form.clearErrors([
        "contactDraftName",
        "contactDraftPhone",
        "contactDraftEmail",
      ])
    }
  }

  const onSubmit = (values: InquiryCreateFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const source =
        values.source === "" ? undefined : (values.source as InquirySource)

      const payload: CreateInquiryDTO = {
        propertyId: values.propertyId,
        source,
        message: emptyToUndefined(values.message),
      }

      if (values.contactMode === "existing" && values.contactId) {
        payload.contactId = values.contactId
      } else if (values.contactMode === "new") {
        payload.contactDraft = {
          name: values.contactDraftName?.trim() ?? "",
          phone: emptyToUndefined(values.contactDraftPhone),
          email: emptyToUndefined(values.contactDraftEmail),
        }
      }

      try {
        const inquiry = await createInquiryAction(payload)
        toast.success("Consulta creada")
        onCreated?.(inquiry)
        router.refresh()
        onOpenChange(false)
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message = describeInquiryCreateError(code)
        setServerError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nueva consulta</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <FormLabel>Contacto *</FormLabel>
              <Tabs
                value={contactMode}
                onValueChange={(v) => handleContactModeChange(v as ContactMode)}
                className="gap-2"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Existente</TabsTrigger>
                  <TabsTrigger value="new">Nuevo</TabsTrigger>
                </TabsList>

                <TabsContent value="existing">
                  <FormField
                    control={form.control}
                    name="contactId"
                    render={() => (
                      <FormItem>
                        <ContactAutocomplete
                          value={selectedContact}
                          onSelect={handleContactSelect}
                          placeholder="Buscar contacto…"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="new" className="space-y-3">
                  <FormField
                    control={form.control}
                    name="contactDraftName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal">Nombre</FormLabel>
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contactDraftPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-normal">Teléfono</FormLabel>
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
                      name="contactDraftEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-normal">Correo</FormLabel>
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
                </TabsContent>
              </Tabs>
            </div>

            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propiedad *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={Boolean(initialPropertyId)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una propiedad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          No tienes propiedades activas
                        </div>
                      ) : (
                        properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.title}
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
                      {Object.entries(INQUIRY_SOURCE_LABELS).map(
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
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensaje</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Qué pidió el cliente, contexto inicial…"
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
                Crear consulta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
