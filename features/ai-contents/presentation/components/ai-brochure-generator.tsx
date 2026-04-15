"use client"

import { useState } from "react"
import { FileDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { formatPrice, formatSurface } from "@/lib/utils/format"
import { createAiContentAction } from "@/features/ai-contents/presentation/actions"
import type { Property } from "@/features/properties/domain/property.entity"

interface AiBrochureGeneratorProps {
  property: Property
  onGenerated?: () => void
}

export function AiBrochureGenerator({ property, onGenerated }: AiBrochureGeneratorProps) {
  const [loading, setLoading] = useState(false)
  async function handleGenerate() {
    setLoading(true)
    try {
      const { default: jsPDF } = await import("jspdf")
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20
      const contentWidth = pageWidth - margin * 2
      let y = margin

      // Header
      doc.setFillColor(24, 24, 27)
      doc.rect(0, 0, pageWidth, 45, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text("BLACK ESTATE", margin, 18)
      doc.setFontSize(18)
      doc.text(property.title, margin, 32)
      y = 55

      // Type + Operation
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(12)
      doc.text(
        `${PROPERTY_TYPE_LABELS[property.type]} en ${OPERATION_TYPE_LABELS[property.operationType]}`,
        margin,
        y
      )
      y += 10

      // Price
      doc.setFontSize(16)
      doc.setTextColor(24, 24, 27)
      doc.text(formatPrice(property.price), margin, y)
      if (property.negotiable) {
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(" (Precio negociable)", margin + doc.getTextWidth(formatPrice(property.price)) + 2, y)
      }
      y += 12

      // Divider
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 10

      // Specs grid
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      const specs: [string, string][] = []
      if (property.totalArea) specs.push(["Superficie total", formatSurface(property.totalArea)])
      if (property.coveredArea) specs.push(["Superficie cubierta", formatSurface(property.coveredArea)])
      if (property.bedrooms) specs.push(["Dormitorios", String(property.bedrooms)])
      if (property.bathrooms) specs.push(["Baños", String(property.bathrooms)])
      if (property.garages) specs.push(["Estacionamiento", String(property.garages)])
      if (property.age !== undefined) specs.push(["Antigüedad", `${property.age} años`])

      for (const [label, value] of specs) {
        doc.setFont("helvetica", "bold")
        doc.text(`${label}:`, margin, y)
        doc.setFont("helvetica", "normal")
        doc.text(value, margin + 55, y)
        y += 7
      }
      y += 5

      // Location
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Ubicación", margin, y)
      y += 8
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      const address = [
        property.address.street,
        property.address.number,
        property.address.neighborhood,
        property.address.city,
        property.address.state,
      ]
        .filter(Boolean)
        .join(", ")
      doc.text(address, margin, y)
      y += 12

      // Description
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Descripción", margin, y)
      y += 8
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      const descText = property.shortDescription || property.description
      const lines = doc.splitTextToSize(descText, contentWidth)
      doc.text(lines, margin, y)
      y += lines.length * 5 + 10

      // Amenities
      if (property.amenities.length > 0) {
        if (y > 250) {
          doc.addPage()
          y = margin
        }
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, y, pageWidth - margin, y)
        y += 10
        doc.setFont("helvetica", "bold")
        doc.setFontSize(12)
        doc.text("Amenities", margin, y)
        y += 8
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        const amenityText = property.amenities
          .map((a) => {
            const opt = [
              { value: "pool", label: "Pileta" },
              { value: "grill_area", label: "Quincho" },
              { value: "grill", label: "Parrilla" },
              { value: "garden", label: "Jardín" },
              { value: "terrace", label: "Terraza" },
              { value: "balcony", label: "Balcón" },
              { value: "laundry", label: "Lavadero" },
              { value: "gym", label: "Gimnasio" },
              { value: "security", label: "Seguridad 24hs" },
              { value: "elevator", label: "Ascensor" },
              { value: "heating", label: "Calefacción" },
              { value: "air_conditioning", label: "Aire acondicionado" },
              { value: "hot_water", label: "Agua caliente" },
              { value: "natural_gas", label: "Gas natural" },
              { value: "sum", label: "SUM" },
              { value: "playroom", label: "Playroom" },
              { value: "solarium", label: "Solarium" },
              { value: "storage_unit", label: "Baulera" },
            ].find((o) => o.value === a)
            return opt?.label || a
          })
          .join(" • ")
        const amenityLines = doc.splitTextToSize(amenityText, contentWidth)
        doc.text(amenityLines, margin, y)
        y += amenityLines.length * 5 + 10
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 15
      doc.setFillColor(245, 245, 245)
      doc.rect(0, footerY - 5, pageWidth, 25, "F")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text("Black Estate — Gestión inmobiliaria profesional", margin, footerY)
      doc.text("gonzalo@blackestate.com", margin, footerY + 5)

      doc.save(`${property.title.replace(/\s+/g, "-").toLowerCase()}-brochure.pdf`)
      await createAiContentAction({
        propertyId: property.id,
        propertyTitle: property.title,
        type: "brochure",
        text: "Brochure PDF generado",
      })
      toast.success("Brochure PDF descargado")
      onGenerated?.()
    } catch {
      toast.error("Error al generar el PDF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="size-5" />
          Brochure PDF
        </CardTitle>
        <CardDescription>
          Genera un PDF profesional con la información y fotos de la propiedad
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <>
              <Sparkles className="size-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileDown className="size-4" />
              Generar brochure
            </>
          )}
        </Button>
        {loading && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
