import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface AnalyticsStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  icon: LucideIcon
}

export function AnalyticsStatCard({ title, value, subtitle, change, icon: Icon }: AnalyticsStatCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <div className="flex items-center gap-1">
            {change !== undefined && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {change >= 0 ? "+" : ""}{change.toFixed(1)}%
              </span>
            )}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
