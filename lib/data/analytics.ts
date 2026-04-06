import { getLeads } from "@/lib/data/leads"
import { getProperties } from "@/lib/data/properties"
import { getAppointments, getSentPropertiesAll } from "@/lib/data/bot"
import { LEAD_STATUS_LABELS } from "@/lib/constants/lead"
import { SOURCE_LABELS } from "@/lib/constants/sources"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
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

export async function getPipelineVelocity(): Promise<
  { label: string; days: number; fill: string }[]
> {
  return [
    { label: "Nuevo → Contactado", days: 1, fill: "hsl(217, 91%, 60%)" },
    { label: "Contactado → Interesado", days: 4, fill: "hsl(45, 93%, 47%)" },
    { label: "Interesado → Ganado", days: 7, fill: "hsl(142, 71%, 45%)" },
  ]
}

export async function getPipelineExits(): Promise<
  { label: string; avgDays: number; fill: string }[]
> {
  return [
    { label: "Perdido", avgDays: 10, fill: "hsl(0, 72%, 51%)" },
    { label: "Descartado", avgDays: 3, fill: "hsl(0, 0%, 60%)" },
  ]
}

export async function getBotEngagement(): Promise<{
  engagementRate: number
  distribution: { interacted: number; viewedOnly: number; noResponse: number }
}> {
  return {
    engagementRate: 72,
    distribution: {
      interacted: 72,
      viewedOnly: 15,
      noResponse: 13,
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

  const avgDays = 45
  const totalVisits = active.length * 12

  return [
    {
      title: "Propiedades activas",
      value: active.length,
      subtitle: "Publicadas y disponibles",
      change: 5.0,
      helpText: "Son las propiedades que tienes publicadas y disponibles en este momento. Cada una tiene su página pública donde los clientes pueden ver los detalles y contactarte. Un número alto significa que tienes un buen inventario para ofrecer.",
      contextLine: `${active.length} de tus propiedades están disponibles para recibir consultas`,
    },
    {
      title: "Días promedio en mercado",
      value: avgDays,
      subtitle: "Tiempo hasta venta/alquiler",
      change: -3.5,
      helpText: "Es el promedio de días que tarda una propiedad tuya en venderse o alquilarse desde que la publicas. Si este número es alto significa que tus propiedades están tardando mucho en cerrar — puede ser por precio, fotos o descripción. Un número bajo significa que tus propiedades se mueven rápido.",
      contextLine: `en promedio tardas ${avgDays} días en cerrar una operación`,
    },
    {
      title: "Precio promedio",
      value: `US$ ${avgPriceUsd.toLocaleString("es-BO")}`,
      subtitle: "Propiedades activas",
      change: 2.1,
      helpText: "Es el precio promedio de todas tus propiedades activas. Te da una idea del rango en el que te estás moviendo y si tu portafolio está orientado a clientes de alto, medio o bajo presupuesto.",
      contextLine: "así está el precio típico de tu portafolio actual",
    },
    {
      title: "Visitas totales",
      value: totalVisits,
      subtitle: "Páginas vistas en el período",
      change: 4.8,
      helpText: "Es la cantidad de veces que clientes entraron a ver la página pública de tus propiedades en este período. Un número alto significa que estás generando interés. Si hay muchas visitas pero pocos leads significa que algo en la página no está convenciendo — puede ser el precio, las fotos o la descripción.",
      contextLine: `${totalVisits} veces entraron clientes a ver tus propiedades`,
    },
  ]
}

export async function getInventoryStatus(): Promise<
  { status: string; label: string; count: number; percentage: number; fill: string }[]
> {
  const validStatuses = [
    { status: "activa", label: "Activa", fill: "hsl(142, 71%, 45%)", count: 12 },
    { status: "pausada", label: "Pausada", fill: "hsl(25, 95%, 53%)", count: 4 },
    { status: "vendida", label: "Vendida", fill: "hsl(217, 91%, 60%)", count: 3 },
    { status: "alquilada", label: "Alquilada", fill: "hsl(271, 91%, 65%)", count: 2 },
    { status: "anticretico", label: "En anticrético", fill: "hsl(45, 93%, 47%)", count: 1 },
  ]

  const total = validStatuses.reduce((sum, s) => sum + s.count, 0)

  return validStatuses.map((s) => ({
    ...s,
    percentage: total > 0 ? Math.round((s.count / total) * 1000) / 10 : 0,
  }))
}

export async function getAvgPriceByZone(): Promise<ZonePricing[]> {
  return [
    { zone: "Equipetrol", avgPrice: 285000, avgPricePerM2: 950, count: 5 },
    { zone: "Urubó", avgPrice: 240000, avgPricePerM2: 780, count: 4 },
    { zone: "Las Palmas", avgPrice: 165000, avgPricePerM2: 620, count: 3 },
    { zone: "Norte", avgPrice: 130000, avgPricePerM2: 520, count: 4 },
    { zone: "Plan 3000", avgPrice: 48000, avgPricePerM2: 310, count: 3 },
    { zone: "Montero", avgPrice: 42000, avgPricePerM2: 250, count: 2 },
  ]
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
  // Reuse same zone data as getAvgPriceByZone for consistency
  return getAvgPriceByZone()
}

export async function getTopProperties(): Promise<PropertyRanking[]> {
  return [
    { id: "1", title: "Casa moderna en Equipetrol", leads: 8, visits: 45, appointments: 4 },
    { id: "2", title: "Departamento 2 amb en Norte", leads: 6, visits: 32, appointments: 3 },
    { id: "6", title: "PH reciclado en Las Palmas", leads: 5, visits: 28, appointments: 2 },
    { id: "3", title: "Terreno en Urubó", leads: 4, visits: 22, appointments: 2 },
    { id: "5", title: "Oficina en Equipetrol Norte", leads: 3, visits: 18, appointments: 1 },
    { id: "4", title: "Local comercial Av. San Martín", leads: 2, visits: 12, appointments: 1 },
  ]
}

export async function getPriceTrendByZone(): Promise<TimeSeriesPoint[]> {
  return MONTHS_6.map((date, i) => ({
    date,
    "Equipetrol": 270000 + i * 5000 + ((i + 1) % 3) * 3000,
    "Urubó": 220000 + i * 6000 + ((i + 2) % 3) * 2000,
    "Las Palmas": 155000 + i * 3500 + (i % 3) * 2500,
    "Norte": 120000 + i * 3000 + ((i + 1) % 3) * 2000,
    "Plan 3000": 42000 + i * 1500 + ((i + 2) % 3) * 1000,
    "Montero": 38000 + i * 1000 + (i % 3) * 800,
  }))
}

// ============================================================
// Financial tab
// ============================================================

export async function getFinancialStats(): Promise<StatCardData[]> {
  const commissionRate = 0.03
  const commissionsCobradas = 36000
  const pipelineValue = 1200000
  const pendingCommissions = Math.round(pipelineValue * commissionRate)
  const closedOps = 8
  const avgCommission = Math.round(commissionsCobradas / closedOps)

  return [
    {
      title: "Comisiones cobradas",
      value: `US$ ${(commissionsCobradas / 1000).toFixed(0)}K`,
      subtitle: "Acumulado del período",
      change: 8.0,
      helpText: "Es el dinero que ya ganaste en este período — la suma de todas las comisiones que registraste como cobradas. Si cerraste una venta de $200k con 3% de comisión y la registraste, esos $6k aparecen aquí. Solo cuenta lo que tú registras manualmente.",
      contextLine: "lo que ya ganaste en comisiones este período",
    },
    {
      title: "Comisiones pendientes",
      value: `US$ ${(pendingCommissions / 1000).toFixed(0)}K`,
      subtitle: `${(commissionRate * 100)}% sobre interesados`,
      change: 12.5,
      helpText: "Es el dinero que podrías ganar si cierras los leads que tienes activos ahora mismo en estado Interesado. No es dinero garantizado — es una estimación basada en el precio de las propiedades y tu porcentaje de comisión configurado. Te ayuda a visualizar cuánto tienes en juego.",
      contextLine: "podrías ganar esto si cierras lo que tienes activo hoy",
    },
    {
      title: "Valor del pipeline",
      value: `US$ ${(pipelineValue / 1000000).toFixed(1)}M`,
      subtitle: "Oportunidades abiertas",
      change: -5.1,
      helpText: "Es la suma del precio total de todas las propiedades que tienen leads interesados activos. Si tienes 3 leads interesados en propiedades de $100k, $200k y $300k, tu pipeline vale $600k. No es dinero que ya ganaste, es el valor de las oportunidades abiertas.",
      contextLine: "en propiedades con interesados activos ahora mismo",
    },
    {
      title: "Comisión promedio",
      value: `US$ ${(avgCommission / 1000).toFixed(1)}K`,
      subtitle: "Por operación cerrada",
      change: 3.7,
      helpText: "Es el promedio de lo que ganas por cada operación cerrada. Se calcula dividiendo el total de comisiones cobradas entre el número de ventas o alquileres cerrados en el período. Un número alto significa que estás cerrando operaciones de mayor valor.",
      contextLine: "lo que ganas en promedio por cada operación que cierras",
    },
  ]
}

export async function getRevenueByMonth(): Promise<TimeSeriesPoint[]> {
  const { getBusinessSettings } = await import("@/lib/data/settings")
  const settings = await getBusinessSettings()
  const growthRate = settings.monthlyGrowthTarget / 100

  // Realistic monthly revenue for a Bolivian real estate agent (in USD)
  const revenues = [4200, 5800, 3500, 6100, 4800, 7200]

  return MONTHS_6.map((date, i) => {
    const ingreso = revenues[i]
    // Meta = previous month * (1 + growthRate), no meta for first month
    const meta = i > 0 ? Math.round(revenues[i - 1] * (1 + growthRate)) : undefined

    return {
      date,
      ingreso,
      ...(meta !== undefined ? { meta } : {}),
    }
  })
}

export async function getPipelineByStage(): Promise<PipelineStage[]> {
  // Average commission per closed operation by type
  // Venta: ~US$ 285K property * 3% = ~US$ 8.5K avg ticket
  // Anticrético: ~US$ 120K property * 3% = ~US$ 3.6K avg ticket
  // Alquiler: ~US$ 650/month * 12 * 3% = ~US$ 234, rounded to realistic mock
  // Temporal: ~US$ 1.8K/month * 3 months * 3% = ~US$ 162
  return [
    {
      stage: "venta",
      label: "Venta",
      value: 8500,
      probability: 100,
      fill: "hsl(217, 91%, 60%)",
    },
    {
      stage: "anticretico",
      label: "Anticrético",
      value: 3600,
      probability: 100,
      fill: "hsl(45, 93%, 47%)",
    },
    {
      stage: "alquiler",
      label: "Alquiler",
      value: 1200,
      probability: 100,
      fill: "hsl(142, 71%, 45%)",
    },
    {
      stage: "temporal",
      label: "Temporal",
      value: 480,
      probability: 100,
      fill: "hsl(271, 91%, 65%)",
    },
  ]
}

export async function getCommissionsBySource(): Promise<
  { source: string; label: string; amount: number }[]
> {
  return [
    { source: "facebook", label: "Facebook", amount: 12800 },
    { source: "instagram", label: "Instagram", amount: 8500 },
    { source: "whatsapp", label: "WhatsApp", amount: 7200 },
    { source: "tiktok", label: "TikTok", amount: 4800 },
    { source: "otro", label: "Otro", amount: 2700 },
  ]
}

export async function getCommissionsByOperationType(): Promise<
  { type: string; label: string; amount: number; percentage: number }[]
> {
  return [
    {
      type: "venta",
      label: OPERATION_TYPE_LABELS["venta"],
      amount: 19800,
      percentage: 55,
    },
    {
      type: "anticretico",
      label: OPERATION_TYPE_LABELS["anticretico"],
      amount: 7200,
      percentage: 20,
    },
    {
      type: "alquiler",
      label: OPERATION_TYPE_LABELS["alquiler"],
      amount: 6500,
      percentage: 18,
    },
    {
      type: "temporal",
      label: OPERATION_TYPE_LABELS["temporal"],
      amount: 2500,
      percentage: 7,
    },
  ]
}

export async function getTopOperations(): Promise<FinancialOperation[]> {
  return [
    {
      id: "op1",
      propertyTitle: "Casa moderna en Equipetrol",
      operationType: "Venta",
      propertyValue: 285000,
      commission: 8550,
      source: "facebook",
      closedAt: "2026-03-15T10:00:00Z",
    },
    {
      id: "op2",
      propertyTitle: "Terreno en Urubó",
      operationType: "Venta",
      propertyValue: 240000,
      commission: 7200,
      source: "instagram",
      closedAt: "2026-02-28T11:00:00Z",
    },
    {
      id: "op3",
      propertyTitle: "Departamento en Norte",
      operationType: "Anticrético",
      propertyValue: 120000,
      commission: 3600,
      source: "whatsapp",
      closedAt: "2026-03-05T14:00:00Z",
    },
    {
      id: "op4",
      propertyTitle: "PH en Las Palmas",
      operationType: "Alquiler",
      propertyValue: 850,
      commission: 850,
      source: "facebook",
      closedAt: "2026-02-10T09:00:00Z",
    },
    {
      id: "op5",
      propertyTitle: "Oficina en Equipetrol Norte",
      operationType: "Alquiler",
      propertyValue: 1200,
      commission: 1200,
      source: "tiktok",
      closedAt: "2026-01-20T16:00:00Z",
    },
    {
      id: "op6",
      propertyTitle: "Dpto amueblado en Norte",
      operationType: "Temporal",
      propertyValue: 650,
      commission: 650,
      source: "instagram",
      closedAt: "2026-03-01T10:00:00Z",
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
