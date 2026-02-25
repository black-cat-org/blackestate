import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
}

export function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}
