"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Error boundary for the /dashboard segment.
 *
 * The dashboard layout + page now issue several DB calls (org list, pending
 * invitations, stats, charts). Without a co-located error.tsx, any single
 * failure would bubble up to the root boundary and replace the whole shell
 * with a generic error page. Handling the failure here lets the sidebar +
 * header stay intact and offers the user a concrete recovery action.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard] render error", error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center gap-3">
          <AlertTriangle className="size-5 text-destructive" />
          <div>
            <CardTitle>No pudimos cargar el dashboard</CardTitle>
            <CardDescription>
              Hubo un problema al traer tus datos. Intenta de nuevo en unos segundos.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} className="w-full">
            <RefreshCw className="size-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
