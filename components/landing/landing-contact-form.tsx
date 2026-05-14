"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  publicInquiryFormSchema,
  type PublicInquiryFormValues,
} from "@/lib/validations/public-inquiry"
import { createPublicInquiryAction } from "@/features/inquiries/presentation/public-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SendIcon, Loader2Icon } from "lucide-react"

interface LandingContactFormProps {
  propertyId: string
}

/**
 * Map throw tokens raised by `createPublicInquiryAction` to Spanish
 * user copy. Tokens live on the action contract and propagate
 * unwrapped from the RPC — this map is the single translation point
 * for the public-form UX.
 */
function describeSubmitError(code: string): string {
  switch (code) {
    case "name_required":
      return "Por favor ingresa tu nombre."
    case "contact_missing_phone_and_email":
      return "Ingresa al menos un teléfono o un correo."
    case "property_not_found_or_inactive":
      return "Esta propiedad ya no está disponible."
    case "invalid_input":
      return "Revisa los datos del formulario."
    default:
      return "No se pudo enviar la consulta. Intenta de nuevo."
  }
}

export function LandingContactForm({ propertyId }: LandingContactFormProps) {
  const form = useForm<PublicInquiryFormValues>({
    resolver: zodResolver(publicInquiryFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      message: "",
    },
    mode: "onSubmit",
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: PublicInquiryFormValues) {
    try {
      await createPublicInquiryAction(propertyId, data)
      toast.success("Consulta enviada", {
        description: "Nos pondremos en contacto a la brevedad.",
      })
      form.reset()
    } catch (error) {
      const code = error instanceof Error ? error.message : ""
      toast.error("Error", {
        description: describeSubmitError(code),
      })
    }
  }

  return (
    <Card id="contacto">
      <CardHeader>
        <CardTitle>Enviar consulta</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      placeholder="Tu nombre"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="+591 7…"
                      type="tel"
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
                      autoComplete="email"
                      inputMode="email"
                      placeholder="tu@correo.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
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
                      placeholder="Cuéntanos qué te interesa saber…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
              {isSubmitting ? "Enviando…" : "Enviar consulta"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
