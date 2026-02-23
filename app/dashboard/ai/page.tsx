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
import { AiContentsFilters } from "@/components/ai/ai-contents-filters"
import { AiContentsList } from "@/components/ai/ai-contents-list"
import { useAiContentsFilter } from "@/hooks/use-ai-contents-filter"
import { getAiContents } from "@/lib/data/ai-contents"
import type { AiContent } from "@/lib/types/ai-content"

export default function AiContentsPage() {
  const [contents, setContents] = useState<AiContent[]>([])
  const [loading, setLoading] = useState(true)
  const { filters, setFilters, filteredContents } = useAiContentsFilter(contents)

  function loadContents() {
    getAiContents().then((data) => {
      setContents(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadContents()
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
              <BreadcrumbPage>Contenido IA</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Contenido IA</h1>
        </div>

        <AiContentsFilters
          filters={filters}
          onFiltersChange={setFilters}
          contents={contents}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando contenidos...</p>
          </div>
        ) : (
          <AiContentsList contents={filteredContents} onRefresh={loadContents} />
        )}
      </div>
    </>
  )
}
