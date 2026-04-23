"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { SocialButtons } from "@/components/auth/social-buttons"
import { AuthDivider } from "@/components/auth/auth-divider"
import { ResendConfirmationButton } from "@/components/auth/resend-confirmation-button"
import { getAuthErrorMessage } from "@/lib/auth/error-messages"
import {
  signUpSchema,
  type SignUpValues,
  PASSWORD_HINT,
} from "@/lib/validations/auth"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function SignUpPage() {
  const router = useRouter()
  // Email is stored separately so the post-signup verification screen can
  // display it and feed it into the resend button.
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onBlur",
  })

  const onSubmit = async (values: SignUpValues) => {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // `full_name` lands in `raw_user_meta_data.full_name` so the
        // custom_access_token hook can pull it into the JWT `user_name`
        // claim. Never use user_metadata for authorization — here it is
        // purely display info.
        data: { full_name: values.name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      toast.error(getAuthErrorMessage(error.code, error.message))
      return
    }

    // If email confirmation is disabled, Supabase signs the user in
    // immediately and returns a session. Otherwise we need the user to
    // click the email link, which routes through /auth/callback.
    if (data.session) {
      router.replace("/dashboard")
      router.refresh()
      return
    }

    setVerificationEmail(values.email)
  }

  const loading = form.formState.isSubmitting

  if (verificationEmail) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Revisa tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace de verificación a <strong>{verificationEmail}</strong>. Haz clic
            para activar tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-center text-xs text-muted-foreground">
            ¿No llegó a tu bandeja? Revisa spam o pide un nuevo enlace:
          </p>
          <ResendConfirmationButton email={verificationEmail} className="w-full" />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya verificaste?{" "}
            <Link href="/sign-in" className="text-primary hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
        <CardDescription>Ingresa tus datos para comenzar con Black Estate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <SocialButtons />
          <AuthDivider />
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Juan Pérez"
                        autoComplete="name"
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
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>{PASSWORD_HINT}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Crear cuenta
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/sign-in" className="text-primary hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
