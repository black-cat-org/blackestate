"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { leadFormSchema, type LeadFormValues } from "@/lib/validations/lead"
import { submitLeadAction } from "@/app/p/[id]/actions"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { SendIcon, Loader2Icon } from "lucide-react"

interface LandingContactFormProps {
  propertyId: string
  source: string | null
}

export function LandingContactForm({ propertyId, source }: LandingContactFormProps) {
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      message: "",
      wantsOffers: false,
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: LeadFormValues) {
    const result = await submitLeadAction(propertyId, source, data)

    if (result.success) {
      toast.success("Consulta enviada", {
        description: "Nos pondremos en contacto a la brevedad.",
      })
      form.reset()
    } else {
      toast.error("Error", {
        description: result.error || "No se pudo enviar la consulta.",
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre" {...field} />
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
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 11 1234-5678" type="tel" {...field} />
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
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input placeholder="tu@email.com" type="email" {...field} />
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
                      placeholder="Contanos qué te interesa saber..."
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
                    Quiero recibir ofertas similares
                  </FormLabel>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
              {isSubmitting ? "Enviando..." : "Enviar consulta"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
