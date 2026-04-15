"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"
import type { PropertyRanking } from "@/features/analytics/domain/analytics.entity"

interface TopPropertiesTableProps {
  data: PropertyRanking[]
}

type SortKey = "leads" | "visits" | "appointments"
type SortDir = "asc" | "desc"

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mt-0.5 h-1 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export function TopPropertiesTable({ data }: TopPropertiesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("leads")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    return [...data].sort((a, b) =>
      sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
    )
  }, [data, sortKey, sortDir])

  const maxLeads = Math.max(...data.map((d) => d.leads), 1)
  const maxVisits = Math.max(...data.map((d) => d.visits), 1)
  const maxAppointments = Math.max(...data.map((d) => d.appointments), 1)

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
          title="Propiedades con más interacción"
          helpText="Muestra qué propiedades están generando más actividad. Leads son las personas que preguntaron por esa propiedad, visitas son las veces que alguien abrió su página pública, y citas son las visitas presenciales agendadas. Una propiedad con muchas visitas pero pocos leads puede indicar que el precio o la descripción no está convenciendo."
          subtitle="tus propiedades ordenadas por actividad generada en este período"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propiedad</TableHead>
              <TableHead className="text-right w-24">
                <button type="button" className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("leads")}>
                  Leads <SortIcon column="leads" />
                </button>
              </TableHead>
              <TableHead className="text-right w-24">
                <button type="button" className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("visits")}>
                  Visitas <SortIcon column="visits" />
                </button>
              </TableHead>
              <TableHead className="text-right w-24">
                <button type="button" className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("appointments")}>
                  Citas <SortIcon column="appointments" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="text-right">
                  <span className="text-sm">{item.leads}</span>
                  <ProgressBar value={item.leads} max={maxLeads} color="hsl(217, 91%, 60%)" />
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm">{item.visits}</span>
                  <ProgressBar value={item.visits} max={maxVisits} color="hsl(142, 71%, 45%)" />
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm">{item.appointments}</span>
                  <ProgressBar value={item.appointments} max={maxAppointments} color="hsl(271, 91%, 65%)" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
