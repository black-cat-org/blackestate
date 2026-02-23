"use client"

import type { Property } from "@/lib/types/property"
import { AGENT_CONFIG } from "@/lib/constants/agent"
import { MessageCircleIcon } from "lucide-react"

interface LandingWhatsappButtonProps {
  property: Property
}

export function LandingWhatsappButton({ property }: LandingWhatsappButtonProps) {
  const message = AGENT_CONFIG.whatsappMessage(property.title, property.id)
  const url = `https://wa.me/${AGENT_CONFIG.phone}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Consultar por WhatsApp"
    >
      <MessageCircleIcon className="size-6" />
    </a>
  )
}
