"use client"

import { HelpCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ChartHeaderProps {
  title: string
  helpText?: string
  subtitle?: string
}

export function ChartHeader({ title, helpText, subtitle }: ChartHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <h3 className="text-base font-semibold">{title}</h3>
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
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  )
}
