import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PropertyNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Propiedad no encontrada</h2>
        <p className="mt-2 text-muted-foreground">
          Esta propiedad no existe o ya no se encuentra disponible.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
