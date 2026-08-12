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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ContactAutocomplete } from "@/features/contacts/presentation/components/contact-autocomplete"
import {
  dealCreateFormSchema,
  type DealCreateFormValues,
} from "@/lib/validations/deal"
import { DEAL_SOURCE_LABELS, DEAL_STAGE_LABELS } from "@/lib/constants/deal"
import { TERMINAL_DEAL_STAGES } from "@/features/deals/domain/deal.entity"
import { createDealAction } from "@/features/deals/presentation/actions"
import { describeDealCreateError } from "@/features/deals/presentation/deal-error-messages"
import { emptyToUndefined } from "@/lib/utils/form"
import { cn } from "@/lib/utils"
import { NONE_SENTINEL } from "@/lib/constants/form"
import type { Contact } from "@/features/contacts/domain/contact.entity"
import type {
  CreateDealDTO,
  Deal,
  DealSource,
  DealStage,
} from "@/features/deals/domain/deal.entity"
import type { Property } from "@/features/properties/domain/property.entity"


type ContactMode = "existing" | "new"

interface DealCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Active properties available for selection. Loaded by the page
   * (R40 will use `getActivePropertiesAction`) and passed in — the
   * dialog stays a pure render component.
   */
  properties: Property[]
  /**
   * Optionally pre-select a property (e.g. opened from a property
   * detail page). Disables the property select when provided.
   */
  initialPropertyId?: string
  onCreated?: (deal: Deal) => void
}

export function DealCreateDialog({
  open,
  onOpenChange,
  properties,
  initialPropertyId,
  onCreated,
}: DealCreateDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [contactMode, setContactMode] = useState<ContactMode>("existing")
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const form = useForm<DealCreateFormValues>({
    resolver: zodResolver(dealCreateFormSchema),
    defaultValues: {
      contactMode: "existing",
      contactId: "",
      contactDraftName: "",
      contactDraftPhone: "",
      contactDraftEmail: "",
      propertyId: initialPropertyId ?? "",
      stage: "visit_scheduled",
      source: "",
      message: "",
      budget: "",
      propertyTypeSought: "",
      zoneOfInterest: "",
      wantsOffers: false,
      expectedCloseAt: "",
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
        stage: "visit_scheduled",
        source: "",
        message: "",
        budget: "",
        propertyTypeSought: "",
        zoneOfInterest: "",
        wantsOffers: false,
        expectedCloseAt: "",
      })
      setContactMode("existing")
      setSelectedContact(undefined)
      setServerError(null)
      setAdvancedOpen(false)
    }
  }, [open, initialPropertyId, form])

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact)
    form.setValue("contactId", contact.id, { shouldValidate: false })
  }

  const handleContactModeChange = (mode: ContactMode) => {
    setContactMode(mode)
    form.setValue("contactMode", mode, { shouldValidate: false })
    if (mode === "new") {
      setSelectedContact(undefined)
      form.setValue("contactId", "", { shouldValidate: false })
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

  const onSubmit = (values: DealCreateFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const source =
        values.source === "" ? undefined : (values.source as DealSource)

      const payload: CreateDealDTO = {
        propertyId: values.propertyId,
        stage: values.stage as DealStage,
        source,
        message: emptyToUndefined(values.message),
        budget: emptyToUndefined(values.budget),
        propertyTypeSought: emptyToUndefined(values.propertyTypeSought),
        zoneOfInterest: emptyToUndefined(values.zoneOfInterest),
        wantsOffers: values.wantsOffers,
        expectedCloseAt: emptyToUndefined(values.expectedCloseAt),
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
        const deal = await createDealAction(payload)
        toast.success("Negocio creado")
        onCreated?.(deal)
        router.refresh()
        onOpenChange(false)
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message = describeDealCreateError(code)
        setServerError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Nuevo negocio</DialogTitle>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etapa inicial *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DEAL_STAGE_LABELS)
                          .filter(
                            ([value]) =>
                              !TERMINAL_DEAL_STAGES.includes(
                                value as (typeof TERMINAL_DEAL_STAGES)[number],
                              ),
                          )
                          .map(([value, label]) => (
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
            </div>

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

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                >
                  Más detalles (opcional)
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
                Crear negocio
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
