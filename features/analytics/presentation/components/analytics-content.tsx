"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangeFilter } from "@/features/analytics/presentation/components/date-range-filter"
import { ExportButton } from "@/features/analytics/presentation/components/export-button"
import { OverviewTab } from "@/features/analytics/presentation/components/tabs/overview-tab"
import { InquiriesTab } from "@/features/analytics/presentation/components/tabs/inquiries-tab"
import { PropertiesTab } from "@/features/analytics/presentation/components/tabs/properties-tab"
import { FinancialTab } from "@/features/analytics/presentation/components/tabs/financial-tab"
import { BotTab } from "@/features/analytics/presentation/components/tabs/bot-tab"
import { MyActivityTab } from "@/features/analytics/presentation/components/tabs/my-activity-tab"
import type { DateRangePreset, StatCardData, TimeSeriesPoint, AlertItem, FunnelStep, SourceMetric, ZonePricing, PropertyRanking, PipelineStage, FinancialOperation, BotFunnelStep, HeatmapCell } from "@/features/analytics/domain/analytics.entity"

interface OverviewData {
  stats: StatCardData[]
  inquiriesTrend: TimeSeriesPoint[]
  conversionsByMonth: TimeSeriesPoint[]
  sourceDistribution: { source: string; label: string; count: number; percentage: number }[]
  alerts: AlertItem[]
  highlights: string[]
}

interface InquiriesData {
  stats: StatCardData[]
  conversionFunnel: FunnelStep[]
  inquiriesBySourceOverTime: TimeSeriesPoint[]
  conversionBySource: SourceMetric[]
  inquiriesByPropertyType: { type: string; label: string; count: number }[]
}

interface PropertiesData {
  stats: StatCardData[]
  inventoryStatus: { status: string; label: string; count: number; percentage: number; fill: string }[]
  priceByZone: ZonePricing[]
  typeDistribution: { type: string; label: string; count: number; percentage: number }[]
  pricePerM2: ZonePricing[]
  topProperties: PropertyRanking[]
  priceTrend: TimeSeriesPoint[]
  priceTrendZones: string[]
}

interface FinancialData {
  stats: StatCardData[]
  revenueByMonth: TimeSeriesPoint[]
  pipeline: PipelineStage[]
  commissionsBySource: { source: string; label: string; amount: number }[]
  commissionsByType: { type: string; label: string; amount: number; percentage: number }[]
  topOperations: FinancialOperation[]
}

interface BotData {
  stats: StatCardData[]
  activityByDay: TimeSeriesPoint[]
  botFunnel: BotFunnelStep[]
  heatmap: HeatmapCell[]
  botEngagement: { engagementRate: number; distribution: { interacted: number; viewedOnly: number; noResponse: number } }
}

interface MyActivityData {
  stats: StatCardData[]
  activityByDay: TimeSeriesPoint[]
  funnel: BotFunnelStep[]
  appointmentOutcomes: { status: string; label: string; count: number; percentage: number; fill: string }[]
  heatmap: HeatmapCell[]
}

interface AnalyticsContentProps {
  overviewData: OverviewData
  inquiriesData: InquiriesData
  propertiesData: PropertiesData
  financialData: FinancialData
  botData: BotData
  myActivityData: MyActivityData
}

function formatStatChange(change?: number): string {
  if (change === undefined) return "-"
  const sign = change >= 0 ? "+" : ""
  return `${sign}${change}%`
}

