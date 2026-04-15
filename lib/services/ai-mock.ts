import type { Property, PropertyFormData } from "@/features/properties/domain/property.entity"
import type { AiPlatform } from "@/lib/types/ai-content"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS, EQUIPMENT_OPTIONS, AMENITIES_OPTIONS, SURFACE_UNIT_LABELS } from "@/lib/constants/property"
import { formatPrice, formatSurface } from "@/lib/utils/format"

const delay = () => new Promise((r) => setTimeout(r, 1500))

function getAmenityLabels(amenities: string[]): string[] {
  return amenities
    .map((a) => EQUIPMENT_OPTIONS.find((o) => o.value === a)?.label
      || AMENITIES_OPTIONS.find((o) => o.value === a)?.label)
    .filter(Boolean) as string[]
}

export async function generateDescription(property: Property): Promise<string> {
  await delay()

  const tipo = PROPERTY_TYPE_LABELS[property.type].toLowerCase()
  const operacion = OPERATION_TYPE_LABELS[property.operationType].toLowerCase()
  const barrio = property.address.neighborhood || property.address.city
  const precio = formatPrice(property.price)
  const amenityLabels = getAmenityLabels(property.amenities)

  const specs: string[] = []
  if (property.totalArea) specs.push(`${formatSurface(property.totalArea)} totales`)
  if (property.coveredArea) specs.push(`${formatSurface(property.coveredArea)} cubiertos`)
  if (property.bedrooms) specs.push(`${property.bedrooms} dormitorio${property.bedrooms > 1 ? "s" : ""}`)
  if (property.bathrooms) specs.push(`${property.bathrooms} baño${property.bathrooms > 1 ? "s" : ""}`)
  if (property.garages) specs.push(`cochera para ${property.garages} vehículo${property.garages > 1 ? "s" : ""}`)

  let text = `Espectacular ${tipo} en ${operacion} ubicad${property.type === "house" || property.type === "cabin" ? "a" : "o"} en ${barrio}.`

  if (specs.length > 0) {
    text += ` Con ${specs.join(", ")}, esta propiedad es ideal para quienes buscan comodidad y calidad de vida.`
  }

  if (amenityLabels.length > 0) {
    text += `\n\nEntre sus amenities destacados se encuentran: ${amenityLabels.join(", ")}.`
  }

  if (property.orientation) {
    text += ` Orientación ${property.orientation} que garantiza excelente luminosidad natural.`
  }

  text += `\n\nPrecio: ${precio}${property.negotiable ? " (negociable)" : ""}. Ubicación privilegiada en ${property.address.city}, ${property.address.state}.`

  text += `\n\nNo pierda esta oportunidad. Contáctenos para coordinar una visita y conocer todos los detalles de esta increíble propiedad.`

  return text
}

export async function improveDescription(property: Property, existing: string): Promise<string> {
  await delay()

  const tipo = PROPERTY_TYPE_LABELS[property.type]
  const barrio = property.address.neighborhood || property.address.city

  let improved = existing

  if (!improved.includes("✅")) {
    const highlights: string[] = []
    if (property.totalArea) highlights.push(`✅ ${formatSurface(property.totalArea)} totales`)
    if (property.bedrooms) highlights.push(`✅ ${property.bedrooms} dormitorios`)
    if (property.bathrooms) highlights.push(`✅ ${property.bathrooms} baños`)
    if (property.garages) highlights.push(`✅ Cochera para ${property.garages} vehículos`)
    if (property.amenities.length > 0) {
      const labels = getAmenityLabels(property.amenities.slice(0, 3))
      highlights.push(`✅ ${labels.join(", ")}`)
    }

    if (highlights.length > 0) {
      improved += `\n\n📋 Características principales:\n${highlights.join("\n")}`
    }
  }

  improved += `\n\n📍 ${tipo} en ${barrio} — una inversión inteligente en una zona de alta demanda y constante valorización.`

  return improved
}

export async function generateCaption(
  property: Property,
  platform: AiPlatform,
  customNote?: string
): Promise<string> {
  await delay()

  const tipo = PROPERTY_TYPE_LABELS[property.type]
  const barrio = property.address.neighborhood || property.address.city
  const precio = formatPrice(property.price)

  const specs: string[] = []
  if (property.bedrooms) specs.push(`${property.bedrooms} dorms`)
  if (property.bathrooms) specs.push(`${property.bathrooms} baños`)
  if (property.totalArea) specs.push(formatSurface(property.totalArea))

  const customLine = customNote ? `\n\n💡 ${customNote}` : ""

  switch (platform) {
    case "facebook":
      return `🏠 ¡${tipo} en ${OPERATION_TYPE_LABELS[property.operationType].toLowerCase()} en ${barrio}!\n\nDescubrí esta increíble propiedad ubicada en una de las mejores zonas. ${property.description}\n\n📊 Datos clave:\n${specs.map((s) => `• ${s}`).join("\n")}\n💰 ${precio}${property.negotiable ? " (negociable)" : ""}\n📍 ${property.address.city}, ${property.address.state}${customLine}\n\n¡Contactanos para más información! 📲`

    case "instagram":
      return `✨ ${tipo} en ${barrio} ✨\n\n${specs.join(" | ")}\n💰 ${precio}\n📍 ${barrio}, ${property.address.city}${customLine}\n\n👉 Link en bio para más info`

    case "tiktok":
      return `🔥 ${tipo} INCREÍBLE en ${barrio}\n\n${specs.join(" · ")} · ${precio}${customLine}\n\n¿Te imaginás vivir acá? 👀\n📍 ${barrio}`

    case "whatsapp":
      return `¡Hola! 👋\n\nTe comparto esta propiedad que puede interesarte:\n\n🏠 *${property.title}*\n📍 ${barrio}, ${property.address.city}\n💰 ${precio}\n${specs.map((s) => `• ${s}`).join("\n")}${customLine}\n\n¿Te gustaría coordinar una visita? 📲`
  }
}

