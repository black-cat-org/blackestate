"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TrendingUp, TrendingDown, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface AnalyticsStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  icon: LucideIcon
  helpText?: string
  contextLine?: string
}

export function AnalyticsStatCard({ title, value, subtitle, change, icon: Icon, helpText, contextLine }: AnalyticsStatCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">{title}</p>
            {helpText && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    <HelpCircle className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="max-w-xs text-xs leading-relaxed" side="top">
                  {helpText}
                </PopoverContent>
              </Popover>
            )}
          </div>
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
          {contextLine && (
            <p className="mt-1 text-[11px] text-muted-foreground italic">{contextLine}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
