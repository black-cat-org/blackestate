import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPropertyById } from "@/lib/data/properties"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { formatPrice } from "@/lib/utils/format"
import { sanitizeSource } from "@/lib/constants/sources"
import { LandingHeader } from "@/components/landing/landing-header"
import { LandingGallery } from "@/components/landing/landing-gallery"
import { LandingPriceCard } from "@/components/landing/landing-price-card"
import { LandingCharacteristics } from "@/components/landing/landing-characteristics"
import { LandingAmenities } from "@/components/landing/landing-amenities"
import { LandingDescription } from "@/components/landing/landing-description"
import { LandingMap } from "@/components/landing/landing-map"
import { LandingContactForm } from "@/components/landing/landing-contact-form"
import { LandingSourceTracker } from "@/components/landing/landing-source-tracker"
import { LandingFooter } from "@/components/landing/landing-footer"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ src?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const property = await getPropertyById(id)

  if (!property || property.status !== "activa") {
    return { title: "Propiedad no encontrada | Black Estate" }
  }

  const description =
    property.shortDescription || property.description.substring(0, 160)
  const typeLabel = PROPERTY_TYPE_LABELS[property.type]
  const opLabel = OPERATION_TYPE_LABELS[property.operationType]

  return {
    title: `${property.title} | ${opLabel} | Black Estate`,
    description,
    openGraph: {
      title: `${typeLabel} en ${opLabel} — ${formatPrice(property.price)}`,
      description,
      images: property.media.photos[0] ? [property.media.photos[0]] : [],
      type: "website",
    },
  }
}

export default async function PropertyLandingPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { src } = await searchParams
  const property = await getPropertyById(id)

  if (!property || property.status !== "activa") {
    notFound()
  }

  const source = sanitizeSource(src)

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal nav */}
      <nav className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <span className="text-lg font-bold">Black Estate</span>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <LandingHeader property={property} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main content */}
          <div className="space-y-8">
            <LandingGallery photos={property.media.photos} title={property.title} />

            {/* Price card - mobile only */}
            <div className="lg:hidden">
              <LandingPriceCard property={property} source={source} />
            </div>

            <LandingDescription property={property} />
            <LandingCharacteristics property={property} />

            {property.amenities.length > 0 && (
              <LandingAmenities amenities={property.amenities} />
            )}

            <LandingMap address={property.address} hideExactLocation={property.hideExactLocation} />

            {/* Contact form - mobile only */}
            <div className="lg:hidden">
              <LandingContactForm propertyId={property.id} source={source} />
            </div>
          </div>

          {/* Sidebar - desktop only */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-6">
              <LandingPriceCard property={property} source={source} />
              <LandingContactForm propertyId={property.id} source={source} />
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
      <LandingSourceTracker propertyId={property.id} source={source} />
    </div>
  )
}
