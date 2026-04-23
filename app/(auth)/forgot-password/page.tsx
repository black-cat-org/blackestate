"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { getAuthErrorMessage } from "@/lib/auth/error-messages"
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/lib/validations/auth"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Mail } from "lucide-react"

function mapResetError(error: { message: string; code?: string }): string {
  // Delegate to the shared auth error map. Additional heuristic kept as
  // a safety net for older SDK versions that sometimes return rate-limit
  // or security errors without a machine-readable `code`.
  if (error.code) return getAuthErrorMessage(error.code, error.message)
  const msg = error.message.toLowerCase()
  if (msg.includes("rate") || msg.includes("security")) {
    return "Por seguridad, intenta más tarde"
  }
  return "No se pudo enviar el email de recuperación. Intenta de nuevo"
}

export default function ForgotPasswordPage() {
  // Email is captured on success so the confirmation screen can show it.
  const [sentToEmail, setSentToEmail] = useState<string | null>(null)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      toast.error(mapResetError(error))
      return
    }

    setSentToEmail(values.email)
  }

  const loading = form.formState.isSubmitting

  if (sentToEmail) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Revisa tu correo</CardTitle>
          <CardDescription>
            Enviamos un enlace de recuperación a <strong>{sentToEmail}</strong>. Haz clic en el
            enlace para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/sign-in" className="text-sm text-primary hover:underline font-medium">
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Recuperar contraseña</CardTitle>
        <CardDescription>
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="juan@ejemplo.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Enviar enlace de recuperación
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/sign-in" className="text-sm text-primary hover:underline font-medium">
          <ArrowLeft className="mr-1 inline h-4 w-4" />
          Volver a iniciar sesión
        </Link>
      </CardFooter>
    </Card>
  )
}
