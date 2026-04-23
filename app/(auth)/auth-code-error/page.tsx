"use client"

import { useState } from "react"
import Link from "next/link"
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
import { ResendConfirmationButton } from "@/components/auth/resend-confirmation-button"

export default function AuthCodeErrorPage() {
  // Local state so we only render the resend button once the user has
  // supplied an email. Empty-string guards in the button itself mean this
  // is belt-and-suspenders UX, not strict validation.
  const [email, setEmail] = useState("")
  const trimmed = email.trim()

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Error de verificación</CardTitle>
        <CardDescription>
          No pudimos completar el inicio de sesión. El enlace puede haber expirado o haber sido
          usado anteriormente.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 rounded-md border border-dashed border-muted-foreground/30 p-4">
          <p id="resend-hint" className="text-sm text-muted-foreground">
            ¿Tu enlace expiró? Escribe tu email y te enviamos uno nuevo.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="email" className="sr-only">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="juan@ejemplo.com"
              autoComplete="email"
              aria-describedby="resend-hint"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {/*
            Hide the button entirely until the user has typed an email.
            The button's own `!email` guard still provides defense-in-depth,
            but this keeps the UI free of a disabled-looking element that
            could confuse users.
          */}
          {trimmed ? (
            <ResendConfirmationButton email={trimmed} className="w-full" />
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href="/sign-in">Volver a iniciar sesión</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-up">Crear cuenta nueva</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
