"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/auth/password-input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SocialButtons } from "@/components/auth/social-buttons"
import { AuthDivider } from "@/components/auth/auth-divider"
import { ResendConfirmationButton } from "@/components/auth/resend-confirmation-button"
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

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  // Tracks which email triggered an `email_not_confirmed` response so we can
  // render the resend CTA inline without losing the user's context.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setUnconfirmedEmail(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.code === "email_not_confirmed") {
          setUnconfirmedEmail(email)
          toast.error("Tu email no está confirmado. Revisá tu bandeja de entrada.")
          return
        }
        toast.error(error.message || "Credenciales incorrectas")
        return
      }

      // Full reload so the proxy sees the new session cookie and rewrites
      // the JWT claims with active_org_id on the next server request.
      router.replace(next)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
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
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
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