export function AnalyticsContent({ overviewData, inquiriesData, propertiesData, financialData, botData, myActivityData }: AnalyticsContentProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d")
  const [activeTab, setActiveTab] = useState("overview")

  const getExportData = useCallback(() => {
    switch (activeTab) {
      case "overview": {
        const rows: (string | number)[][] = []

        // Stats section.
        for (const stat of overviewData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Blank separator.
        rows.push(["", "", ""])
        rows.push(["Distribución por fuente", "", ""])
        rows.push(["Fuente", "Cantidad", "Porcentaje"])

        for (const src of overviewData.sourceDistribution) {
          rows.push([src.label, src.count, `${src.percentage}%`])
        }

        return {
          title: "Resumen general",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "inquiries": {
        const rows: (string | number)[][] = []

        // Stats section.
        for (const stat of inquiriesData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Blank separator.
        rows.push(["", "", ""])
        rows.push(["Embudo de conversión", "", ""])
        rows.push(["Etapa", "Cantidad", ""])

        for (const step of inquiriesData.conversionFunnel) {
          rows.push([step.label, step.value, ""])
        }

        // Conversion by source.
        rows.push(["", "", ""])
        rows.push(["Conversión por fuente", "", ""])
        rows.push(["Fuente", "Consultas", "Tasa de conversión"])

        for (const src of inquiriesData.conversionBySource) {
          rows.push([src.label, src.count, `${src.conversionRate}%`])
        }

        return {
          title: "Analítica de consultas",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "properties": {
        const rows: (string | number)[][] = []

        // Stats section.
        for (const stat of propertiesData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Inventory status.
        rows.push(["", "", ""])
        rows.push(["Estado del inventario", "", ""])
        rows.push(["Estado", "Cantidad", "Porcentaje"])

        for (const inv of propertiesData.inventoryStatus) {
          rows.push([inv.label, inv.count, `${inv.percentage}%`])
        }

        // Price by zone.
        rows.push(["", "", ""])
        rows.push(["Precio por zona", "", ""])
        rows.push(["Zona", "Precio promedio", "Precio/m²"])

        for (const zone of propertiesData.priceByZone) {
          rows.push([zone.zone, `$${zone.avgPrice.toLocaleString()}`, `$${zone.avgPricePerM2.toLocaleString()}`])
        }

        return {
          title: "Analítica de propiedades",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "financial": {
        const rows: (string | number)[][] = []

        // Stats section.
        for (const stat of financialData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Revenue by month.
        rows.push(["", "", ""])
        rows.push(["Ingresos por mes", "", ""])
        rows.push(["Mes", "Ingreso", "Meta"])

        for (const point of financialData.revenueByMonth) {
          rows.push([
            point.date,
            typeof point.revenue === "number" ? `$${point.revenue.toLocaleString()}` : String(point.revenue ?? ""),
            typeof point.goal === "number" ? `$${point.goal.toLocaleString()}` : String(point.goal ?? ""),
          ])
        }

        // Top operations.
        rows.push(["", "", ""])
        rows.push(["Top operaciones", "", ""])
        rows.push(["Propiedad", "Tipo", "Comisión"])

        for (const op of financialData.topOperations) {
          rows.push([op.propertyTitle, op.operationType, `$${op.commission.toLocaleString()}`])
        }

        return {
          title: "Analítica financiera",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "bot": {
        const rows: (string | number)[][] = []

        // Stats section.
        for (const stat of botData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Bot funnel.
        rows.push(["", "", ""])
        rows.push(["Embudo del bot", "", ""])
        rows.push(["Etapa", "Cantidad", "Porcentaje"])

        for (const step of botData.botFunnel) {
          rows.push([step.label, step.value, `${step.percentage}%`])
        }

        return {
          title: "Analítica del bot",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "my-activity": {
        const rows: (string | number)[][] = []
        for (const stat of myActivityData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }
        return {
          title: "Mi actividad",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      default:
        return {
          title: "Exportación",
          headers: ["Métrica", "Valor", "Cambio"],
          rows: [],
        }
    }
  }, [activeTab, overviewData, inquiriesData, propertiesData, financialData, botData, myActivityData])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <ExportButton getExportData={getExportData} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="inquiries">Consultas</TabsTrigger>
          <TabsTrigger value="properties">Propiedades</TabsTrigger>
          <TabsTrigger value="financial">Financiero</TabsTrigger>
          <TabsTrigger value="bot">Bot</TabsTrigger>
          <TabsTrigger value="my-activity">Mi actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab {...overviewData} />
        </TabsContent>
        <TabsContent value="inquiries" className="mt-4">
          <InquiriesTab {...inquiriesData} />
        </TabsContent>
        <TabsContent value="properties" className="mt-4">
          <PropertiesTab {...propertiesData} />
        </TabsContent>
        <TabsContent value="financial" className="mt-4">
          <FinancialTab {...financialData} />
        </TabsContent>
        <TabsContent value="bot" className="mt-4">
          <BotTab {...botData} />
        </TabsContent>
        <TabsContent value="my-activity" className="mt-4">
          <MyActivityTab {...myActivityData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
