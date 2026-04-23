"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/auth/password-input"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { getAuthErrorMessage } from "@/lib/auth/error-messages"
import {
  resetPasswordSchema,
  type ResetPasswordValues,
  PASSWORD_HINT,
} from "@/lib/validations/auth"
import { toast } from "sonner"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

function mapPasswordError(error: { message: string; code?: string }): string {
  // Delegate to the shared auth error map so the same code (e.g.
  // `session_not_found`) produces the same Spanish copy here as on
  // sign-in / sign-up. Fall back to a reset-specific message when the
  // SDK returns a plain-text "session" hint without a code.
  if (error.code) return getAuthErrorMessage(error.code, error.message)
  if (error.message.toLowerCase().includes("session")) {
    return "Tu sesión expiró. Solicita un nuevo enlace de recuperación"
  }
  return "No se pudo actualizar la contraseña. Intenta de nuevo"
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onBlur",
  })

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setSessionChecked(true)
    })
  }, [])

  useEffect(() => {
    if (!success) return
    router.replace("/dashboard")
  }, [success, router])

  const onSubmit = async (values: ResetPasswordValues) => {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password: values.password })

    if (error) {
      toast.error(mapPasswordError(error))
      return
    }

    // Invalidate any other active sessions the user might have.
    // Password change is a security event — if someone was signed in on
    // another device legitimately or otherwise, they should be forced
    // to re-authenticate with the new credentials. Matches OWASP /
    // NIST guidance and Stripe/GitHub/Google behavior.
    // Best-effort: a failure here should NOT undo the password update,
    // which already succeeded. Log for ops and continue to success.
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" })
    if (signOutError) {
      console.warn("[reset-password] signOut(others) failed:", signOutError)
    }

    setSuccess(true)
  }

  const loading = form.formState.isSubmitting

  if (!sessionChecked) return null

  if (!hasSession) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Enlace expirado</CardTitle>
          <CardDescription>
            El enlace de recuperación ya no es válido. Solicita uno nuevo para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/forgot-password">Solicitar nuevo enlace</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Contraseña actualizada</CardTitle>
          <CardDescription>
            Tu contraseña fue actualizada correctamente. Redirigiendo al dashboard...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Nueva contraseña</CardTitle>
        <CardDescription>
          Ingresa tu nueva contraseña para tu cuenta de Black Estate
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>{PASSWORD_HINT}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Actualizar contraseña
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/sign-in" className="text-primary hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
