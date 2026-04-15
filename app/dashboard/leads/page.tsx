"use client"

import { useEffect, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { LeadFiltersBar } from "@/features/leads/presentation/components/lead-filters"
import { LeadDataTable } from "@/features/leads/presentation/components/lead-data-table"
import { useLeadsFilter } from "@/hooks/use-leads-filter"
import { getLeads } from "@/lib/data/leads"
import type { Lead } from "@/lib/types/lead"

export default function ContactsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const { filters, setFilters, filteredLeads } = useLeadsFilter(leads)

  useEffect(() => {
    getLeads().then((data) => {
      setLeads(data)
      setLoading(false)
    })
  }, [])

  return (
    <>
      <DashboardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Leads</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        </div>

        <LeadFiltersBar filters={filters} onFiltersChange={setFilters} />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando leads...</p>
          </div>
        ) : (
          <LeadDataTable leads={filteredLeads} />
        )}
      </div>
    </>
  )
}
