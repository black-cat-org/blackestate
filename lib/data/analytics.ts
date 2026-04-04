import { getLeads } from "@/lib/data/leads"
import { getProperties } from "@/lib/data/properties"
import { getAppointments, getSentPropertiesAll } from "@/lib/data/bot"
import { LEAD_STATUS_LABELS } from "@/lib/constants/lead"
import { SOURCE_LABELS } from "@/lib/constants/sources"
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import type {
  StatCardData,
  FunnelStep,
  TimeSeriesPoint,
  SourceMetric,
  PropertyRanking,
  ZonePricing,
  PipelineStage,
  FinancialOperation,
  HeatmapCell,
  BotFunnelStep,
  AlertItem,
} from "@/lib/types/analytics"
import type { LeadStatus } from "@/lib/types/lead"

// ============================================================
// Shared helpers
// ============================================================

const MONTHS_6 = ["Sep", "Oct", "Nov", "Dic", "Ene", "Feb"]

const STATUS_HSL: Record<LeadStatus, string> = {
  nuevo: "hsl(217, 91%, 60%)",
  contactado: "hsl(45, 93%, 47%)",
  interesado: "hsl(271, 91%, 65%)",
  ganado: "hsl(142, 71%, 45%)",
  perdido: "hsl(0, 72%, 51%)",
  descartado: "hsl(0, 0%, 60%)",
}

/** Deterministic pseudo-value based on two indices. Never uses Math.random(). */
function synth(base: number, i: number, j: number = 0): number {
  return base + i * 3 + (i % 3) * 2 + j * 5
}

// ============================================================
// Overview tab
// ============================================================

export async function getOverviewStats(): Promise<StatCardData[]> {
  const leads = await getLeads()

  const newLeads = leads.filter((l) => l.status === "nuevo").length
  const closedLeads = leads.filter((l) => l.status === "ganado").length
  const total = leads.length
  const conversionRate = total > 0 ? Math.round((closedLeads / total) * 1000) / 10 : 0

  const pipelineValue = 1200000
  const commissionRate = 0.03
  const commissionValue = Math.round(pipelineValue * commissionRate)
  const leadsPerSale = conversionRate > 0 ? Math.round(100 / conversionRate) : 0

  return [
    {
      title: "Leads nuevos",
      value: newLeads,
      subtitle: "Últimos 30 días",
      change: 12.5,
      helpText: "Son las personas que se contactaron contigo en este período. Cada vez que alguien escribe al bot o llena el formulario de una propiedad, se cuenta como un lead nuevo. Por ejemplo, si en los últimos 30 días 8 personas preguntaron por tus propiedades, tu número es 8. El porcentaje muestra si recibes más o menos consultas que en el período anterior.",
      contextLine: `${newLeads} personas preguntaron por tus propiedades este mes`,
    },
    {
      title: "Tasa de conversión",
      value: `${conversionRate}%`,
      subtitle: "Ganados / total",
      change: 3.2,
      helpText: "De cada 100 personas que se contactaron contigo, cuántas terminaron comprando o alquilando. Si tuviste 8 leads y cerraste 1 venta, tu tasa es 12.5%. Un número más alto significa que estás convirtiendo mejor tus consultas en ventas reales.",
      contextLine: leadsPerSale > 0 ? `1 de cada ${leadsPerSale} leads termina en venta` : "Aún no tienes ventas cerradas",
    },
    {
      title: "Valor del pipeline",
      value: `US$ ${(pipelineValue / 1000).toLocaleString("es-BO")}K`,
      subtitle: "Oportunidades activas",
      change: -5.1,
      helpText: "Es la suma del precio de todas las propiedades que tienen interesados activos en este momento. Si tienes 3 leads interesados en propiedades de $200k, $300k y $400k, tu valor en negociación es $900k. No es dinero que ya ganaste, es el potencial de lo que está en juego ahora mismo.",
      contextLine: `tienes US$ ${(pipelineValue / 1000).toLocaleString("es-BO")}K en propiedades con interesados activos`,
    },
    {
      title: "Comisiones estimadas",
      value: `US$ ${(commissionValue / 1000).toLocaleString("es-BO")}K`,
      subtitle: `${(commissionRate * 100)}% sobre negociación`,
      change: 8.3,
      helpText: "Es una estimación de cuánto ganarías si cierras todas las negociaciones activas, calculado sobre el porcentaje de comisión que configuraste en tu perfil. Es una estimación, no un número garantizado. Te ayuda a visualizar el valor de tu cartera actual.",
      contextLine: `podrías ganar US$ ${(commissionValue / 1000).toLocaleString("es-BO")}K si cierras todo lo que tienes hoy`,
    },
  ]
}

