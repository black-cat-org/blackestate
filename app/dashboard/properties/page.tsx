"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { PropertyFiltersBar } from "@/features/properties/presentation/components/property-filters"
import { PropertyViewToggle } from "@/features/properties/presentation/components/property-view-toggle"
import { PropertyCardsGrid } from "@/features/properties/presentation/components/property-cards-grid"
import { PropertyDataTable } from "@/features/properties/presentation/components/property-data-table"
import { usePropertiesFilter } from "@/hooks/use-properties-filter"
import { getPropertiesAction } from "@/features/properties/presentation/actions"
import { getAiContentsAction } from "@/features/ai-contents/presentation/actions"
import type { Property } from "@/features/properties/domain/property.entity"
import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [contents, setContents] = useState<AiContent[]>([])
  const [loading, setLoading] = useState(true)
  const { filters, setFilters, viewMode, setViewMode, filteredProperties } =
    usePropertiesFilter(properties)

  useEffect(() => {
    Promise.all([getPropertiesAction(), getAiContentsAction()]).then(([props, aiContents]) => {
      setProperties(props)
      setContents(aiContents)
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
              <BreadcrumbPage>Propiedades</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Propiedades</h1>
          <Button asChild>
            <Link href="/dashboard/properties/new">
              <Plus className="mr-2 size-4" />
              Nueva propiedad
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <PropertyFiltersBar filters={filters} onFiltersChange={setFilters} />
          </div>
          <PropertyViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando propiedades...</p>
          </div>
        ) : viewMode === "cards" ? (
          <PropertyCardsGrid properties={filteredProperties} contents={contents} />
        ) : (
          <PropertyDataTable properties={filteredProperties} />
        )}
      </div>
    </>
  )
}