export async function generateDescriptionFromFormData(data: PropertyFormData): Promise<string> {
  await delay()

  const tipo = data.type ? PROPERTY_TYPE_LABELS[data.type].toLowerCase() : "propiedad"
  const operacion = data.operationType ? OPERATION_TYPE_LABELS[data.operationType].toLowerCase() : ""
  const barrio = data.neighborhood || data.city || ""
  const amenityLabels = getAmenityLabels(data.amenities || [])

  const specs: string[] = []
  if (data.totalArea) specs.push(`${data.totalArea} ${SURFACE_UNIT_LABELS[data.surfaceUnit]} totales`)
  if (data.coveredArea) specs.push(`${data.coveredArea} ${SURFACE_UNIT_LABELS[data.surfaceUnit]} cubiertos`)
  if (data.bedrooms) specs.push(`${data.bedrooms} dormitorio${Number(data.bedrooms) > 1 ? "s" : ""}`)
  if (data.bathrooms) specs.push(`${data.bathrooms} baño${Number(data.bathrooms) > 1 ? "s" : ""}`)
  if (data.garages) specs.push(`cochera para ${data.garages} vehículo${Number(data.garages) > 1 ? "s" : ""}`)

  let text = ""

  if (barrio && operacion) {
    text = `Espectacular ${tipo} en ${operacion} ubicad${data.type === "house" || data.type === "cabin" ? "a" : "o"} en ${barrio}.`
  } else if (barrio) {
    text = `Espectacular ${tipo} en ${barrio}.`
  } else if (data.title) {
    text = `${data.title}. Una excelente oportunidad en el mercado inmobiliario.`
  } else {
    text = `Excelente ${tipo} disponible.`
  }

  if (specs.length > 0) {
    text += ` Con ${specs.join(", ")}, esta propiedad es ideal para quienes buscan comodidad y calidad de vida.`
  }

  if (amenityLabels.length > 0) {
    text += `\n\nEntre sus amenities destacados se encuentran: ${amenityLabels.join(", ")}.`
  }

  if (data.price && data.currency) {
    text += `\n\nPrecio: ${data.currency} ${Number(data.price).toLocaleString("es-AR")}${data.negotiable ? " (negociable)" : ""}.`
  }

  if (data.city && data.state) {
    text += ` Ubicación privilegiada en ${data.city}, ${data.state}.`
  }

  text += `\n\nNo pierda esta oportunidad. Contáctenos para coordinar una visita y conocer todos los detalles de esta increíble propiedad.`

  return text
}

export async function generateShortDescriptionFromFormData(data: PropertyFormData): Promise<string> {
  await delay()

  const tipo = data.type ? PROPERTY_TYPE_LABELS[data.type].toLowerCase() : "propiedad"
  const operacion = data.operationType ? OPERATION_TYPE_LABELS[data.operationType].toLowerCase() : ""
  const barrio = data.neighborhood || data.city || ""

  const specs: string[] = []
  if (data.bedrooms) specs.push(`${data.bedrooms} dorm.`)
  if (data.bathrooms) specs.push(`${data.bathrooms} baños`)
  if (data.totalArea) specs.push(`${data.totalArea} ${SURFACE_UNIT_LABELS[data.surfaceUnit]}`)

  let text = ""
  if (barrio && operacion) {
    text = `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} en ${operacion} en ${barrio}`
  } else if (barrio) {
    text = `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} en ${barrio}`
  } else {
    text = `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} disponible`
  }

  if (specs.length > 0) {
    text += `. ${specs.join(", ")}.`
  }

  if (data.price && data.currency) {
    text += ` ${data.currency} ${Number(data.price).toLocaleString("es-AR")}.`
  }

  return text
}

export async function generateHashtags(property: Property): Promise<string[]> {
  await delay()

  const tipo = PROPERTY_TYPE_LABELS[property.type].replace(/\s/g, "")
  const barrio = (property.address.neighborhood || property.address.city).replace(/\s/g, "")
  const operacion = OPERATION_TYPE_LABELS[property.operationType].replace(/\s/g, "")

  const tags: string[] = [
    `#${tipo}En${barrio}`,
    `#${operacion}${property.address.city.replace(/\s/g, "")}`,
  ]

  if (property.bedrooms) tags.push(`#${property.bedrooms}Dormitorios`)
  if (property.totalArea) tags.push(`#${Math.round(property.totalArea.value)}m2`)

  const amenityLabels = getAmenityLabels(property.amenities.slice(0, 3))
  for (const label of amenityLabels) {
    tags.push(`#${label.replace(/\s/g, "")}`)
  }

  tags.push(`#${barrio}`, `#PropiedadesEn${property.address.state.replace(/\s/g, "")}`)

  return tags
}
