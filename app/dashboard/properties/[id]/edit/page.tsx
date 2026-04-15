import { notFound } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { PropertyEditForm } from "@/features/properties/presentation/components/property-edit-form"
import { getPropertyByIdAction } from "@/features/properties/presentation/actions"
import { propertyToFormData } from "@/lib/utils/property-mappers"

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const property = await getPropertyByIdAction(id)

  if (!property) {
    notFound()
  }

  const formData = propertyToFormData(property)

  return (
    <>
      <DashboardHeader>
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
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/dashboard/properties/${id}`}>
                {property.title}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Editar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h1 className="text-2xl font-bold tracking-tight">Editar propiedad</h1>
        <PropertyEditForm propertyId={id} initialData={formData} />
      </div>
    </>
  )
}
