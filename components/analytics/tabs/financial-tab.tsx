"use client"

import { DollarSign, Clock, Briefcase, Calculator } from "lucide-react"
import { AnalyticsStatCard } from "@/components/analytics/analytics-stat-card"
import { RevenueByMonth } from "@/components/analytics/charts/revenue-by-month"
import { PipelineFunnel } from "@/components/analytics/charts/pipeline-funnel"
import { CommissionsBySource } from "@/components/analytics/charts/commissions-by-source"
import { CommissionsByTypeDonut } from "@/components/analytics/charts/commissions-by-type-donut"
import { TopOperationsTable } from "@/components/analytics/charts/top-operations-table"
import type { StatCardData, TimeSeriesPoint, PipelineStage, FinancialOperation } from "@/lib/types/analytics"

interface FinancialTabProps {
  stats: StatCardData[]
  revenueByMonth: TimeSeriesPoint[]
  pipeline: PipelineStage[]
  commissionsBySource: { source: string; label: string; amount: number }[]
  commissionsByType: { type: string; label: string; amount: number; percentage: number }[]
  topOperations: FinancialOperation[]
}

const STAT_ICONS = [DollarSign, Clock, Briefcase, Calculator]

export function FinancialTab({ stats, revenueByMonth, pipeline, commissionsBySource, commissionsByType, topOperations }: FinancialTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat, i) => (
          <AnalyticsStatCard key={stat.title} title={stat.title} value={stat.value} subtitle={stat.subtitle} change={stat.change} icon={STAT_ICONS[i]} helpText={stat.helpText} contextLine={stat.contextLine} />
        ))}
      </div>

      <RevenueByMonth data={revenueByMonth} />

      <div className="grid gap-4 md:grid-cols-2">
        <PipelineFunnel data={pipeline} />
        <CommissionsBySource data={commissionsBySource} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CommissionsByTypeDonut data={commissionsByType} />
        <TopOperationsTable data={topOperations} />
      </div>
    </div>
  )
}
