# Analytics Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full analytics and reporting module at `/dashboard/analytics` with 5 tabs (Resumen, Leads, Propiedades, Financiero, Bot), date range filtering, and PDF/Excel export.

**Architecture:** Single page with shadcn Tabs component. Mock data functions in `lib/data/analytics.ts` generate historical/aggregated data from existing mock entities. Each tab is a client component receiving server-side data. Export uses jspdf (already installed) + xlsx (to install).

**Tech Stack:** Next.js App Router, Recharts, shadcn Tabs/Card/Badge/Table, jspdf, xlsx

---

### Task 1: Add sidebar navigation entry

**Files:**
- Modify: `components/app-sidebar.tsx`

**Step 1: Add BarChart3 icon import and analytics nav item**

In `components/app-sidebar.tsx`, add `BarChart3` to the lucide-react import and add the analytics entry to `navMain` between "Mi Bot" and "Configuracion":

```typescript
// Add to imports:
import { BarChart3, Bot, Building2, Calendar, LayoutDashboard, LifeBuoy, Send, Settings2, Users } from "lucide-react"

// Add to navMain array, after "Mi Bot" entry:
{
  title: "Analíticas",
  url: "/dashboard/analytics",
  icon: BarChart3,
},
```

**Step 2: Verify the dev server shows the new sidebar item**

Run: `npm run dev`
Expected: Sidebar shows "Analiticas" between "Mi Bot" and "Configuracion"

**Step 3: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat(analytics): add analytics entry to sidebar navigation"
```

---

### Task 2: Create analytics types

**Files:**
- Create: `lib/types/analytics.ts`

**Step 1: Create the types file**

```typescript
export type DateRangePreset = "7d" | "30d" | "90d" | "this_month" | "this_year" | "custom"

export interface DateRange {
  from: Date
  to: Date
}

export interface StatCardData {
  title: string
  value: string | number
  subtitle?: string
  change?: number // percentage change vs previous period, positive = up, negative = down
}

export interface FunnelStep {
  label: string
  value: number
  fill: string
}

export interface TimeSeriesPoint {
  date: string // YYYY-MM format for monthly, YYYY-MM-DD for daily
  [key: string]: string | number
}

export interface SourceMetric {
  source: string
  label: string
  count: number
  conversionRate: number
  revenue: number
}

export interface PropertyRanking {
  id: string
  title: string
  leads: number
  visits: number
  appointments: number
}

export interface ZonePricing {
  zone: string
  avgPrice: number
  avgPricePerM2: number
  count: number
}

export interface PipelineStage {
  stage: string
  label: string
  value: number
  probability: number
  fill: string
}

export interface FinancialOperation {
  id: string
  propertyTitle: string
  operationType: string
  propertyValue: number
  commission: number
  source: string
  closedAt: string
}

export interface HeatmapCell {
  day: number // 0=Mon, 6=Sun
  hour: number // 0-23
  value: number
}

export interface BotFunnelStep {
  label: string
  value: number
  percentage: number
  fill: string
}