export async function getLeadsTrend(): Promise<TimeSeriesPoint[]> {
  return MONTHS_6.map((date, i) => ({
    date,
    actual: 5 + i * 2 + ((i + 1) % 3),
    anterior: 3 + i * 1.5 + (i % 2),
  }))
}

export async function getConversionsByMonth(): Promise<TimeSeriesPoint[]> {
  return MONTHS_6.map((date, i) => ({
    date,
    ganados: synth(1, i),
    perdidos: synth(2, i, 1),
  }))
}

export async function getLeadsSourceDistribution(): Promise<
  { source: string; label: string; count: number; percentage: number }[]
> {
  const leads = await getLeads()
  const counts: Record<string, number> = {}

  for (const lead of leads) {
    const key = lead.source ?? "otro"
    counts[key] = (counts[key] || 0) + 1
  }

  const total = leads.length
  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      label: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? "Otro",
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getAlerts(): Promise<AlertItem[]> {
  const [leads, appointments] = await Promise.all([
    getLeads(),
    getAppointments(),
  ])

  const alerts: AlertItem[] = []

  // Leads in "nuevo" status created >48h ago
  const now = new Date()
  const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const staleLeads = leads.filter(
    (l) => l.status === "nuevo" && new Date(l.createdAt) < threshold48h
  )
  for (const lead of staleLeads) {
    alerts.push({
      id: `alert-lead-${lead.id}`,
      type: "warning",
      title: "Lead sin contactar",
      description: `${lead.name} lleva más de 48hs sin ser contactado`,
      actionUrl: `/dashboard/leads/${lead.id}`,
      actionLabel: "Ver lead",
    })
  }

  // Appointments with "solicitada" status (pending confirmation)
  const pendingAppts = appointments.filter((a) => a.status === "solicitada")
  for (const apt of pendingAppts) {
    alerts.push({
      id: `alert-apt-${apt.id}`,
      type: "urgent",
      title: "Cita por confirmar",
      description: `${apt.leadName} pidió visitar "${apt.propertyTitle}"`,
      actionUrl: "/dashboard/appointments",
      actionLabel: "Ver cita",
    })
  }

  return alerts
}

export async function getHighlights(): Promise<string[]> {
  const [leads, appointments] = await Promise.all([
    getLeads(),
    getAppointments(),
  ])

  const highlights: string[] = []

  const ganados = leads.filter((l) => l.status === "ganado").length
  if (ganados > 0) highlights.push(`Cerraste ${ganados} venta${ganados > 1 ? "s" : ""} este período`)

  const sources: Record<string, number> = {}
  for (const l of leads) {
    const s = l.source ?? "otro"
    sources[s] = (sources[s] || 0) + 1
  }
  const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0]
  if (topSource) {
    const sourceNames: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", whatsapp: "WhatsApp", tiktok: "TikTok", otro: "Otro" }
    highlights.push(`Tu mejor fuente fue ${sourceNames[topSource[0]] || topSource[0]} con ${topSource[1]} leads`)
  }

  const botAppointments = appointments.filter((a) => a.status === "confirmada" || a.status === "completada").length
  if (botAppointments > 0) highlights.push(`El bot agendó ${botAppointments} cita${botAppointments > 1 ? "s" : ""} sin tu intervención`)

  const interesados = leads.filter((l) => l.status === "interesado").length
  if (interesados > 0) highlights.push(`Tienes ${interesados} lead${interesados > 1 ? "s" : ""} activamente interesado${interesados > 1 ? "s" : ""}`)

  return highlights
}

// ============================================================
// Leads tab
// ============================================================

