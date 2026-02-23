import { notFound } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { PropertyDetailHeader } from "@/components/properties/property-detail/property-detail-header"
import { PropertyDetailGallery } from "@/components/properties/property-detail/property-detail-gallery"
import { PropertyDetailInfo } from "@/components/properties/property-detail/property-detail-info"
import { PropertyDetailMap } from "@/components/properties/property-detail/property-detail-map"
import { getPropertyById } from "@/lib/data/properties"

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const property = await getPropertyById(id)

  if (!property) {
    notFound()
  }

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/dashboard/properties">Propiedades</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{property.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PropertyDetailHeader property={property} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PropertyDetailGallery property={property} />
          <PropertyDetailMap address={property.address} />
        </div>
        <PropertyDetailInfo property={property} />
      </div>
    </>
  )
}
