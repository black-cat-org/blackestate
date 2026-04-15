"use client"

import { Check, Copy } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ShareLinkItemProps {
  icon: ReactNode
  label: string
  url: string
}

export function ShareLinkItem({ icon, label, url }: ShareLinkItemProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Link copiado")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-sm font-medium w-24 shrink-0">{label}</span>
      <span className="text-muted-foreground truncate text-xs flex-1 min-w-0">
        {url}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4" />
        )}
        <span className="sr-only">Copiar link de {label}</span>
      </Button>
    </div>
  )
}