export async function getLeadsStats(): Promise<StatCardData[]> {
  const leads = await getLeads()
  const activeLeads = leads.filter((l) => l.status !== "descartado")
  const total = activeLeads.length
  const closed = activeLeads.filter((l) => l.status === "ganado").length
  const closeRate = total > 0 ? Math.round((closed / total) * 1000) / 10 : 0

  const avgCloseDays = 12
  const leadsPerClose = closeRate > 0 ? Math.round(100 / closeRate) : 0
  const contacted = activeLeads.filter((l) => l.status !== "nuevo").length
  const responded = activeLeads.filter((l) => l.status === "contactado" || l.status === "interesado" || l.status === "ganado").length
  const responseRate = contacted > 0 ? Math.round((responded / contacted) * 1000) / 10 : 0
  const responsePer10 = contacted > 0 ? Math.round((responded / contacted) * 10) : 0

  return [
    {
      title: "Total leads",
      value: total,
      subtitle: "Sin contar descartados",
      change: 15.0,
      helpText: "Incluye todos los leads que tienen potencial de negocio: nuevos, contactados, interesados, ganados y perdidos. No incluye los que descartaste manualmente porque ya no representan una oportunidad. Por ejemplo, si llegaron 10 personas y descartaste 2, tu total es 8.",
      contextLine: `${total} personas con potencial de negocio este período`,
    },
    {
      title: "Tiempo promedio de cierre",
      value: `${avgCloseDays} días`,
      subtitle: "Desde contacto hasta cierre",
      change: -8.0,
      helpText: "Es el promedio de días que pasaron desde que un lead llegó hasta que se cerró la venta o el alquiler. Si un lead llegó el 1 de enero y cerraste el 13 de enero, ese lead tardó 12 días. Un número más bajo significa que estás cerrando más rápido.",
      contextLine: `tus ventas tardan en promedio ${avgCloseDays} días en cerrarse`,
    },
    {
      title: "Tasa de cierre",
      value: `${closeRate}%`,
      subtitle: "Leads ganados",
      change: 3.2,
      helpText: "De cada 100 leads con potencial, cuántos terminaron en una venta o alquiler cerrado. No cuenta los descartados en el cálculo. Si tuviste 7 leads activos y cerraste 1, tu tasa es 14.3%. Un número más alto significa que estás convirtiendo mejor.",
      contextLine: leadsPerClose > 0 ? `1 de cada ${leadsPerClose} leads termina en venta o alquiler` : "Aún no tienes cierres registrados",
    },
    {
      title: "Tasa de respuesta",
      value: `${responseRate}%`,
      subtitle: "Respondieron al bot",
      change: 5.4,
      helpText: "De cada 100 personas que el bot contactó, cuántas respondieron al menos un mensaje. Si el bot contactó a 8 leads y 6 respondieron, tu tasa es 75%. Un número bajo puede significar que los leads no son de buena calidad o que el mensaje inicial del bot no está enganchando.",
      contextLine: `${responsePer10} de cada 10 personas que el bot contacta responden`,
    },
  ]
}

export async function getConversionFunnel(): Promise<FunnelStep[]> {
  const leads = await getLeads()
  const statusOrder: LeadStatus[] = ["nuevo", "contactado", "interesado", "ganado", "perdido", "descartado"]

  return statusOrder.map((status) => ({
    label: LEAD_STATUS_LABELS[status],
    value: leads.filter((l) => l.status === status).length,
    fill: STATUS_HSL[status],
  }))
}

export async function getLeadsBySourceOverTime(): Promise<TimeSeriesPoint[]> {
  const sources = ["facebook", "instagram", "whatsapp", "tiktok", "otro"]
  return MONTHS_6.map((date, i) => {
    const point: TimeSeriesPoint = { date }
    for (let j = 0; j < sources.length; j++) {
      point[sources[j]] = synth(1, i, j)
    }
    return point
  })
}

export async function getConversionBySource(): Promise<SourceMetric[]> {
  const leads = await getLeads()
  const sourceKeys = ["facebook", "instagram", "whatsapp", "tiktok", "otro"]

  return sourceKeys.map((source, idx) => {
    const sourceLeads = leads.filter(
      (l) => (l.source ?? "otro") === source
    )
    const count = sourceLeads.length
    const closed = sourceLeads.filter((l) => l.status === "ganado").length
    const realRate = count > 0 ? Math.round((closed / count) * 1000) / 10 : 0
    // Use real rate if available, otherwise deterministic mock so chart isn't empty
    const mockRates = [25, 50, 15, 10, 5]
    const conversionRate = realRate > 0 ? realRate : mockRates[idx]
    const revenueValues = [18500, 12000, 8500, 4200, 2800]

    return {
      source,
      label: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? "Otro",
      count,
      conversionRate,
      revenue: revenueValues[idx],
    }
  })
}

