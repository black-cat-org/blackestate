"use server"

import { getInquiriesAction } from "@/features/inquiries/presentation/actions"
import {
  getClosedDealsAction,
  getDealsAction,
} from "@/features/deals/presentation/actions"
import { getPropertiesAction } from "@/features/properties/presentation/actions"
import { getAppointmentsAction } from "@/features/appointments/presentation/actions"
import { getSentPropertiesAllAction } from "@/features/bot/presentation/actions"
import {
  INQUIRY_STATUS_LABELS,
  INQUIRY_SOURCE_LABELS,
  INQUIRY_SOURCE_OTHER_LABEL,
} from "@/lib/constants/inquiry"
import { DEAL_STAGE_LABELS } from "@/lib/constants/deal"
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
} from "@/features/analytics/domain/analytics.entity"
import type { InquiryStatus } from "@/features/inquiries/domain/inquiry.entity"
import type { DealStage } from "@/features/deals/domain/deal.entity"

// ============================================================
// Shared helpers
// ============================================================

// MOCK: full. Six-month label series used as the x-axis for every
// trend / time-series chart. Hardcoded labels become stale every
// month. Schema gap: none — `date_trunc('month', created_at)` would
// produce live labels in the user's locale.
// TODO: replace with `Intl.DateTimeFormat('es-BO', { month: 'short' })`
// over `now() - interval '5 months'` through `now()`. Priority: P1.
// See docs/analytics-mock-debt.md.
const MONTHS_6 = ["Sep", "Oct", "Nov", "Dic", "Ene", "Feb"]

/**
 * Fill colors for the Inquiry status funnel slice. Raw HSL so recharts
 * `fill` props receive the literal string they need; not Tailwind
 * utility classes. Adding a new InquiryStatus forces a compile error
 * via the `Record<InquiryStatus, string>` typing.
 *
 * Mirrors the dashboard's `INQUIRY_STATUS_FILL` in `features/dashboard/
 * infrastructure/dashboard.service.ts` — kept duplicated rather than
 * hoisted to `lib/constants` because the dashboard and analytics
 * surfaces may diverge their palettes independently in the future.
 */
const INQUIRY_STATUS_FILL: Record<InquiryStatus, string> = {
  open: "hsl(217, 91%, 60%)",
  promoted: "hsl(142, 71%, 45%)",
  discarded: "hsl(0, 0%, 60%)",
}

/**
 * Fill colors for the Deal stage funnel slice. 5 stages — first three
 * active, last two terminal (won / lost). Color motion: blue
 * (visit) → amber (negotiation) → indigo (reserved) → emerald (won) →
 * red (lost). Same `Record<DealStage, string>` invariant as above.
 */
const DEAL_STAGE_FILL: Record<DealStage, string> = {
  visit_scheduled: "hsl(217, 91%, 60%)",
  negotiation: "hsl(45, 93%, 47%)",
  reserved: "hsl(271, 91%, 65%)",
  won: "hsl(142, 71%, 45%)",
  lost: "hsl(0, 72%, 51%)",
}

const INQUIRY_STATUS_ORDER: InquiryStatus[] = ["open", "promoted", "discarded"]
const DEAL_STAGE_ORDER: DealStage[] = [
  "visit_scheduled",
  "negotiation",
  "reserved",
  "won",
  "lost",
]

/**
 * Deterministic pseudo-value based on two indices. Used by mock
 * time-series functions so charts always paint the same shape across
 * renders. Never uses Math.random().
 */
function synth(base: number, i: number, j: number = 0): number {
  return base + i * 3 + (i % 3) * 2 + j * 5
}

// ============================================================
// Overview tab
// ============================================================

export async function getOverviewStats(): Promise<StatCardData[]> {
  // `getDealsAction()` returns only active deals (excludes won/lost via
  // `TERMINAL_DEAL_STAGES`). For win-count and conversion-rate metrics
  // we need the full deal population, so we merge active + closed.
  const [inquiries, activeDeals, closedDeals] = await Promise.all([
    getInquiriesAction(),
    getDealsAction(),
    getClosedDealsAction(),
  ])
  const deals = [...activeDeals, ...closedDeals]

  const totalInquiries = inquiries.length
  const newInquiries = inquiries.filter((i) => i.status === "open").length
  const wonDeals = deals.filter((d) => d.stage === "won").length
  const promotedInquiries = inquiries.filter(
    (i) => i.status === "promoted",
  ).length

  // Cross-funnel conversion: of every 100 inquiries received, how many
  // ended as won deals. Same semantic as dashboard R37's conversion
  // rate — single number for top-of-funnel → close.
  const conversionRate =
    totalInquiries > 0
      ? Math.round((wonDeals / totalInquiries) * 1000) / 10
      : 0
  const inquiriesPerSale = conversionRate > 0 ? Math.round(100 / conversionRate) : 0

  // MOCK: full. Pipeline value hardcoded at US$1.2M. Schema gap: none
  // — computable as `SUM(property.price_amount) WHERE deal.stage IN
  // ('visit_scheduled','negotiation','reserved')` via JOIN on
  // deal.property_id. Commission rate also hardcoded; should come
  // from `business_settings.commission_rate`.
  // TODO: replace with real pipeline + rate from settings. Priority: P1.
  // See docs/analytics-mock-debt.md.
  const pipelineValue = 1200000
  const commissionRate = 0.03
  const commissionValue = Math.round(pipelineValue * commissionRate)

  return [
    {
      title: "Consultas nuevas",
      value: newInquiries,
      subtitle: "Últimos 30 días",
      // MOCK: partial. `change` percentage is hardcoded. Schema gap:
      // none — period-over-period comparison needs date-range filter
      // on inquiry.created_at vs prior 30 days. P1.
      change: 12.5,
      helpText:
        "Son las personas que se contactaron contigo en este período. Cada vez que alguien escribe al bot o llena el formulario de una propiedad, se cuenta como una consulta nueva. Por ejemplo, si en los últimos 30 días 8 personas preguntaron por tus propiedades, tu número es 8. El porcentaje muestra si recibes más o menos consultas que en el período anterior.",
      contextLine: `${newInquiries} personas preguntaron por tus propiedades este mes`,
    },
    {
      title: "Tasa de conversión",
      value: `${conversionRate}%`,
      subtitle: "Ventas ganadas / consultas",
      // MOCK: partial. `change` hardcoded. Same period-comparison gap.
      change: 3.2,
      helpText:
        "De cada 100 personas que se contactaron contigo, cuántas terminaron comprando o alquilando. Si tuviste 8 consultas y cerraste 1 venta, tu tasa es 12.5%. Un número más alto significa que estás convirtiendo mejor tus consultas en ventas reales.",
      contextLine:
        inquiriesPerSale > 0
          ? `1 de cada ${inquiriesPerSale} consultas termina en venta`
          : "Aún no tienes ventas cerradas",
    },
    {
      title: "Conversión Consulta → Negocio",
      value:
        totalInquiries > 0
          ? `${Math.round((promotedInquiries / totalInquiries) * 1000) / 10}%`
          : "0%",
      subtitle: "Consultas promovidas",
      // MOCK: partial. `change` hardcoded. Same period-comparison gap.
      change: 8.7,
      helpText:
        "De cada 100 consultas, cuántas terminaron promovidas a una negociación real (Deal). Es el primer indicador de la calidad del primer contacto: si una persona pasa de pregunta inicial a programar una visita o entrar en negociación, significa que tu propuesta enganchó. Un número bajo puede indicar que las consultas son frías o que la atención inicial está perdiendo oportunidades.",
      contextLine: `${promotedInquiries} consultas pasaron a negociación este período`,
    },
    {
      title: "Comisiones estimadas",
      value: `US$ ${(commissionValue / 1000).toLocaleString("es-BO")}K`,
      subtitle: `${commissionRate * 100}% sobre negociación`,
      // MOCK: partial. `change` hardcoded. Pipeline value + commission
      // rate also mocked above. P1.
      change: 8.3,
      helpText:
        "Es una estimación de cuánto ganarías si cierras todas las negociaciones activas, calculado sobre el porcentaje de comisión que configuraste en tu perfil. Es una estimación, no un número garantizado. Te ayuda a visualizar el valor de tu cartera actual.",
      contextLine: `podrías ganar US$ ${(commissionValue / 1000).toLocaleString("es-BO")}K si cierras todo lo que tienes hoy`,
    },
  ]
}

