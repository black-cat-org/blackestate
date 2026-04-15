import { PropertyDetailGallery } from "./property-detail-gallery"
import { PropertyDetailInfo } from "./property-detail-info"
import { PropertyDetailMap } from "./property-detail-map"
import type { Property } from "@/features/properties/domain/property.entity"

interface PropertyDetailTabsProps {
  property: Property
}

export function PropertyDetailTabs({ property }: PropertyDetailTabsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <PropertyDetailGallery property={property} />
        <PropertyDetailMap address={property.address} hideExactLocation={property.hideExactLocation} />
      </div>
      <PropertyDetailInfo property={property} />
    </div>
  )
}
