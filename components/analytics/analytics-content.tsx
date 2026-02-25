"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangeFilter } from "@/components/analytics/date-range-filter"
import { ExportButton } from "@/components/analytics/export-button"
import { OverviewTab } from "@/components/analytics/tabs/overview-tab"
import { LeadsTab } from "@/components/analytics/tabs/leads-tab"
import type { DateRangePreset, StatCardData, TimeSeriesPoint, AlertItem, FunnelStep, SourceMetric } from "@/lib/types/analytics"

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

interface AnalyticsContentProps {
  overviewData: OverviewData
  leadsData: LeadsData
}

export function AnalyticsContent({ overviewData, leadsData }: AnalyticsContentProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d")
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <ExportButton activeTab={activeTab} />
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
          <p className="text-muted-foreground">Propiedades -- proximamente</p>
        </TabsContent>
        <TabsContent value="financial" className="mt-4">
          <p className="text-muted-foreground">Financiero -- proximamente</p>
        </TabsContent>
        <TabsContent value="bot" className="mt-4">
          <p className="text-muted-foreground">Bot -- proximamente</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
