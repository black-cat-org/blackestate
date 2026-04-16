import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AuthCodeErrorPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Error de verificación</CardTitle>
        <CardDescription>
          No pudimos completar el inicio de sesión. El enlace puede haber expirado o haber sido
          usado anteriormente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href="/sign-in">Volver a iniciar sesión</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-up">Crear cuenta nueva</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
