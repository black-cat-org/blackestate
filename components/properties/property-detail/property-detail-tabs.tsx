"use client"

import { Info, Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PropertyDetailGallery } from "@/components/properties/property-detail/property-detail-gallery"
import { PropertyDetailInfo } from "@/components/properties/property-detail/property-detail-info"
import { PropertyDetailMap } from "@/components/properties/property-detail/property-detail-map"
import { AiPropertyContent } from "@/components/ai/ai-property-content"
import type { Property } from "@/lib/types/property"

interface PropertyDetailTabsProps {
  property: Property
}

export function PropertyDetailTabs({ property }: PropertyDetailTabsProps) {
  return (
    <Tabs defaultValue="info">
      <TabsList variant="line">
        <TabsTrigger value="info">
          <Info className="size-4" />
          Información
        </TabsTrigger>
        <TabsTrigger value="ai">
          <Sparkles className="size-4" />
          Contenido IA
        </TabsTrigger>
      </TabsList>
      <TabsContent value="info">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <PropertyDetailGallery property={property} />
            <PropertyDetailMap address={property.address} />
          </div>
          <PropertyDetailInfo property={property} />
        </div>
      </TabsContent>
      <TabsContent value="ai">
        <AiPropertyContent property={property} />
      </TabsContent>
    </Tabs>
  )
}