// MOCK: full. Six-month trend of inquiries — deterministic synth().
// Schema gap: none — `SELECT date_trunc('month', created_at), COUNT(*)
// FROM inquiry WHERE created_at >= now() - interval '6 months' GROUP
// BY 1 ORDER BY 1`. P1.
// See docs/analytics-mock-debt.md.
export async function getInquiriesTrend(): Promise<TimeSeriesPoint[]> {
  return MONTHS_6.map((date, i) => ({
    date,
    actual: 5 + i * 2 + ((i + 1) % 3),
    anterior: 3 + i * 1.5 + (i % 2),
  }))
}

// MOCK: full. Six-month conversions by month. Schema gap: none —
// `SELECT date_trunc('month', closed_at), stage, COUNT(*) FROM deal
// WHERE closed_at IS NOT NULL AND stage IN ('won','lost') GROUP BY 1,2`.
// P1.
export async function getConversionsByMonth(): Promise<TimeSeriesPoint[]> {
  return MONTHS_6.map((date, i) => ({
    date,
    won: synth(1, i),
    lost: synth(2, i, 1),
  }))
}

export async function getInquiriesSourceDistribution(): Promise<
  { source: string; label: string; count: number; percentage: number }[]
> {
  const inquiries = await getInquiriesAction()
  const counts: Record<string, number> = {}

  for (const inquiry of inquiries) {
    const key = inquiry.source ?? "other"
    counts[key] = (counts[key] || 0) + 1
  }

  const total = inquiries.length
  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      label:
        INQUIRY_SOURCE_LABELS[source as keyof typeof INQUIRY_SOURCE_LABELS] ??
        INQUIRY_SOURCE_OTHER_LABEL,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getAlerts(): Promise<AlertItem[]> {
  const [inquiries, appointments] = await Promise.all([
    getInquiriesAction(),
    getAppointmentsAction(),
  ])

  const alerts: AlertItem[] = []

  // Open inquiries older than 48h with no promotion / discard yet.
  const now = new Date()
  const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const staleInquiries = inquiries.filter(
    (i) => i.status === "open" && new Date(i.createdAt) < threshold48h,
  )
  for (const inquiry of staleInquiries) {
    alerts.push({
      id: `alert-inquiry-${inquiry.id}`,
      type: "warning",
      title: "Consulta sin atender",
      // Inquiry entity does not denormalise the contact name today;
      // surface the id stub so the agent can recognise the row from
      // the URL — the inquiries page resolves the contact on render.
      description: `Una consulta lleva más de 48hs sin promoverse ni descartarse`,
      actionUrl: `/dashboard/inquiries/${inquiry.id}`,
      actionLabel: "Ver consulta",
    })
  }

  // Appointments with "requested" status (pending confirmation).
  const pendingAppts = appointments.filter((a) => a.status === "requested")
  for (const apt of pendingAppts) {
    alerts.push({
      id: `alert-apt-${apt.id}`,
      type: "urgent",
      title: "Cita por confirmar",
      description: `${apt.contactName} pidió visitar "${apt.propertyTitle}"`,
      actionUrl: "/dashboard/appointments",
      actionLabel: "Ver cita",
    })
  }

  return alerts
}

export async function getHighlights(): Promise<string[]> {
  // Need both active + closed deals so the "Cerraste N ventas"
  // highlight reflects all won deals, not just non-terminal ones.
  // `getDealsAction()` excludes terminal stages by design.
  const [inquiries, activeDeals, closedDeals, appointments] = await Promise.all([
    getInquiriesAction(),
    getDealsAction(),
    getClosedDealsAction(),
    getAppointmentsAction(),
  ])
  const deals = [...activeDeals, ...closedDeals]

  const highlights: string[] = []

  const wonCount = deals.filter((d) => d.stage === "won").length
  if (wonCount > 0)
    highlights.push(
      `Cerraste ${wonCount} venta${wonCount > 1 ? "s" : ""} este período`,
    )

  const sources: Record<string, number> = {}
  for (const inquiry of inquiries) {
    const s = inquiry.source ?? "other"
    sources[s] = (sources[s] || 0) + 1
  }
  const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0]
  if (topSource) {
    const label =
      INQUIRY_SOURCE_LABELS[topSource[0] as keyof typeof INQUIRY_SOURCE_LABELS] ??
      INQUIRY_SOURCE_OTHER_LABEL
    highlights.push(
      `Tu mejor fuente fue ${label} con ${topSource[1]} consulta${topSource[1] > 1 ? "s" : ""}`,
    )
  }

  // Highlight is specifically about appointments the BOT scheduled —
  // must filter by origin or agent-created appointments inflate the
  // count and the copy "El bot agendó N citas" becomes a lie. See
  // docs/plans/analytics-appointments.md (analytics rule #1: queries
  // that mean something different per origin must filter by origin
  // explicitly).
  const botAppointments = appointments.filter(
    (a) =>
      a.origin === "bot" &&
      (a.status === "confirmed" || a.status === "completed"),
  ).length
  if (botAppointments > 0)
    highlights.push(
      `El bot agendó ${botAppointments} cita${botAppointments > 1 ? "s" : ""} sin tu intervención`,
    )

  const activeNegotiations = deals.filter(
    (d) => d.stage === "negotiation" || d.stage === "reserved",
  ).length
  if (activeNegotiations > 0)
    highlights.push(
      `Tienes ${activeNegotiations} negociación${activeNegotiations > 1 ? "es" : ""} activa${activeNegotiations > 1 ? "s" : ""}`,
    )

  return highlights
}

