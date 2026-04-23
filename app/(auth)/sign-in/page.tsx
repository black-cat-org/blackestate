"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { SocialButtons } from "@/components/auth/social-buttons"
import { AuthDivider } from "@/components/auth/auth-divider"
import { ResendConfirmationButton } from "@/components/auth/resend-confirmation-button"
import { getAuthErrorMessage } from "@/lib/auth/error-messages"
import { signInSchema, type SignInValues } from "@/lib/validations/auth"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

function safeNext(value: string | null): string {
  // Reject absolute URLs and protocol-relative `//evil.com` bypasses. Only
  // same-origin relative paths starting with a single `/` are allowed.
  if (!value) return "/dashboard"
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard"
  }
  return value
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get("next"))

  // Tracks which email triggered an `email_not_confirmed` response so we can
  // render the resend CTA inline without losing the user's context.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  })

  const onSubmit = async (values: SignInValues) => {
    setUnconfirmedEmail(null)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      if (error.code === "email_not_confirmed") {
        setUnconfirmedEmail(values.email)
        toast.error(getAuthErrorMessage(error.code))
        return
      }
      toast.error(getAuthErrorMessage(error.code, error.message))
      return
    }

    // Full reload so the proxy sees the new session cookie and rewrites
    // the JWT claims with active_org_id on the next server request.
    router.replace(next)
    router.refresh()
  }

  const loading = form.formState.isSubmitting

  return (
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Contraseña</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Iniciar sesión
        </Button>
        {unconfirmedEmail ? (
          <div className="grid gap-2 rounded-md border border-dashed border-muted-foreground/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              ¿No recibiste el correo o el enlace expiró?
            </p>
            <ResendConfirmationButton email={unconfirmedEmail} className="w-full" />
          </div>
        ) : null}
      </form>
    </Form>
  )
}

export default function SignInPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
        <CardDescription>Ingresa a tu cuenta de Black Estate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <SocialButtons />
          <AuthDivider />
          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/sign-up" className="text-primary hover:underline font-medium">
            Crear cuenta
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