export async function getResponseTimeMetrics(): Promise<{
  average: number
  meta: number
  distribution: { fast: number; medium: number; slow: number }
}> {
  return {
    average: 8,
    meta: 5,
    distribution: {
      fast: 60,
      medium: 25,
      slow: 15,
    },
  }
}

export async function getLeadsByPropertyType(): Promise<
  { type: string; label: string; count: number }[]
> {
  const [leads, properties] = await Promise.all([getLeads(), getProperties()])

  const propertyTypeMap: Record<string, string> = {}
  for (const p of properties) {
    propertyTypeMap[p.id] = p.type
  }

  const counts: Record<string, number> = {}
  for (const lead of leads) {
    const pType = propertyTypeMap[lead.propertyId]
    if (pType) {
      counts[pType] = (counts[pType] || 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label: PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? type,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================
// Properties tab
// ============================================================

export async function getPropertiesStats(): Promise<StatCardData[]> {
  const properties = await getProperties()
  const active = properties.filter((p) => p.status === "activa")

  // Average price in USD for active properties with USD pricing
  const usdPrices = active
    .filter((p) => p.price.currency === "USD")
    .map((p) => p.price.amount)
  const avgPriceUsd =
    usdPrices.length > 0
      ? Math.round(usdPrices.reduce((a, b) => a + b, 0) / usdPrices.length)
      : 0

  // Occupancy: vendida+alquilada out of total non-borrador
  const nonDraft = properties.filter((p) => p.status !== "borrador")
  const occupied = properties.filter(
    (p) => p.status === "vendida" || p.status === "alquilada"
  )
  const occupancy =
    nonDraft.length > 0
      ? Math.round((occupied.length / nonDraft.length) * 1000) / 10
      : 0

  return [
    {
      title: "Propiedades activas",
      value: active.length,
      subtitle: "Publicadas y disponibles",
      change: 5.0,
    },
    {
      title: "Días promedio en mercado",
      value: 45,
      subtitle: "Tiempo hasta venta/alquiler",
      change: -3.5,
    },
    {
      title: "Precio promedio USD",
      value: `$${avgPriceUsd.toLocaleString("en-US")}`,
      subtitle: "Propiedades activas en USD",
      change: 2.1,
    },
    {
      title: "Tasa de ocupación",
      value: `${occupancy}%`,
      subtitle: "Vendidas + alquiladas",
      change: 4.8,
    },
  ]
}

export async function getInventoryStatus(): Promise<
  { status: string; label: string; count: number; percentage: number; fill: string }[]
> {
  const properties = await getProperties()
  const total = properties.length

  const statusColors: Record<string, string> = {
    activa: "hsl(142, 71%, 45%)",
    pausada: "hsl(25, 95%, 53%)",
    vendida: "hsl(217, 91%, 60%)",
    alquilada: "hsl(271, 91%, 65%)",
    borrador: "hsl(0, 0%, 75%)",
    en_revision: "hsl(45, 93%, 47%)",
    rechazada: "hsl(0, 84%, 60%)",
  }

  const counts: Record<string, number> = {}
  for (const p of properties) {
    counts[p.status] = (counts[p.status] || 0) + 1
  }

  return Object.entries(counts)
    .map(([status, count]) => ({
      status,
      label: PROPERTY_STATUS_LABELS[status as keyof typeof PROPERTY_STATUS_LABELS] ?? status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      fill: statusColors[status] ?? "hsl(0, 0%, 50%)",
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getAvgPriceByZone(): Promise<ZonePricing[]> {
  const properties = await getProperties()

  const zoneMap: Record<string, { totalPrice: number; totalPricePerM2: number; count: number; withArea: number }> = {}

  for (const p of properties) {
    const zone = p.address.neighborhood || p.address.city
    if (!zoneMap[zone]) {
      zoneMap[zone] = { totalPrice: 0, totalPricePerM2: 0, count: 0, withArea: 0 }
    }
    zoneMap[zone].totalPrice += p.price.amount
    zoneMap[zone].count += 1

    if (p.totalArea && p.totalArea.value > 0) {
      zoneMap[zone].totalPricePerM2 += p.price.amount / p.totalArea.value
      zoneMap[zone].withArea += 1
    }
  }

  return Object.entries(zoneMap)
    .map(([zone, data]) => ({
      zone,
      avgPrice: Math.round(data.totalPrice / data.count),
      avgPricePerM2: data.withArea > 0 ? Math.round(data.totalPricePerM2 / data.withArea) : 0,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getPropertyTypeDistribution(): Promise<
  { type: string; label: string; count: number; percentage: number }[]
> {
  const properties = await getProperties()
  const total = properties.length
  const counts: Record<string, number> = {}

  for (const p of properties) {
    counts[p.type] = (counts[p.type] || 0) + 1
  }

  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label: PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getPricePerM2ByZone(): Promise<ZonePricing[]> {
  const properties = await getProperties()

  const zoneMap: Record<string, { totalPrice: number; totalPricePerM2: number; count: number; withArea: number }> = {}

  for (const p of properties) {
    if (!p.totalArea || p.totalArea.value === 0) continue
    const zone = p.address.neighborhood || p.address.city
    if (!zoneMap[zone]) {
      zoneMap[zone] = { totalPrice: 0, totalPricePerM2: 0, count: 0, withArea: 0 }
    }
    const pricePerM2 = p.price.amount / p.totalArea.value
    zoneMap[zone].totalPricePerM2 += pricePerM2
    zoneMap[zone].totalPrice += p.price.amount
    zoneMap[zone].count += 1
    zoneMap[zone].withArea += 1
  }

  return Object.entries(zoneMap)
    .map(([zone, data]) => ({
      zone,
      avgPrice: data.count > 0 ? Math.round(data.totalPrice / data.count) : 0,
      avgPricePerM2: data.withArea > 0 ? Math.round(data.totalPricePerM2 / data.withArea) : 0,
      count: data.count,
    }))
    .sort((a, b) => b.avgPricePerM2 - a.avgPricePerM2)
}

export async function getTopProperties(): Promise<PropertyRanking[]> {
  const [leads, properties, appointments] = await Promise.all([
    getLeads(),
    getProperties(),
    getAppointments(),
  ])

  // Count leads per property
  const leadCounts: Record<string, number> = {}
  for (const l of leads) {
    leadCounts[l.propertyId] = (leadCounts[l.propertyId] || 0) + 1
  }

  // Count appointments per property
  const aptCounts: Record<string, number> = {}
  for (const a of appointments) {
    aptCounts[a.propertyId] = (aptCounts[a.propertyId] || 0) + 1
  }

  // Build ranking from properties that have at least 1 lead
  const ranked = properties
    .filter((p) => (leadCounts[p.id] || 0) > 0)
    .map((p) => ({
      id: p.id,
      title: p.title,
      leads: leadCounts[p.id] || 0,
      visits: (leadCounts[p.id] || 0) * 3 + 5, // deterministic mock visits
      appointments: aptCounts[p.id] || 0,
    }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 5)

  return ranked
}

export async function getPriceTrendByZone(): Promise<TimeSeriesPoint[]> {
  const properties = await getProperties()

  // Get unique zones from properties
  const zones = [...new Set(
    properties
      .map((p) => p.address.neighborhood || p.address.city)
      .filter(Boolean)
  )].slice(0, 5) // limit to 5 zones

  return MONTHS_6.map((date, i) => {
    const point: TimeSeriesPoint = { date }
    for (let j = 0; j < zones.length; j++) {
      // Deterministic trend: base price varies by zone, slight upward trend
      const basePrices = [1400, 1200, 150, 900, 2100]
      point[zones[j]] = basePrices[j % basePrices.length] + i * (20 + j * 10) + ((i + j) % 3) * 30
    }
    return point
  })
}

// ============================================================
// Financial tab
// ============================================================

export async function getFinancialStats(): Promise<StatCardData[]> {
  return [
    {
      title: "Comisiones cobradas",
      value: "$36K",
      subtitle: "Acumulado del período",
      change: 8.0,
    },
    {
      title: "Ingreso proyectado",
      value: "$52K",
      subtitle: "Próximos 90 días",
      change: 12.5,
    },
    {
      title: "Valor del pipeline",
      value: "$1.2M",
      subtitle: "Oportunidades abiertas",
      change: -5.1,
    },
    {
      title: "Comisión promedio",
      value: "$4.5K",
      subtitle: "Por operación cerrada",
      change: 3.7,
    },
  ]
}

export async function getRevenueByMonth(): Promise<TimeSeriesPoint[]> {
  return MONTHS_6.map((date, i) => ({
    date,
    ingreso: synth(3000, i * 800, i),
    meta: 8000 + i * 500,
  }))
}

export async function getPipelineByStage(): Promise<PipelineStage[]> {
  return [
    {
      stage: "interesado",
      label: "Interesado",
      value: 580000,
      probability: 30,
      fill: "hsl(142, 71%, 45%)",
    },
    {
      stage: "negociacion",
      label: "Negociación",
      value: 320000,
      probability: 50,
      fill: "hsl(45, 93%, 47%)",
    },
    {
      stage: "cierre_proximo",
      label: "Cierre próximo",
      value: 180000,
      probability: 80,
      fill: "hsl(25, 95%, 53%)",
    },
    {
      stage: "ganado",
      label: "Ganado",
      value: 120000,
      probability: 100,
      fill: "hsl(271, 91%, 65%)",
    },
  ]
}

export async function getCommissionsBySource(): Promise<
  { source: string; label: string; amount: number }[]
> {
  return [
    { source: "facebook", label: "Facebook", amount: 14500 },
    { source: "instagram", label: "Instagram", amount: 9800 },
    { source: "whatsapp", label: "WhatsApp", amount: 6200 },
    { source: "tiktok", label: "TikTok", amount: 3500 },
    { source: "otro", label: "Otro", amount: 2000 },
  ]
}

export async function getCommissionsByOperationType(): Promise<
  { type: string; label: string; amount: number; percentage: number }[]
> {
  return [
    {
      type: "venta",
      label: OPERATION_TYPE_LABELS["venta"],
      amount: 23400,
      percentage: 65,
    },
    {
      type: "alquiler",
      label: OPERATION_TYPE_LABELS["alquiler"],
      amount: 9000,
      percentage: 25,
    },
    {
      type: "temporal",
      label: OPERATION_TYPE_LABELS["temporal"],
      amount: 3600,
      percentage: 10,
    },
  ]
}

export async function getTopOperations(): Promise<FinancialOperation[]> {
  return [
    {
      id: "op1",
      propertyTitle: "Casa moderna en Palermo",
      operationType: "venta",
      propertyValue: 450000,
      commission: 13500, // 3%
      source: "facebook",
      closedAt: "2026-02-15T10:00:00Z",
    },
    {
      id: "op2",
      propertyTitle: "PH reciclado en Villa Crespo",
      operationType: "venta",
      propertyValue: 185000,
      commission: 5550, // 3%
      source: "instagram",
      closedAt: "2026-02-01T11:00:00Z",
    },
    {
      id: "op3",
      propertyTitle: "Dpto 3 amb temporal en Recoleta",
      operationType: "temporal",
      propertyValue: 1800,
      commission: 1800, // 1 month rent
      source: "whatsapp",
      closedAt: "2026-01-20T14:00:00Z",
    },
    {
      id: "op4",
      propertyTitle: "Departamento 2 amb en Belgrano",
      operationType: "alquiler",
      propertyValue: 650000,
      commission: 650000, // 1 month rent (ARS)
      source: "facebook",
      closedAt: "2026-01-10T09:00:00Z",
    },
    {
      id: "op5",
      propertyTitle: "Cabaña en Bariloche con vista al lago",
      operationType: "venta",
      propertyValue: 290000,
      commission: 8700, // 3%
      source: "instagram",
      closedAt: "2025-12-18T16:00:00Z",
    },
  ]
}

// ============================================================
// Bot tab
// ============================================================

export async function getBotStats(): Promise<StatCardData[]> {
  return [
    {
      title: "Mensajes enviados",
      value: 156,
      subtitle: "Últimos 30 días",
      change: 22.5,
    },
    {
      title: "Tasa de respuesta",
      value: "72%",
      subtitle: "Clientes que respondieron",
      change: 5.3,
    },
    {
      title: "Citas agendadas",
      value: 18,
      subtitle: "Por el bot",
      change: 15.0,
    },
    {
      title: "Propiedades enviadas",
      value: 43,
      subtitle: "Fichas compartidas",
      change: 31.2,
    },
  ]
}

export async function getBotActivityByDay(): Promise<TimeSeriesPoint[]> {
  const points: TimeSeriesPoint[] = []
  for (let i = 0; i < 30; i++) {
    const day = 27 + i // start from Jan 27 to Feb 25
    const month = day > 31 ? 2 : 1
    const dayOfMonth = day > 31 ? day - 31 : day
    const dateStr = `${month === 1 ? "Ene" : "Feb"} ${dayOfMonth}`

    // Deterministic values: higher on weekdays (0-4), lower on weekends (5-6)
    const dayOfWeek = (i + 1) % 7 // Tue start
    const isWeekend = dayOfWeek >= 5
    const mensajes = isWeekend ? 2 + (i % 3) : 5 + (i % 4) * 2 + ((i + 1) % 3)
    const propiedades = isWeekend ? 1 + (i % 2) : 2 + (i % 3) + ((i + 2) % 2)

    points.push({ date: dateStr, mensajes, propiedades })
  }
  return points
}

export async function getBotFunnel(): Promise<BotFunnelStep[]> {
  const sentProperties = await getSentPropertiesAll()

  const statusCounts = {
    enviada: 0,
    vista: 0,
    interesado: 0,
    cita_agendada: 0,
  }

  for (const sp of sentProperties) {
    // Each status represents progression: a "vista" was also "enviada", etc.
    statusCounts.enviada++
    if (sp.status === "vista" || sp.status === "interesado" || sp.status === "cita_agendada") {
      statusCounts.vista++
    }
    if (sp.status === "interesado" || sp.status === "cita_agendada") {
      statusCounts.interesado++
    }
    if (sp.status === "cita_agendada") {
      statusCounts.cita_agendada++
    }
  }

  const total = statusCounts.enviada

  return [
    {
      label: "Enviadas",
      value: statusCounts.enviada,
      percentage: 100,
      fill: "hsl(217, 91%, 60%)",
    },
    {
      label: "Vistas",
      value: statusCounts.vista,
      percentage: total > 0 ? Math.round((statusCounts.vista / total) * 1000) / 10 : 0,
      fill: "hsl(45, 93%, 47%)",
    },
    {
      label: "Interesados",
      value: statusCounts.interesado,
      percentage: total > 0 ? Math.round((statusCounts.interesado / total) * 1000) / 10 : 0,
      fill: "hsl(142, 71%, 45%)",
    },
    {
      label: "Cita agendada",
      value: statusCounts.cita_agendada,
      percentage: total > 0 ? Math.round((statusCounts.cita_agendada / total) * 1000) / 10 : 0,
      fill: "hsl(271, 91%, 65%)",
    },
  ]
}

export async function getEngagementHeatmap(): Promise<HeatmapCell[]> {
  const cells: HeatmapCell[] = []

  for (let day = 0; day < 7; day++) {
    for (let hour = 8; hour <= 20; hour++) {
      // Deterministic: higher on weekdays (0-4) during work hours (10-18)
      const isWeekday = day < 5
      const isWorkHour = hour >= 10 && hour <= 18
      const isPeakHour = hour >= 11 && hour <= 14

      let value = 1
      if (isWeekday && isWorkHour) {
        value = 5 + (day % 3) + ((hour - 10) % 4)
        if (isPeakHour) value += 3
      } else if (isWeekday) {
        value = 2 + (day % 2)
      } else {
        // Weekend
        value = 1 + ((day + hour) % 3)
      }

      cells.push({ day, hour, value })
    }
  }

  return cells
}

export async function getAppointmentOutcomes(): Promise<
  { status: string; label: string; count: number; percentage: number; fill: string }[]
> {
  const appointments = await getAppointments()
  const total = appointments.length

  const statusLabels: Record<string, string> = {
    solicitada: "Solicitada",
    confirmada: "Confirmada",
    completada: "Completada",
    cancelada: "Cancelada",
  }

  const statusColors: Record<string, string> = {
    solicitada: "hsl(45, 93%, 47%)",
    confirmada: "hsl(217, 91%, 60%)",
    completada: "hsl(142, 71%, 45%)",
    cancelada: "hsl(0, 84%, 60%)",
  }

  const counts: Record<string, number> = {}
  for (const apt of appointments) {
    counts[apt.status] = (counts[apt.status] || 0) + 1
  }

  return Object.entries(counts)
    .map(([status, count]) => ({
      status,
      label: statusLabels[status] ?? status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      fill: statusColors[status] ?? "hsl(0, 0%, 50%)",
    }))
    .sort((a, b) => b.count - a.count)
}