// ============================================================
// Inquiries tab (post-R36; previously "Leads tab")
// ============================================================

export async function getInquiriesStats(): Promise<StatCardData[]> {
  // Same reasoning as `getOverviewStats`: terminal-stage deals are
  // excluded from `getDealsAction()`, so the win-rate denominator and
  // numerator both need the merged active+closed population.
  const [inquiries, activeDeals, closedDeals] = await Promise.all([
    getInquiriesAction(),
    getDealsAction(),
    getClosedDealsAction(),
  ])
  const deals = [...activeDeals, ...closedDeals]

  const activeInquiries = inquiries.filter((i) => i.status !== "discarded")
  const total = activeInquiries.length
  const promoted = activeInquiries.filter((i) => i.status === "promoted").length
  const wonDeals = deals.filter((d) => d.stage === "won").length
  const promotionRate =
    total > 0 ? Math.round((promoted / total) * 1000) / 10 : 0
  const dealsTotal = deals.length
  const dealWinRate =
    dealsTotal > 0 ? Math.round((wonDeals / dealsTotal) * 1000) / 10 : 0

  // MOCK: full. `avgCloseDays` hardcoded at 12 days. Schema gap: none
  // — `SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400)
  // FROM deal WHERE stage = 'won'`. P1.
  const avgCloseDays = 12
  // MOCK: full. Bot first-response rate. Schema gap: P2 — requires a
  // new `bot_conversations.first_response_at` column (NOT in schema
  // today; verified against `lib/db/schema/bot-conversations.ts`)
  // populated when the first contact-side message arrives. Then:
  // `COUNT(*) FILTER (WHERE first_response_at IS NOT NULL) / COUNT(*)`.
  // Alternative: aggregate `bot_messages` per conversation and check
  // for any `sender='contact'` row.
  const responseRate = 75
  const responsePer10 = Math.round(responseRate / 10)

  return [
    {
      title: "Total consultas",
      value: total,
      subtitle: "Sin contar descartadas",
      // MOCK: partial. `change` hardcoded; counts are real.
      change: 15.0,
      helpText:
        "Incluye todas las consultas que tienen potencial de negocio: abiertas y promovidas. No incluye las que descartaste manualmente porque ya no representan una oportunidad. Por ejemplo, si llegaron 10 personas y descartaste 2, tu total es 8.",
      contextLine: `${total} personas con potencial de negocio este período`,
    },
    {
      title: "Tiempo promedio de cierre",
      value: `${avgCloseDays} días`,
      subtitle: "Desde consulta hasta venta",
      change: -8.0,
      helpText:
        "Es el promedio de días que pasaron desde que una consulta llegó hasta que se cerró la venta o el alquiler. Si una consulta llegó el 1 de enero y cerraste el 13 de enero, tardó 12 días. Un número más bajo significa que estás cerrando más rápido.",
      contextLine: `tus ventas tardan en promedio ${avgCloseDays} días en cerrarse`,
    },
    {
      title: "Conversión Consulta → Negocio",
      value: `${promotionRate}%`,
      subtitle: "Consultas promovidas",
      // MOCK: partial. `change` hardcoded.
      change: 4.5,
      helpText:
        "De cada 100 consultas activas, cuántas terminaron promovidas a una negociación real (Deal). Sirve para medir la calidad del primer contacto: si convierte poco, las consultas son frías o la atención inicial está perdiendo oportunidades.",
      contextLine: `${promoted} consultas pasaron a negociación este período`,
    },
    {
      title: "Conversión Negocio → Venta",
      value: `${dealWinRate}%`,
      subtitle: "Negocios ganados",
      // MOCK: partial. `change` hardcoded.
      change: 3.2,
      helpText:
        "De cada 100 negociaciones que iniciaste, cuántas terminaron como venta ganada. Mide tu eficacia para cerrar una vez que tienes la oportunidad en la mano. Un número alto significa que estás negociando bien; un número bajo puede indicar que entras a negociar oportunidades que no estaban maduras o que perdiste contra la competencia.",
      contextLine:
        dealWinRate > 0
          ? `1 de cada ${Math.round(100 / dealWinRate)} negocios termina en venta`
          : "Aún no tienes negocios cerrados",
    },
    {
      title: "Tasa de respuesta",
      value: `${responseRate}%`,
      subtitle: "Respondieron al bot",
      change: 5.4,
      helpText:
        "De cada 100 personas que el bot contactó, cuántas respondieron al menos un mensaje. Si el bot contactó a 8 consultas y 6 respondieron, tu tasa es 75%. Un número bajo puede significar que las consultas no son de buena calidad o que el mensaje inicial del bot no está enganchando.",
      contextLine: `${responsePer10} de cada 10 personas que el bot contacta responden`,
    },
  ]
}

/**
 * Two-phase funnel rebuilt from the Inquiry / Deal split. Top of
 * funnel = Inquiry states (open / promoted / discarded). Bottom of
 * funnel = Deal stages (visit_scheduled → negotiation → reserved →
 * won / lost). The chart still renders `FunnelStep[]` so the
 * `ConversionFunnel` component contract is unchanged — only the
 * content semantics evolved.
 */
