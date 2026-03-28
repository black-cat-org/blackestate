import type { Property } from "@/lib/types/property"
import { formatPrice, formatSurface } from "@/lib/utils/format"
import { AGENT_CONFIG } from "@/lib/constants/agent"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BedDoubleIcon, BathIcon, CarIcon, RulerIcon, MessageCircleIcon } from "lucide-react"

interface LandingPriceCardProps {
  property: Property
  source: string | null
}

export function LandingPriceCard({ property, source }: LandingPriceCardProps) {
  const whatsappMessage = AGENT_CONFIG.whatsappMessage(property.title, property.id)
  const whatsappUrl = `https://wa.me/${AGENT_CONFIG.phone}?text=${encodeURIComponent(whatsappMessage)}`

  const specs = [
    property.bedrooms != null && {
      icon: BedDoubleIcon,
      value: property.bedrooms,
      label: property.bedrooms === 1 ? "dormitorio" : "dormitorios",
    },
    property.bathrooms != null && {
      icon: BathIcon,
      value: property.bathrooms,
      label: property.bathrooms === 1 ? "baño" : "baños",
    },
    property.garages != null && {
      icon: CarIcon,
      value: property.garages,
      label: "estacionamiento",
    },
    property.totalArea && {
      icon: RulerIcon,
      value: formatSurface(property.totalArea),
      label: "total",
    },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; value: string | number; label: string }[]

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatPrice(property.price)}</span>
            {property.negotiable && (
              <Badge variant="secondary">Negociable</Badge>
            )}
          </div>
          {property.expenses && (
            <p className="mt-1 text-sm text-muted-foreground">
              + {formatPrice(property.expenses)} expensas
            </p>
          )}
        </div>

        {specs.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              {specs.map((spec, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <spec.icon className="size-4 text-muted-foreground" />
                  <span>
                    {spec.value} {spec.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircleIcon className="size-4" />
              Consultar por WhatsApp
            </a>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <a href={`#contacto${source ? `?src=${source}` : ""}`}>
              Enviar consulta
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
