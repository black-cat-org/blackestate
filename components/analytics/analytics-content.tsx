"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangeFilter } from "@/components/analytics/date-range-filter"
import { ExportButton } from "@/components/analytics/export-button"
import { OverviewTab } from "@/components/analytics/tabs/overview-tab"
import { LeadsTab } from "@/components/analytics/tabs/leads-tab"
import { PropertiesTab } from "@/components/analytics/tabs/properties-tab"
import { FinancialTab } from "@/components/analytics/tabs/financial-tab"
import { BotTab } from "@/components/analytics/tabs/bot-tab"
import type { DateRangePreset, StatCardData, TimeSeriesPoint, AlertItem, FunnelStep, SourceMetric, ZonePricing, PropertyRanking, PipelineStage, FinancialOperation, BotFunnelStep, HeatmapCell } from "@/lib/types/analytics"

interface OverviewData {
  stats: StatCardData[]
  leadsTrend: TimeSeriesPoint[]
  conversionsByMonth: TimeSeriesPoint[]
  sourceDistribution: { source: string; label: string; count: number; percentage: number }[]
  alerts: AlertItem[]
}

interface LeadsData {
  stats: StatCardData[]
  conversionFunnel: FunnelStep[]
  leadsBySourceOverTime: TimeSeriesPoint[]
  conversionBySource: SourceMetric[]
  responseTime: { average: number; meta: number; distribution: { fast: number; medium: number; slow: number } }
  leadsByPropertyType: { type: string; label: string; count: number }[]
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
  appointmentOutcomes: { status: string; label: string; count: number; percentage: number; fill: string }[]
}

interface AnalyticsContentProps {
  overviewData: OverviewData
  leadsData: LeadsData
  propertiesData: PropertiesData
  financialData: FinancialData
  botData: BotData
}

function formatStatChange(change?: number): string {
  if (change === undefined) return "-"
  const sign = change >= 0 ? "+" : ""
  return `${sign}${change}%`
}

export function AnalyticsContent({ overviewData, leadsData, propertiesData, financialData, botData }: AnalyticsContentProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d")
  const [activeTab, setActiveTab] = useState("overview")

  const getExportData = useCallback(() => {
    switch (activeTab) {
      case "overview": {
        const rows: (string | number)[][] = []

        // Stats section
        for (const stat of overviewData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Blank separator
        rows.push(["", "", ""])
        rows.push(["Distribución por fuente", "", ""])
        rows.push(["Fuente", "Cantidad", "Porcentaje"])

        for (const src of overviewData.sourceDistribution) {
          rows.push([src.label, src.count, `${src.percentage}%`])
        }

        return {
          title: "Resumen General",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "leads": {
        const rows: (string | number)[][] = []

        // Stats section
        for (const stat of leadsData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Blank separator
        rows.push(["", "", ""])
        rows.push(["Embudo de conversión", "", ""])
        rows.push(["Estado", "Cantidad", ""])

        for (const step of leadsData.conversionFunnel) {
          rows.push([step.label, step.value, ""])
        }

        // Conversion by source
        rows.push(["", "", ""])
        rows.push(["Conversión por fuente", "", ""])
        rows.push(["Fuente", "Leads", "Tasa de conversión"])

        for (const src of leadsData.conversionBySource) {
          rows.push([src.label, src.count, `${src.conversionRate}%`])
        }

        return {
          title: "Analítica de Leads",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "properties": {
        const rows: (string | number)[][] = []

        // Stats section
        for (const stat of propertiesData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Inventory status
        rows.push(["", "", ""])
        rows.push(["Estado del inventario", "", ""])
        rows.push(["Estado", "Cantidad", "Porcentaje"])

        for (const inv of propertiesData.inventoryStatus) {
          rows.push([inv.label, inv.count, `${inv.percentage}%`])
        }

        // Price by zone
        rows.push(["", "", ""])
        rows.push(["Precio por zona", "", ""])
        rows.push(["Zona", "Precio promedio", "Precio/m²"])

        for (const zone of propertiesData.priceByZone) {
          rows.push([zone.zone, `$${zone.avgPrice.toLocaleString()}`, `$${zone.avgPricePerM2.toLocaleString()}`])
        }

        return {
          title: "Analítica de Propiedades",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "financial": {
        const rows: (string | number)[][] = []

        // Stats section
        for (const stat of financialData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Revenue by month
        rows.push(["", "", ""])
        rows.push(["Ingresos por mes", "", ""])
        rows.push(["Mes", "Ingreso", "Meta"])

        for (const point of financialData.revenueByMonth) {
          rows.push([
            point.date,
            typeof point.ingreso === "number" ? `$${point.ingreso.toLocaleString()}` : String(point.ingreso ?? ""),
            typeof point.meta === "number" ? `$${point.meta.toLocaleString()}` : String(point.meta ?? ""),
          ])
        }

        // Top operations
        rows.push(["", "", ""])
        rows.push(["Top operaciones", "", ""])
        rows.push(["Propiedad", "Tipo", "Comisión"])

        for (const op of financialData.topOperations) {
          rows.push([op.propertyTitle, op.operationType, `$${op.commission.toLocaleString()}`])
        }

        return {
          title: "Analítica Financiera",
          headers: ["Métrica", "Valor", "Cambio"],
          rows,
        }
      }

      case "bot": {
        const rows: (string | number)[][] = []

        // Stats section
        for (const stat of botData.stats) {
          rows.push([stat.title, String(stat.value), formatStatChange(stat.change)])
        }

        // Bot funnel
        rows.push(["", "", ""])
        rows.push(["Embudo del bot", "", ""])
        rows.push(["Etapa", "Cantidad", "Porcentaje"])

        for (const step of botData.botFunnel) {
          rows.push([step.label, step.value, `${step.percentage}%`])
        }

        // Appointment outcomes
        rows.push(["", "", ""])
        rows.push(["Resultados de citas", "", ""])
        rows.push(["Estado", "Cantidad", "Porcentaje"])

        for (const outcome of botData.appointmentOutcomes) {
          rows.push([outcome.label, outcome.count, `${outcome.percentage}%`])
        }

        return {
          title: "Analítica del Bot",
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
  }, [activeTab, overviewData, leadsData, propertiesData, financialData, botData])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <ExportButton getExportData={getExportData} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="properties">Propiedades</TabsTrigger>
          <TabsTrigger value="financial">Financiero</TabsTrigger>
          <TabsTrigger value="bot">Bot</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab {...overviewData} />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <LeadsTab {...leadsData} />
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
      </Tabs>
    </div>
  )
}