export async function getConversionFunnel(): Promise<FunnelStep[]> {
  // Need active + closed deals so the terminal stages (won / lost)
  // populate correctly; `getDealsAction()` filters them out.
  const [inquiries, activeDeals, closedDeals] = await Promise.all([
    getInquiriesAction(),
    getDealsAction(),
    getClosedDealsAction(),
  ])
  const deals = [...activeDeals, ...closedDeals]

  const inquirySteps = INQUIRY_STATUS_ORDER.map((status) => ({
    label: INQUIRY_STATUS_LABELS[status],
    value: inquiries.filter((i) => i.status === status).length,
    fill: INQUIRY_STATUS_FILL[status],
  }))

  const dealSteps = DEAL_STAGE_ORDER.map((stage) => ({
    label: DEAL_STAGE_LABELS[stage],
    value: deals.filter((d) => d.stage === stage).length,
    fill: DEAL_STAGE_FILL[stage],
  }))

  return [...inquirySteps, ...dealSteps]
}

// MOCK: full. Inquiries by source over 6 months — deterministic
// synth() with a fixed 5-source subset (5 social channels). Schema
// gap: none — `SELECT date_trunc('month', created_at), source,
// COUNT(*) FROM inquiry GROUP BY 1,2`. Mock subset intentionally
// narrower than the 11-source `InquirySource` union — chart legend
// stays legible. P1.
export async function getInquiriesBySourceOverTime(): Promise<TimeSeriesPoint[]> {
  const sources = ["facebook", "instagram", "whatsapp", "tiktok", "other"]
  return MONTHS_6.map((date, i) => {
    const point: TimeSeriesPoint = { date }
    for (let j = 0; j < sources.length; j++) {
      point[sources[j]] = synth(1, i, j)
    }
    return point
  })
}

export async function getConversionBySource(): Promise<SourceMetric[]> {
  // `won` deals live in the closed-deals query (terminal stages are
  // excluded from `getDealsAction`). Merge before attributing wins
  // back to source via the inquiry → deal join.
  const [inquiries, activeDeals, closedDeals] = await Promise.all([
    getInquiriesAction(),
    getDealsAction(),
    getClosedDealsAction(),
  ])
  const deals = [...activeDeals, ...closedDeals]
  const sourceKeys = ["facebook", "instagram", "whatsapp", "tiktok", "other"]

  // Index won deals by their originating inquiry's source so we can
  // attribute a win to the channel that brought the contact in.
  const inquiryById = new Map(inquiries.map((i) => [i.id, i]))

  return sourceKeys.map((source, idx) => {
    const sourceInquiries = inquiries.filter(
      (i) => (i.source ?? "other") === source,
    )
    const count = sourceInquiries.length
    const wonInSource = deals.filter((d) => {
      if (d.stage !== "won") return false
      if (!d.inquiryId) return false
      const originInquiry = inquiryById.get(d.inquiryId)
      if (!originInquiry) return false
      return (originInquiry.source ?? "other") === source
    }).length
    const realRate =
      count > 0 ? Math.round((wonInSource / count) * 1000) / 10 : 0

    // MOCK: partial. `conversionRate` falls back to a hardcoded
    // baseline when no real wins exist yet so the chart never paints
    // an all-zero state. Real rate is preferred whenever any
    // inquiries from this source converted. `revenue` is fully mocked.
    // Schema gap: revenue requires commission tracking — see Financial
    // tab notes in docs/analytics-mock-debt.md (P3).
    const mockRates = [25, 50, 15, 10, 5]
    const conversionRate = realRate > 0 ? realRate : mockRates[idx]
    const revenueValues = [18500, 12000, 8500, 4200, 2800]

    return {
      source,
      label:
        INQUIRY_SOURCE_LABELS[
          source as keyof typeof INQUIRY_SOURCE_LABELS
        ] ?? INQUIRY_SOURCE_OTHER_LABEL,
      count,
      conversionRate,
      revenue: revenueValues[idx],
    }
  })
}

// MOCK: full. Stage transition velocity (days per step). Schema gap:
// MAJOR — Postgres does not track `deal.stage` transition timestamps
// today. Requires a new `deal_stage_history (deal_id, from_stage,
// to_stage, transitioned_at)` table populated via a DB trigger on
// `deal.stage` UPDATE. P3.
// See docs/analytics-mock-debt.md.
export async function getPipelineVelocity(): Promise<
  { label: string; days: number; fill: string }[]
> {
  return [
    { label: "Visita → Negociación", days: 1, fill: "hsl(217, 91%, 60%)" },
    { label: "Negociación → Reservada", days: 4, fill: "hsl(45, 93%, 47%)" },
    { label: "Reservada → Ganada", days: 7, fill: "hsl(142, 71%, 45%)" },
  ]
}

// MOCK: full. Pipeline exit averages. Same `deal_stage_history` gap
// as getPipelineVelocity. P3.
export async function getPipelineExits(): Promise<
  { label: string; avgDays: number; fill: string }[]
> {
  return [
    { label: "Perdida", avgDays: 10, fill: "hsl(0, 72%, 51%)" },
    { label: "Descartada", avgDays: 3, fill: "hsl(0, 0%, 60%)" },
  ]
}

// MOCK: full. Bot engagement rate + distribution. Schema gap: parcial
// — computable via aggregation of `bot_messages` per `conversation_id`
// (engagement = conversations with ≥2 contact-side messages). P2.
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

export async function getInquiriesByPropertyType(): Promise<
  { type: string; label: string; count: number }[]