export interface AlertItem {
  id: string
  type: "warning" | "info" | "urgent"
  title: string
  description: string
  actionUrl?: string
}
```

**Step 2: Commit**

```bash
git add lib/types/analytics.ts
git commit -m "feat(analytics): add analytics type definitions"
```

---

### Task 3: Create analytics mock data layer

**Files:**
- Create: `lib/data/analytics.ts`

**Step 1: Create the analytics data file**

This is the core data layer. It imports existing mock data and generates aggregated analytics. Key functions:

```typescript
import { getLeads } from "@/lib/data/leads"
import { getProperties } from "@/lib/data/properties"
import { getAppointments, getAllActivities, getMessagesByLead } from "@/lib/data/bot"
import { getSentProperties } from "@/lib/data/bot"
import { LEAD_STATUS_LABELS } from "@/lib/constants/lead"
import { SOURCE_LABELS, VALID_SOURCES } from "@/lib/constants/sources"
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import type { LeadStatus } from "@/lib/types/lead"
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
```

Implement these functions — each returns mock data computed from the existing entities. Where historical data is needed (trends over months), generate synthetic monthly data points for the last 6 months.

Functions to implement:

**Overview tab:**
- `getOverviewStats()` — returns 4 StatCardData: leads nuevos, tasa conversion, valor pipeline, comisiones estimadas (each with `change` %)
- `getLeadsTrend()` — returns TimeSeriesPoint[] with monthly lead counts for last 6 months
- `getConversionsByMonth()` — returns TimeSeriesPoint[] with cerrados/descartados per month
- `getLeadsSourceDistribution()` — returns {source, label, count, percentage}[]
- `getAlerts()` — returns AlertItem[] scanning leads sin contactar >48h, citas sin confirmar, props sin leads

**Leads tab:**
- `getLeadsStats()` — returns 4 StatCardData: total leads, tiempo promedio cierre, tasa cierre, costo por lead est.
- `getConversionFunnel()` — returns FunnelStep[] with counts per status and % between steps
- `getLeadsBySourceOverTime()` — returns TimeSeriesPoint[] stacked by source per month
- `getConversionBySource()` — returns SourceMetric[]
- `getResponseTimeMetrics()` — returns {average, distribution: {fast, medium, slow}} (mock)
- `getLeadsByPropertyType()` — returns {type, label, count}[]

**Properties tab:**
- `getPropertiesStats()` — returns 4 StatCardData
- `getInventoryStatus()` — returns {status, label, count, percentage, fill}[]
- `getAvgPriceByZone()` — returns ZonePricing[]
- `getPropertyTypeDistribution()` — returns {type, label, count, percentage}[]
- `getPricePerM2ByZone()` — returns ZonePricing[] (same zones, price/m2 data)
- `getTopProperties()` — returns PropertyRanking[] (top 5 by lead count)
- `getPriceTrendByZone()` — returns TimeSeriesPoint[] multi-line (6 months)

**Financial tab:**
- `getFinancialStats()` — returns 4 StatCardData
- `getRevenueByMonth()` — returns TimeSeriesPoint[] with revenue + goal line
- `getPipelineByStage()` — returns PipelineStage[]
- `getCommissionsBySource()` — returns {source, label, amount}[]
- `getCommissionsByOperationType()` — returns {type, label, amount, percentage}[]
- `getTopOperations()` — returns FinancialOperation[]

**Bot tab:**
- `getBotStats()` — returns 4 StatCardData
- `getBotActivityByDay()` — returns TimeSeriesPoint[] daily for last 30 days
- `getBotFunnel()` — returns BotFunnelStep[]
- `getEngagementHeatmap()` — returns HeatmapCell[]
- `getAppointmentOutcomes()` — returns {status, label, count, percentage, fill}[]

All functions should use `getSentPropertiesAll()` — add this export to `lib/data/bot.ts`:

```typescript
export async function getSentPropertiesAll(): Promise<SentProperty[]> {
  return Promise.resolve([...sentProperties])
}
```

For historical data, generate reasonable synthetic data points. Example approach for `getLeadsTrend()`:

```typescript
export async function getLeadsTrend(): Promise<TimeSeriesPoint[]> {
  // Generate 6 months of synthetic data
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = date.toLocaleDateString("es-AR", { month: "short", year: "2-digit" })
    months.push({
      date: label,
      actual: Math.floor(Math.random() * 15) + 5 + (5 - i) * 2, // trending up
      anterior: Math.floor(Math.random() * 12) + 3 + (5 - i) * 1,
    })
  }
  return months
}
```

Use consistent seed-like patterns (not truly random) for the mock data so charts look the same across refreshes. Use deterministic values based on array indices rather than Math.random().

**Step 2: Add `getSentPropertiesAll` to bot.ts**

Add to `lib/data/bot.ts`:

```typescript
export async function getSentPropertiesAll(): Promise<SentProperty[]> {
  return Promise.resolve([...sentProperties])
}
```

**Step 3: Verify file compiles**

Run: `npx tsc --noEmit lib/data/analytics.ts`
Or just check no red squiggles in dev server.

**Step 4: Commit**

```bash
git add lib/data/analytics.ts lib/data/bot.ts lib/types/analytics.ts
git commit -m "feat(analytics): add analytics data layer with mock aggregations"
```

---

### Task 4: Install xlsx package for Excel export

**Files:**
- Modify: `package.json`

**Step 1: Install xlsx**

```bash
npm install xlsx
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(analytics): add xlsx package for Excel export"
```

---

### Task 5: Create analytics page layout with tabs and date filter

**Files:**
- Create: `app/dashboard/analytics/page.tsx`
- Create: `components/analytics/date-range-filter.tsx`
- Create: `components/analytics/export-button.tsx`

**Step 1: Create the date range filter component**

`components/analytics/date-range-filter.tsx` — Client component with a Select dropdown for preset ranges (7d, 30d, 90d, Este mes, Este ano). Uses shadcn Select. Emits `onRangeChange(preset)`.

```typescript
"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DateRangePreset } from "@/lib/types/analytics"

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "this_month", label: "Este mes" },
  { value: "this_year", label: "Este año" },
]

