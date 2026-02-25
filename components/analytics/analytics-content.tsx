"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangeFilter } from "@/components/analytics/date-range-filter"
import { ExportButton } from "@/components/analytics/export-button"
import type { DateRangePreset } from "@/lib/types/analytics"

export function AnalyticsContent() {
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
          <p className="text-muted-foreground">Resumen -- proximamente</p>
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <p className="text-muted-foreground">Leads -- proximamente</p>
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
