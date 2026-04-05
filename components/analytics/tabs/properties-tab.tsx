"use client"

import { Building2, Clock, DollarSign } from "lucide-react"
import { AnalyticsStatCard } from "@/components/analytics/analytics-stat-card"
import { InventoryStatusBar } from "@/components/analytics/charts/inventory-status-bar"
import { PriceByZone } from "@/components/analytics/charts/price-by-zone"
import { PropertyTypeDonut } from "@/components/analytics/charts/property-type-donut"
import { PricePerM2 } from "@/components/analytics/charts/price-per-m2"
import { TopPropertiesTable } from "@/components/analytics/charts/top-properties-table"
import { PriceTrendLines } from "@/components/analytics/charts/price-trend-lines"
import type { StatCardData, ZonePricing, PropertyRanking, TimeSeriesPoint } from "@/lib/types/analytics"

interface PropertiesTabProps {
  stats: StatCardData[]
  inventoryStatus: { status: string; label: string; count: number; percentage: number; fill: string }[]
  priceByZone: ZonePricing[]
  typeDistribution: { type: string; label: string; count: number; percentage: number }[]
  pricePerM2: ZonePricing[]
  topProperties: PropertyRanking[]
  priceTrend: TimeSeriesPoint[]
  priceTrendZones: string[]
}

import { Eye } from "lucide-react"
const STAT_ICONS = [Building2, Clock, DollarSign, Eye]

export function PropertiesTab({ stats, inventoryStatus, priceByZone, typeDistribution, pricePerM2, topProperties, priceTrend, priceTrendZones }: PropertiesTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat, i) => (
          <AnalyticsStatCard key={stat.title} title={stat.title} value={stat.value} subtitle={stat.subtitle} change={stat.change} icon={STAT_ICONS[i]} helpText={stat.helpText} contextLine={stat.contextLine} />
        ))}
      </div>

      <InventoryStatusBar data={inventoryStatus} />

      <div className="grid gap-4 md:grid-cols-2">
        <PropertyTypeDonut data={typeDistribution} />
        <TopPropertiesTable data={topProperties} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PriceByZone data={priceByZone} />
        <PricePerM2 data={pricePerM2} />
      </div>

      <PriceTrendLines data={priceTrend} zones={priceTrendZones} />
    </div>
  )
}