interface DateRangeFilterProps {
  value: DateRangePreset
  onChange: (value: DateRangePreset) => void
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRangePreset)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRESETS.map((p) => (
          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Step 2: Create the export button component**

`components/analytics/export-button.tsx` — Client component with a dropdown (PDF / Excel). Uses jspdf and xlsx to export the active tab's data. For now, implement basic table-to-PDF and table-to-Excel.

```typescript
"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText } from "lucide-react"

interface ExportButtonProps {
  activeTab: string
}

export function ExportButton({ activeTab }: ExportButtonProps) {
  const handleExportPDF = () => {
    // Will implement per-tab PDF generation
    console.log("Export PDF for", activeTab)
  }

  const handleExportExcel = () => {
    // Will implement per-tab Excel generation
    console.log("Export Excel for", activeTab)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 size-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="mr-2 size-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="mr-2 size-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 3: Create the analytics page**

`app/dashboard/analytics/page.tsx` — Server component that fetches all data, passes to a client wrapper with tabs.

Create `components/analytics/analytics-content.tsx` as the client wrapper:

```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangeFilter } from "@/components/analytics/date-range-filter"
import { ExportButton } from "@/components/analytics/export-button"
import type { DateRangePreset } from "@/lib/types/analytics"

// Tab content components will be added in subsequent tasks
// import { OverviewTab } from "./tabs/overview-tab"
// etc.

interface AnalyticsContentProps {
  data: Record<string, unknown> // Will be typed properly as tabs are built
}

export function AnalyticsContent({ data }: AnalyticsContentProps) {
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
          <p className="text-muted-foreground">Resumen — próximamente</p>
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <p className="text-muted-foreground">Leads — próximamente</p>
        </TabsContent>
        <TabsContent value="properties" className="mt-4">
          <p className="text-muted-foreground">Propiedades — próximamente</p>
        </TabsContent>
        <TabsContent value="financial" className="mt-4">
          <p className="text-muted-foreground">Financiero — próximamente</p>
        </TabsContent>
        <TabsContent value="bot" className="mt-4">
          <p className="text-muted-foreground">Bot — próximamente</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

The page (`app/dashboard/analytics/page.tsx`):

```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { AnalyticsContent } from "@/components/analytics/analytics-content"

export default async function AnalyticsPage() {
  return (
    <>
      <DashboardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Analíticas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <AnalyticsContent data={{}} />
      </div>
    </>
  )
}
```

**Step 4: Check Select component exists**

Verify `components/ui/select.tsx` exists. If not, add it:

```bash
npx shadcn@latest add select
```

**Step 5: Verify page renders**

Navigate to `http://localhost:3000/dashboard/analytics`
Expected: Breadcrumb, date filter, export button, 5 tabs with placeholder text

**Step 6: Commit**

```bash
git add app/dashboard/analytics/ components/analytics/
git commit -m "feat(analytics): add analytics page skeleton with tabs, date filter, and export"
```

---

### Task 6: Build the StatCard variant with change indicator

**Files:**
- Create: `components/analytics/analytics-stat-card.tsx`

**Step 1: Create the enhanced stat card**

Extends the existing StatCard pattern but adds a `change` percentage indicator (green arrow up / red arrow down):

```typescript
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface AnalyticsStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  icon: LucideIcon
}

export function AnalyticsStatCard({ title, value, subtitle, change, icon: Icon }: AnalyticsStatCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <div className="flex items-center gap-1">
            {change !== undefined && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {change >= 0 ? "+" : ""}{change.toFixed(1)}%
              </span>
            )}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add components/analytics/analytics-stat-card.tsx
git commit -m "feat(analytics): add stat card variant with change indicator"
```

---

### Task 7: Build Overview tab (Resumen)

**Files:**
- Create: `components/analytics/tabs/overview-tab.tsx`
- Create: `components/analytics/charts/leads-trend-chart.tsx`
- Create: `components/analytics/charts/conversions-by-month-chart.tsx`
- Create: `components/analytics/charts/source-donut-chart.tsx`
- Create: `components/analytics/alerts-panel.tsx`
- Modify: `components/analytics/analytics-content.tsx`
- Modify: `app/dashboard/analytics/page.tsx`

**Step 1: Create chart components**

Each chart follows the existing pattern: client component, uses ChartContainer, Card wrapper, CardTitle.

`leads-trend-chart.tsx` — Line chart with 2 lines (actual vs anterior).
`conversions-by-month-chart.tsx` — Bar chart with cerrados (green) and descartados (gray) bars.
`source-donut-chart.tsx` — Pie/Donut chart with % per source, using existing source colors.
`alerts-panel.tsx` — Card with list of AlertItem, each with icon (AlertTriangle/Info), title, description, optional link.

**Step 2: Create the OverviewTab component**

Assembles: 4 AnalyticsStatCards in grid → 2 charts in grid → donut + alerts in grid. Follow the dashboard page layout pattern: `grid gap-4 md:grid-cols-2 lg:grid-cols-4` for stats, `grid gap-4 md:grid-cols-2` for charts.

**Step 3: Wire data from server page → AnalyticsContent → OverviewTab**

Update `app/dashboard/analytics/page.tsx` to call the overview data functions and pass them down. Update `AnalyticsContent` to accept typed props and render `OverviewTab`.

**Step 4: Verify**

Navigate to analytics page, Overview tab should show 4 stat cards with change arrows, 2 line/bar charts, 1 donut, and alerts panel.

**Step 5: Commit**

```bash
git add components/analytics/
git commit -m "feat(analytics): implement overview tab with stats, charts, and alerts"
```

---

### Task 8: Build Leads tab

**Files:**
- Create: `components/analytics/tabs/leads-tab.tsx`
- Create: `components/analytics/charts/conversion-funnel.tsx`
- Create: `components/analytics/charts/leads-by-source-stacked.tsx`
- Create: `components/analytics/charts/conversion-by-source.tsx`
- Create: `components/analytics/charts/response-time-gauge.tsx`
- Create: `components/analytics/charts/leads-by-property-type.tsx`
- Modify: `components/analytics/analytics-content.tsx`
- Modify: `app/dashboard/analytics/page.tsx`

**Step 1: Create chart components**

`conversion-funnel.tsx` — Horizontal funnel using Recharts Bar chart with decreasing widths or a custom funnel layout. Show count + % between steps.
`leads-by-source-stacked.tsx` — Stacked bar chart, X axis = months, stacks = sources with existing source colors.
`conversion-by-source.tsx` — Horizontal bar chart showing conversion % per source.
`response-time-gauge.tsx` — Card with large number (average response time), a progress bar for meta, and 3-segment distribution bar (<5min, 5-30min, >30min).
`leads-by-property-type.tsx` — Horizontal bar chart by property type label.

**Step 2: Assemble LeadsTab**

Layout: 4 stat cards → full-width funnel → 2 charts grid → 2 charts grid.

**Step 3: Wire data and verify**

**Step 4: Commit**

```bash
git add components/analytics/
git commit -m "feat(analytics): implement leads tab with funnel, source analysis, and response metrics"
```

---

### Task 9: Build Properties & Market tab

**Files:**
- Create: `components/analytics/tabs/properties-tab.tsx`
- Create: `components/analytics/charts/inventory-status-bar.tsx`
- Create: `components/analytics/charts/price-by-zone.tsx`
- Create: `components/analytics/charts/property-type-donut.tsx`
- Create: `components/analytics/charts/price-per-m2.tsx`
- Create: `components/analytics/charts/top-properties-table.tsx`
- Create: `components/analytics/charts/price-trend-lines.tsx`
- Modify: `components/analytics/analytics-content.tsx`
- Modify: `app/dashboard/analytics/page.tsx`

**Step 1: Create chart components**

`inventory-status-bar.tsx` — Single stacked horizontal bar (100%) with property status colors from `PROPERTY_STATUS_COLORS`.
`price-by-zone.tsx` — Horizontal bar chart, zones on Y axis, avg price on X.
`property-type-donut.tsx` — Donut chart with property types.
`price-per-m2.tsx` — Grouped bar chart (venta vs alquiler) per zone.
`top-properties-table.tsx` — Table component using shadcn Table. Columns: Propiedad, Leads, Visitas, Citas.
`price-trend-lines.tsx` — Multi-line chart, 1 line per zone, X = months.

**Step 2: Assemble PropertiesTab**

Layout: 4 stats → full-width inventory bar → 2 charts → 2 charts → full-width trend lines.

**Step 3: Wire data and verify**

**Step 4: Commit**

```bash
git add components/analytics/
git commit -m "feat(analytics): implement properties tab with inventory, pricing, and market analysis"
```

---

### Task 10: Build Financial tab

**Files:**
- Create: `components/analytics/tabs/financial-tab.tsx`
- Create: `components/analytics/charts/revenue-by-month.tsx`
- Create: `components/analytics/charts/pipeline-funnel.tsx`
- Create: `components/analytics/charts/commissions-by-source.tsx`
- Create: `components/analytics/charts/commissions-by-type-donut.tsx`
- Create: `components/analytics/charts/top-operations-table.tsx`
- Modify: `components/analytics/analytics-content.tsx`
- Modify: `app/dashboard/analytics/page.tsx`

**Step 1: Create chart components**

`revenue-by-month.tsx` — ComposedChart with bars (revenue) + line (goal). Uses Recharts ComposedChart, Bar, Line.
`pipeline-funnel.tsx` — Vertical funnel/bar showing $ value per stage with probability %.
`commissions-by-source.tsx` — Horizontal bar chart, source on Y, $ on X.
`commissions-by-type-donut.tsx` — Donut chart (venta/alquiler/temporal).
`top-operations-table.tsx` — Table with columns: Propiedad, Tipo op., Valor, Comision, Fuente.

**Step 2: Assemble FinancialTab**

Layout: 4 stats → full-width revenue chart → 2 charts → 2 charts.

**Step 3: Wire data and verify**

**Step 4: Commit**

```bash
git add components/analytics/
git commit -m "feat(analytics): implement financial tab with revenue, pipeline, and commissions"
```

---

### Task 11: Build Bot & Engagement tab

**Files:**
- Create: `components/analytics/tabs/bot-tab.tsx`
- Create: `components/analytics/charts/bot-activity-area.tsx`
- Create: `components/analytics/charts/bot-funnel.tsx`
- Create: `components/analytics/charts/engagement-heatmap.tsx`
- Create: `components/analytics/charts/appointment-outcomes-donut.tsx`
- Modify: `components/analytics/analytics-content.tsx`
- Modify: `app/dashboard/analytics/page.tsx`

**Step 1: Create chart components**

`bot-activity-area.tsx` — AreaChart with stacked areas (mensajes, props enviadas).
`bot-funnel.tsx` — Vertical bars showing sent → viewed → interested → appointment with % labels.
`engagement-heatmap.tsx` — Custom grid component: 7 columns (days) × time rows. Each cell is a small colored div with opacity based on value. Legend at bottom.
`appointment-outcomes-donut.tsx` — Donut chart with appointment status colors + text showing completion rate.

**Step 2: Assemble BotTab**

Layout: 4 stats → full-width area chart → 2 charts → 2 charts.

**Step 3: Wire data and verify**

**Step 4: Commit**

```bash
git add components/analytics/
git commit -m "feat(analytics): implement bot tab with activity, engagement heatmap, and outcomes"
```

---

### Task 12: Implement PDF and Excel export

**Files:**
- Modify: `components/analytics/export-button.tsx`
- Create: `lib/utils/export.ts`

**Step 1: Create export utility**

`lib/utils/export.ts`:

```typescript
import jsPDF from "jspdf"
import * as XLSX from "xlsx"

interface ExportData {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(data.title, 14, 20)
  doc.setFontSize(10)

  let y = 35
  // Headers
  const colWidth = (doc.internal.pageSize.width - 28) / data.headers.length
  data.headers.forEach((h, i) => {
    doc.setFont("helvetica", "bold")
    doc.text(h, 14 + i * colWidth, y)
  })
  y += 8

  // Rows
  doc.setFont("helvetica", "normal")
  for (const row of data.rows) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    row.forEach((cell, i) => {
      doc.text(String(cell), 14 + i * colWidth, y)
    })
    y += 6
  }

  doc.save(`${data.title.toLowerCase().replace(/\s+/g, "-")}.pdf`)
}

export function exportToExcel(data: ExportData) {
  const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, data.title.slice(0, 31))
  XLSX.writeFile(wb, `${data.title.toLowerCase().replace(/\s+/g, "-")}.xlsx`)
}
```

**Step 2: Wire export button to collect tab data**

Update `ExportButton` to accept a `getExportData` callback that each tab provides. When clicked, it calls the callback and passes to `exportToPDF` or `exportToExcel`.

**Step 3: Verify export works**

Click Export > PDF and Export > Excel on each tab. Files should download.

**Step 4: Commit**

```bash
git add lib/utils/export.ts components/analytics/export-button.tsx
git commit -m "feat(analytics): implement PDF and Excel export functionality"
```

---

### Task 13: Final review and lint

**Files:**
- All analytics files

**Step 1: Run linter**

```bash
npm run lint
```

Fix any issues.

**Step 2: Run build**

```bash
npm run build
```

Fix any type errors.

**Step 3: Visual review**

Navigate through all 5 tabs, verify all charts render, date filter is visible, export buttons work.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(analytics): finalize analytics module with all tabs, charts, and export"
```

---

## Implementation Notes

- **Follow existing patterns exactly:** Card with CardHeader/CardTitle/CardContent, ChartContainer with ChartConfig, HSL colors
- **Spanish labels everywhere:** All UI text in Spanish, matching existing conventions
- **Responsive grids:** Use the same `md:grid-cols-2 lg:grid-cols-4` pattern from the dashboard
- **Dark mode:** All colors must work with the existing oklch dark mode variables. Use chart colors with HSL format
- **Keep design consistent:** Do NOT deviate from the existing visual style. Match card radius, font sizes, spacing exactly
- **Mock data should be deterministic:** Use computed values, not Math.random(), so charts look consistent across refreshes
