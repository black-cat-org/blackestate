"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"
import type { FinancialOperation } from "@/features/analytics/domain/analytics.entity"

interface TopOperationsTableProps {
  data: FinancialOperation[]
}

type SortKey = "propertyValue" | "commission"
type SortDir = "asc" | "desc"

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mt-0.5 h-1 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export function TopOperationsTable({ data }: TopOperationsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("commission")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    return [...data].sort((a, b) =>
      sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
    )
  }, [data, sortKey, sortDir])

  const maxValue = Math.max(...data.map((d) => d.propertyValue), 1)
  const maxCommission = Math.max(...data.map((d) => d.commission), 1)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="ml-1 size-3 text-muted-foreground" />
    return sortDir === "desc"
      ? <ArrowDown className="ml-1 size-3" />
      : <ArrowUp className="ml-1 size-3" />
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Top operaciones"
          helpText="Muestra tus operaciones cerradas ordenadas por valor. Te permite ver de un vistazo cuáles fueron tus mejores negocios y cuánto ganaste en comisión por cada uno."
          subtitle="tus operaciones cerradas ordenadas por valor de comisión"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propiedad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right w-28">
                <button type="button" className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("propertyValue")}>
                  Valor <SortIcon column="propertyValue" />
                </button>
              </TableHead>
              <TableHead className="text-right w-28">
                <button type="button" className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("commission")}>
                  Comisión <SortIcon column="commission" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((op) => (
              <TableRow key={op.id}>
                <TableCell className="font-medium">{op.propertyTitle}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{op.operationType}</TableCell>
                <TableCell className="text-right">
                  <span className="text-sm">US$ {op.propertyValue.toLocaleString("es-BO")}</span>
                  <ProgressBar value={op.propertyValue} max={maxValue} color="hsl(217, 91%, 60%)" />
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm">US$ {op.commission.toLocaleString("es-BO")}</span>
                  <ProgressBar value={op.commission} max={maxCommission} color="hsl(142, 71%, 45%)" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
