"use client"

import { useState } from "react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Mail } from "lucide-react"

const RESET_ERRORS: Record<string, string> = {
  over_email_send_rate_limit: "Por seguridad, intenta más tarde",
  user_not_found: "No encontramos una cuenta con ese email",
}

function mapResetError(error: { message: string; code?: string }): string {
  if (error.code && error.code in RESET_ERRORS) return RESET_ERRORS[error.code]
  if (error.message.toLowerCase().includes("rate") || error.message.toLowerCase().includes("security")) {
    return "Por seguridad, intenta más tarde"
  }
  return "No se pudo enviar el email de recuperación. Intenta de nuevo"
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        toast.error(mapResetError(error))
        return
      }

      setEmailSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Revisa tu correo</CardTitle>
          <CardDescription>
            Enviamos un enlace de recuperación a <strong>{email}</strong>.
            Haz clic en el enlace para restablecer tu contraseña.
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
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="juan@ejemplo.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Enviar enlace de recuperación
          </Button>
        </form>
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
