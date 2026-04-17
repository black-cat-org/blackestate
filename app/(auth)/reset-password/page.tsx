"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

const PASSWORD_ERRORS: Record<string, string> = {
  same_password: "La nueva contraseña debe ser diferente a la actual",
  weak_password: "La contraseña es muy débil. Usa letras y números",
  session_not_found: "Tu sesión expiró. Solicita un nuevo enlace de recuperación",
}

function mapPasswordError(error: { message: string; code?: string }): string {
  if (error.code && error.code in PASSWORD_ERRORS) return PASSWORD_ERRORS[error.code]
  if (error.message.toLowerCase().includes("session")) {
    return "Tu sesión expiró. Solicita un nuevo enlace de recuperación"
  }
  return "No se pudo actualizar la contraseña. Intenta de nuevo"
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(mapPasswordError(error))
        return
      }

      setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

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
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Actualizar contraseña
          </Button>
        </form>
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