> {
  const [inquiries, properties] = await Promise.all([
    getInquiriesAction(),
    getPropertiesAction(),
  ])

  const propertyTypeMap: Record<string, string> = {}
  for (const p of properties) {
    propertyTypeMap[p.id] = p.type
  }

  const counts: Record<string, number> = {}
  for (const inquiry of inquiries) {
    const pType = propertyTypeMap[inquiry.propertyId]
    if (pType) {
      counts[pType] = (counts[pType] || 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label:
        PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? type,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================
// Properties tab
// ============================================================

export async function getPropertiesStats(): Promise<StatCardData[]> {
  const properties = await getPropertiesAction()
  const active = properties.filter((p) => p.status === "active")

  // Average price in USD for active properties with USD pricing.
  const usdPrices = active
    .filter((p) => p.price.currency === "USD")
    .map((p) => p.price.amount)
  const avgPriceUsd =
    usdPrices.length > 0
      ? Math.round(usdPrices.reduce((a, b) => a + b, 0) / usdPrices.length)
      : 0

  // MOCK: full. `avgDays` hardcoded at 45 days on market. Schema gap:
  // P2 — needs `AVG(EXTRACT(EPOCH FROM (deleted_at - created_at)) /
  // 86400) FROM properties WHERE status IN ('sold','rented') AND
  // deleted_at IS NOT NULL` or a dedicated `sold_at` column. P2.
  const avgDays = 45
  // MOCK: full. `totalVisits` derived as `active.length × 12`. Schema
  // gap: none — `analytics_events` table exists with
  // `event_type='property_viewed'`. P1.
  const totalVisits = active.length * 12

  return [
    {
      title: "Propiedades activas",
      value: active.length,
      subtitle: "Publicadas y disponibles",
      // MOCK: partial. `change` hardcoded; count is real.
      change: 5.0,
      helpText:
        "Son las propiedades que tienes publicadas y disponibles en este momento. Cada una tiene su página pública donde los clientes pueden ver los detalles y contactarte. Un número alto significa que tienes un buen inventario para ofrecer.",
      contextLine: `${active.length} de tus propiedades están disponibles para recibir consultas`,
    },
    {
      title: "Días promedio en mercado",
      value: avgDays,
      subtitle: "Tiempo hasta venta/alquiler",
      change: -3.5,
      helpText:
        "Es el promedio de días que tarda una propiedad tuya en venderse o alquilarse desde que la publicas. Si este número es alto significa que tus propiedades están tardando mucho en cerrar — puede ser por precio, fotos o descripción. Un número bajo significa que tus propiedades se mueven rápido.",
      contextLine: `en promedio tardas ${avgDays} días en cerrar una operación`,
    },
    {
      title: "Precio promedio",
      value: `US$ ${avgPriceUsd.toLocaleString("es-BO")}`,
      subtitle: "Propiedades activas",
      // MOCK: partial. `change` hardcoded; avg is real.
      change: 2.1,
      helpText:
        "Es el precio promedio de todas tus propiedades activas. Te da una idea del rango en el que te estás moviendo y si tu portafolio está orientado a clientes de alto, medio o bajo presupuesto.",
      contextLine: "así está el precio típico de tu portafolio actual",
    },
    {
      title: "Visitas totales",
      value: totalVisits,
      subtitle: "Páginas vistas en el período",
      change: 4.8,
      helpText:
        "Es la cantidad de veces que clientes entraron a ver la página pública de tus propiedades en este período. Un número alto significa que estás generando interés. Si hay muchas visitas pero pocas consultas significa que algo en la página no está convenciendo — puede ser el precio, las fotos o la descripción.",
      contextLine: `${totalVisits} veces entraron clientes a ver tus propiedades`,
    },
  ]
}

// MOCK: full. Hardcoded inventory counts that don't match the real
// `properties` rows even though `getPropertiesAction()` is one call
// away. Schema gap: none — `SELECT status, COUNT(*) FROM properties
// WHERE deleted_at IS NULL GROUP BY status`. P1 — quickest possible
// migration.
export async function getInventoryStatus(): Promise<
  { status: string; label: string; count: number; percentage: number; fill: string }[]
> {
  const validStatuses = [
    { status: "active", label: "Activa", fill: "hsl(142, 71%, 45%)", count: 12 },
    { status: "paused", label: "Pausada", fill: "hsl(25, 95%, 53%)", count: 4 },
    { status: "sold", label: "Vendida", fill: "hsl(217, 91%, 60%)", count: 3 },
    { status: "rented", label: "Alquilada", fill: "hsl(271, 91%, 65%)", count: 2 },
    { status: "antichretic", label: "En anticrético", fill: "hsl(45, 93%, 47%)", count: 1 },
  ]

  const total = validStatuses.reduce((sum, s) => sum + s.count, 0)

  return validStatuses.map((s) => ({
    ...s,
    percentage: total > 0 ? Math.round((s.count / total) * 1000) / 10 : 0,
  }))
}

// MOCK: full. Hardcoded Santa Cruz, BO neighborhoods + averages.
// Schema gap: P2 — `properties.address_neighborhood` exists, but
// neighborhood values are not normalized. Replacement query:
// `SELECT address_neighborhood AS zone, AVG(price_amount) FROM
// properties WHERE deleted_at IS NULL AND price_currency='USD'
// GROUP BY 1 HAVING COUNT(*) >= 2`. P2 (needs neighborhood
// normalization first).
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
  const properties = await getPropertiesAction()
  const total = properties.length
  const counts: Record<string, number> = {}

  for (const p of properties) {
    counts[p.type] = (counts[p.type] || 0) + 1
  }

  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label:
        PROPERTY_TYPE_LABELS[type as keyof typeof PROPERTY_TYPE_LABELS] ?? type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

// MOCK: full. Aliases `getAvgPriceByZone`. Schema gap: P2 — same as
// above, plus needs `total_area_value` / `total_area_unit` reading
// (`avgPricePerM2 = price_amount / total_area_value WHERE
// total_area_unit='m2'`). P2.
export async function getPricePerM2ByZone(): Promise<ZonePricing[]> {
  return getAvgPriceByZone()
}

// MOCK: full. Hardcoded property rankings with fabricated leads /
// visits / appointments counts. Schema gap: none — `JOIN inquiry,
// analytics_events (event_type='property_viewed'), appointments ON
// property_id GROUP BY property_id ORDER BY (counts) LIMIT N`. P1.
// `leads` field renamed to `inquiries` (R36 vocabulary).
export async function getTopProperties(): Promise<PropertyRanking[]> {
  return [
    { id: "1", title: "Casa moderna en Equipetrol", inquiries: 8, visits: 45, appointments: 4 },
    { id: "2", title: "Departamento 2 amb en Norte", inquiries: 6, visits: 32, appointments: 3 },
    { id: "6", title: "PH reciclado en Las Palmas", inquiries: 5, visits: 28, appointments: 2 },
    { id: "3", title: "Terreno en Urubó", inquiries: 4, visits: 22, appointments: 2 },
    { id: "5", title: "Oficina en Equipetrol Norte", inquiries: 3, visits: 18, appointments: 1 },
    { id: "4", title: "Local comercial Av. San Martín", inquiries: 2, visits: 12, appointments: 1 },
  ]
}

// MOCK: full. Six-month price trend per Santa Cruz neighborhood.
// Schema gap: MAJOR — `properties.price_amount` is current-only;
// historical price changes are not audited. Requires
// `property_price_history (property_id, price_amount, valid_from,
// valid_to)` populated by a trigger on `properties.price_amount`
// UPDATE. P3.
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
// Financial tab — ENTIRE TAB is mock (no commission schema)
// ============================================================
//
// Schema gap: MAJOR. There is no `commission_payment` table and no
// closed-operations log with monetary amounts. Every function below
// returns hardcoded values. Replacing them requires schema design
// work: a new commission tracking model + a backfill strategy for
// closed deals. P3 across the board.
// See docs/analytics-mock-debt.md (Financial section).

// MOCK: full. Schema gap: P3 — no commission table.
export async function getFinancialStats(): Promise<StatCardData[]> {
  const commissionRate = 0.03
  const collectedCommissions = 36000
  const pipelineValue = 1200000
  const pendingCommissions = Math.round(pipelineValue * commissionRate)
  const closedOps = 8
  const avgCommission = Math.round(collectedCommissions / closedOps)

  return [
    {
      title: "Comisiones cobradas",
      value: `US$ ${(collectedCommissions / 1000).toFixed(0)}K`,
      subtitle: "Acumulado del período",
      change: 8.0,
      helpText:
        "Es el dinero que ya ganaste en este período — la suma de todas las comisiones que registraste como cobradas. Si cerraste una venta de $200k con 3% de comisión y la registraste, esos $6k aparecen aquí. Solo cuenta lo que tú registras manualmente.",
      contextLine: "lo que ya ganaste en comisiones este período",
    },
    {
      title: "Comisiones pendientes",
      value: `US$ ${(pendingCommissions / 1000).toFixed(0)}K`,
      subtitle: `${commissionRate * 100}% sobre negociación`,
      change: 12.5,
      helpText:
        "Es el dinero que podrías ganar si cierras las consultas activas ahora mismo en estado de negociación. No es dinero garantizado — es una estimación basada en el precio de las propiedades y tu porcentaje de comisión configurado. Te ayuda a visualizar cuánto tienes en juego.",
      contextLine: "podrías ganar esto si cierras lo que tienes activo hoy",
    },
    {
      title: "Valor del pipeline",
      value: `US$ ${(pipelineValue / 1000000).toFixed(1)}M`,
      subtitle: "Oportunidades abiertas",
      change: -5.1,
      helpText:
        "Es la suma del precio total de todas las propiedades que tienen consultas activas en negociación. Si tienes 3 negociaciones de $100k, $200k y $300k, tu pipeline vale $600k. No es dinero que ya ganaste, es el valor de las oportunidades abiertas.",
      contextLine: "en propiedades con negociaciones activas ahora mismo",
    },
    {
      title: "Comisión promedio",
      value: `US$ ${(avgCommission / 1000).toFixed(1)}K`,
      subtitle: "Por operación cerrada",
      change: 3.7,
      helpText:
        "Es el promedio de lo que ganas por cada operación cerrada. Se calcula dividiendo el total de comisiones cobradas entre el número de ventas o alquileres cerrados en el período. Un número alto significa que estás cerrando operaciones de mayor valor.",
      contextLine:
        "lo que ganas en promedio por cada operación que cierras",
    },
  ]
}

// MOCK: partial. `revenue` is fully mocked (no commission table).
// `goal` is real-derived from `business_settings.monthlyGrowthTarget`
// — kept that bridge intact so the user-visible target reflects their
// configured growth rate. P3 revenue / P1 goal-from-settings.
export async function getRevenueByMonth(): Promise<TimeSeriesPoint[]> {
  const { getBusinessSettings } = await import(
    "@/features/settings/infrastructure/settings.service"
  )
  const settings = await getBusinessSettings()
  const growthRate = settings.monthlyGrowthTarget / 100

  // Realistic monthly revenue for a Bolivian real estate agent (in USD).
  const revenues = [4200, 5800, 3500, 6100, 4800, 7200]

  return MONTHS_6.map((date, i) => {
    const revenue = revenues[i]
    // Goal = previous month * (1 + growthRate), no goal for first month.
    const goal = i > 0 ? Math.round(revenues[i - 1] * (1 + growthRate)) : undefined

    return {
      date,
      revenue,
      ...(goal !== undefined ? { goal } : {}),
    }
  })
}

// MOCK: full. Average ticket per operation type. Schema gap: partial
// — operation_type lives on Property, but the "ticket value" semantic
// here is a derived metric across closed Deals with commission rate.
// Mock today. Replacement: `SELECT p.operation_type, AVG(p.price_amount
// * settings.commission_rate) FROM deal d JOIN properties p ...`. P2.
export async function getPipelineByStage(): Promise<PipelineStage[]> {
  return [
    {
      stage: "sale",
      label: "Venta",
      value: 8500,
      probability: 100,
      fill: "hsl(217, 91%, 60%)",
    },
    {
      stage: "antichretic",
      label: "Anticrético",
      value: 3600,
      probability: 100,
      fill: "hsl(45, 93%, 47%)",
    },
    {
      stage: "rent",
      label: "Alquiler",
      value: 1200,
      probability: 100,
      fill: "hsl(142, 71%, 45%)",
    },
    {
      stage: "short_term",
      label: "Temporal",
      value: 480,
      probability: 100,
      fill: "hsl(271, 91%, 65%)",
    },
  ]
}

// MOCK: full. Schema gap: P3 — no commission table.
export async function getCommissionsBySource(): Promise<
  { source: string; label: string; amount: number }[]
> {
  return [
    { source: "facebook", label: "Facebook", amount: 12800 },
    { source: "instagram", label: "Instagram", amount: 8500 },
    { source: "whatsapp", label: "WhatsApp", amount: 7200 },
    { source: "tiktok", label: "TikTok", amount: 4800 },
    { source: "other", label: INQUIRY_SOURCE_OTHER_LABEL, amount: 2700 },
  ]
}

// MOCK: full. Schema gap: P3 — no commission table.
export async function getCommissionsByOperationType(): Promise<
  { type: string; label: string; amount: number; percentage: number }[]
> {
  return [
    {
      type: "sale",
      label: OPERATION_TYPE_LABELS["sale"],
      amount: 19800,
      percentage: 55,
    },
    {
      type: "antichretic",
      label: OPERATION_TYPE_LABELS["antichretic"],
      amount: 7200,
      percentage: 20,
    },
    {
      type: "rent",
      label: OPERATION_TYPE_LABELS["rent"],
      amount: 6500,
      percentage: 18,
    },
    {
      type: "short_term",
      label: OPERATION_TYPE_LABELS["short_term"],
      amount: 2500,
      percentage: 7,
    },
  ]
}

// MOCK: full. Schema gap: P3 — no closed-operations log with commission.
// Replacement: `SELECT d.id, p.title, p.operation_type, p.price_amount,
// cp.amount, d.inquiry_id JOIN properties p, commission_payment cp ON
// d.id=cp.deal_id WHERE d.stage='won' ORDER BY cp.amount DESC LIMIT N`.
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

// MOCK: full. Bot performance stats — every number hardcoded. Schema
// gap: none for most: `bot_messages`, `appointments WHERE origin='bot'`,
// `contact_property_queue` all exist. `responseRate` partial — needs
// first-response tracking via `bot_conversations.first_response_at`
// (R35) or message-pair analysis. P1 for messagesSent / appointmentsBooked
// / propertiesSent / totalInquiries; P2 for responseRate.
export async function getBotStats(): Promise<StatCardData[]> {
  const messagesSent = 156
  const responseRate = 72
  const appointmentsBooked = 18
  const propertiesSent = 43
  const totalInquiries = 24
  const days = 30

  const avgMessagesPerDay = Math.round(messagesSent / days)
  const responsePer10 = Math.round(responseRate / 10)
  const appointmentsPer10 = Math.round(
    (appointmentsBooked / totalInquiries) * 10,
  )
  const propertiesPerInquiry = Math.round(propertiesSent / totalInquiries)

  return [
    {
      title: "Mensajes enviados",
      value: messagesSent,
      subtitle: "Últimos 30 días",
      change: 22.5,
      helpText:
        "Es el total de mensajes que el bot envió a tus consultas en este período. Incluye mensajes de bienvenida, información de propiedades, respuestas automáticas y recordatorios de citas. Un número alto significa que el bot está trabajando activamente por ti.",
      contextLine: `en promedio el bot envió ${avgMessagesPerDay} mensajes por día`,
    },
    {
      title: "Tasa de respuesta",
      value: `${responseRate}%`,
      subtitle: "Clientes que respondieron",
      change: 5.3,
      helpText:
        "De cada 100 personas que el bot contactó, cuántas respondieron al menos un mensaje. Un número alto significa que el bot está generando conversaciones reales. Si es bajo puede significar que el mensaje inicial no está enganchando o que las consultas no son de buena calidad.",
      contextLine: `${responsePer10} de cada 10 personas que el bot contacta responden`,
    },
    {
      title: "Citas agendadas",
      value: appointmentsBooked,
      subtitle: "Por el bot",
      change: 15.0,
      helpText:
        "Es el número de citas que el bot agendó solo, sin que tú tuvieras que intervenir. Cada cita agendada por el bot es tiempo que te ahorró y una oportunidad de venta que no habrías tenido que gestionar manualmente.",
      contextLine: `el bot agendó ${appointmentsPer10} citas por cada 10 consultas que contactó`,
    },
    {
      title: "Propiedades enviadas",
      value: propertiesSent,
      subtitle: "Fichas compartidas",
      change: 31.2,
      helpText:
        "Es el total de fichas de propiedades que el bot compartió con tus consultas en este período. Incluye la propiedad de origen y todas las propiedades de la cola enviadas automáticamente. Más propiedades enviadas significa más oportunidades de encontrar la propiedad ideal para cada consulta.",
      contextLine: `el bot compartió en promedio ${propertiesPerInquiry} propiedades por consulta`,
    },
  ]
}

// MOCK: full. 30-day bot activity. Schema gap: none — `bot_messages`,
// `contact_property_queue`, `appointments WHERE origin='bot'` all
// exist. P1.
export async function getBotActivityByDay(): Promise<TimeSeriesPoint[]> {
  const points: TimeSeriesPoint[] = []
  for (let i = 0; i < 30; i++) {
    const day = 27 + i // start from Jan 27 to Feb 25
    const month = day > 31 ? 2 : 1
    const dayOfMonth = day > 31 ? day - 31 : day
    const dateStr = `${month === 1 ? "Ene" : "Feb"} ${dayOfMonth}`

    // Deterministic values: higher on weekdays (0-4), lower on weekends (5-6).
    const dayOfWeek = (i + 1) % 7 // Tue start
    const isWeekend = dayOfWeek >= 5
    const messages = isWeekend ? 2 + (i % 3) : 5 + (i % 4) * 2 + ((i + 1) % 3)
    const properties = isWeekend ? 1 + (i % 2) : 2 + (i % 3) + ((i + 2) % 2)
    const appointments = isWeekend ? 0 : i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0

    points.push({ date: dateStr, messages, properties, appointments })
  }
  return points
}

// MOCK: full. Bot funnel (Registrado → Prop. enviada → Prop. vista →
// Cita agendada). Schema gap: P2 — step1 `bot_conversations`, step2
// `contact_property_queue.sent_at IS NOT NULL`, step3 `analytics_events
// WHERE event_type='property_viewed' AND metadata.source='bot'`, step4
// `appointments WHERE origin='bot'`. Needs the metadata.source
// convention to be enforced upstream.
export async function getBotFunnel(): Promise<BotFunnelStep[]> {
  const steps = [
    { label: "Registrado", value: 45, fill: "hsl(217, 91%, 60%)" },
    { label: "Prop. enviada", value: 38, fill: "hsl(45, 93%, 47%)" },
    { label: "Prop. vista", value: 28, fill: "hsl(142, 71%, 45%)" },
    { label: "Cita agendada", value: 12, fill: "hsl(271, 91%, 65%)" },
  ]

  return steps.map((step, i) => ({
    ...step,
    percentage: i === 0 ? 100 : Math.round((step.value / steps[i - 1].value) * 100),
  }))
}

// MOCK: full. Day-of-week × hour engagement heatmap. Schema gap: none
// — `SELECT EXTRACT(dow FROM created_at) AS day, EXTRACT(hour FROM
// created_at) AS hour, COUNT(*) FROM bot_messages WHERE created_at >=
// now() - interval '30 days' GROUP BY 1,2`. P1.
export async function getEngagementHeatmap(): Promise<HeatmapCell[]> {
  const cells: HeatmapCell[] = []

  for (let day = 0; day < 7; day++) {
    for (let hour = 8; hour <= 20; hour++) {
      // Deterministic: higher on weekdays (0-4) during work hours (10-18).
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
        // Weekend.
        value = 1 + ((day + hour) % 3)
      }

      cells.push({ day, hour, value })
    }
  }

  return cells
}

// ============================================================
// My Activity tab (agent-side manual activity)
// ============================================================

// MOCK: full. Manual agent stats. Schema gap: none for most —
// `bot_messages WHERE sender='agent'`, `appointments WHERE
// origin='agent'`, `inquiry WHERE source='manual'`. `manualProperties`
// requires confirming the `sent_by` column on `contact_property_queue`
// or equivalent. P1 for most, P2 for manualProperties.
export async function getAgentManualStats(): Promise<StatCardData[]> {
  const manualMessages = 12
  const manualAppointments = 5
  const manualProperties = 7
  const manualInquiries = 3
  const days = 30

  return [
    {
      title: "Mensajes enviados",
      value: manualMessages,
      subtitle: "Últimos 30 días",
      change: 10.0,
      helpText:
        "Son los mensajes que tú enviaste directamente a consultas por WhatsApp fuera del flujo automático del bot. Cuando intervienes en una conversación que el bot estaba manejando, esos mensajes cuentan aquí.",
      contextLine: `en promedio enviaste ${Math.round(manualMessages / (days / 7))} mensajes por semana`,
    },
    {
      title: "Citas confirmadas",
      value: manualAppointments,
      subtitle: "Últimos 30 días",
      change: -5.0,
      helpText:
        "Son las citas que tú confirmaste en el período. Cada vez que una consulta solicita una cita — ya sea por el bot o manualmente — tú eres quien decide confirmarla o cancelarla. Este número refleja cuántas decidiste confirmar.",
      contextLine: `confirmaste ${manualAppointments} citas este período`,
    },
    {
      title: "Propiedades enviadas",
      value: manualProperties,
      subtitle: "Últimos 30 días",
      change: 15.0,
      helpText:
        "Son las propiedades que tú enviaste directamente a una consulta usando el botón de envío manual en la cola, sin esperar la cadencia automática del bot.",
      contextLine: `enviaste en promedio ${Math.round(manualProperties / (days / 7))} propiedades por semana`,
    },
    {
      title: "Consultas registradas",
      value: manualInquiries,
      subtitle: "Últimos 30 días",
      change: 0,
      helpText:
        "Son las consultas que tú agregaste directamente al sistema, sin que llegaran por el bot o por el formulario público de una propiedad. Por ejemplo cuando alguien te contacta por teléfono o en persona y tú lo registras manualmente.",
      contextLine: `${manualInquiries} consultas que registraste tú directamente este período`,
    },
  ]
}

// MOCK: full. 30-day agent manual activity. Schema gap: none —
// filter `sender='agent'` and `origin='agent'`. P1.
export async function getAgentActivityByDay(): Promise<TimeSeriesPoint[]> {
  const points: TimeSeriesPoint[] = []
  for (let i = 0; i < 30; i++) {
    const day = 27 + i
    const month = day > 31 ? 2 : 1
    const dayOfMonth = day > 31 ? day - 31 : day
    const dateStr = `${month === 1 ? "Ene" : "Feb"} ${dayOfMonth}`
    const dayOfWeek = (i + 1) % 7
    const isWeekend = dayOfWeek >= 5
    // English keys to match the `BotActivityArea` chartConfig
    // (`messages`, `properties`, `appointments`). Previous version
    // emitted Spanish keys (`mensajes`, `propiedades`, `citas`) which
    // never matched the chart config — agent activity rendered as
    // empty areas. CLAUDE.md "Strict English in code" enforcement.
    const messages = isWeekend ? 0 : i % 3 === 0 ? 2 : i % 2
    const properties = isWeekend ? 0 : i % 4 === 0 ? 1 : 0
    const appointments = isWeekend ? 0 : i % 6 === 0 ? 1 : 0
    points.push({ date: dateStr, messages, properties, appointments })
  }
  return points
}

// MOCK: full. Agent funnel (Contactados → Prop. enviada → Prop. vista
// → Cita agendada → Confirmada). Schema gap: P2 — same shape as
// `getBotFunnel` but filtered to manual touches.
export async function getAgentFunnel(): Promise<BotFunnelStep[]> {
  const steps = [
    { label: "Contactados", value: 12, fill: "hsl(217, 91%, 60%)" },
    { label: "Prop. enviada", value: 7, fill: "hsl(45, 93%, 47%)" },
    { label: "Prop. vista", value: 5, fill: "hsl(142, 71%, 45%)" },
    { label: "Cita agendada", value: 3, fill: "hsl(271, 91%, 65%)" },
    { label: "Confirmada", value: 2, fill: "hsl(330, 70%, 50%)" },
  ]
  return steps.map((step, i) => ({
    ...step,
    percentage: i === 0 ? 100 : Math.round((step.value / steps[i - 1].value) * 100),
  }))
}

// MOCK: full. Agent heatmap. Schema gap: none — same as engagement
// heatmap with `sender='agent'` filter. P1.
export async function getAgentHeatmap(): Promise<HeatmapCell[]> {
  const cells: HeatmapCell[] = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 8; hour <= 20; hour++) {
      const isWeekday = day < 5
      const isMorning = hour >= 9 && hour <= 12
      const isAfternoon = hour >= 14 && hour <= 17
      let value = 0
      if (isWeekday && isMorning) value = 3 + (day % 2) + ((hour - 9) % 3)
      else if (isWeekday && isAfternoon) value = 2 + ((day + hour) % 3)
      else if (isWeekday) value = 1
      cells.push({ day, hour, value })
    }
  }
  return cells
}

export async function getAppointmentOutcomes(): Promise<
  { status: string; label: string; count: number; percentage: number; fill: string }[]
> {
  const appointments = await getAppointmentsAction()
  const total = appointments.length

  const statusLabels: Record<string, string> = {
    requested: "Solicitada",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
  }

  const statusColors: Record<string, string> = {
    requested: "hsl(45, 93%, 47%)",
    confirmed: "hsl(217, 91%, 60%)",
    completed: "hsl(142, 71%, 45%)",
    cancelled: "hsl(0, 84%, 60%)",
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

// Retain re-export of `getSentPropertiesAllAction` to avoid breaking
// imports — referenced by future analytics surfaces. The import lives
// at the top so the side-effect-free re-export is essentially free.
export { getSentPropertiesAllAction }
