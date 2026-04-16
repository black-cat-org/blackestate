import type { Property, PropertyFormData } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { PropertyRow, PropertyInsert } from "./property.model"

// ---------------------------------------------------------------------------
// Model (DB row, uses null) → Entity (domain, uses undefined)
// ---------------------------------------------------------------------------

export function mapRowToEntity(row: PropertyRow): Property {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    title: row.title,
    description: row.description,
    shortDescription: row.shortDescription ?? undefined,
    type: row.type,
    operationType: row.operationType,
    status: row.status,
    price: { amount: Number(row.priceAmount), currency: row.priceCurrency },
    negotiable: row.negotiable,
    expenses: row.expensesAmount
      ? { amount: Number(row.expensesAmount), currency: row.expensesCurrency ?? "USD" }
      : undefined,
    address: {
      street: row.addressStreet,
      number: row.addressNumber ?? undefined,
      floor: row.addressFloor ?? undefined,
      apartment: row.addressApartment ?? undefined,
      city: row.addressCity,
      state: row.addressState,
      country: row.addressCountry,
      neighborhood: row.addressNeighborhood ?? undefined,
      lat: row.addressLat ?? undefined,
      lng: row.addressLng ?? undefined,
      googleMapsUrl: row.addressGoogleMapsUrl ?? undefined,
    },
    totalArea: row.totalAreaValue
      ? { value: row.totalAreaValue, unit: row.totalAreaUnit ?? "m2" }
      : undefined,
    coveredArea: row.coveredAreaValue
      ? { value: row.coveredAreaValue, unit: row.coveredAreaUnit ?? "m2" }
      : undefined,
    rooms: row.rooms ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    garages: row.garages ?? undefined,
    age: row.age ?? undefined,
    condition: row.condition ?? undefined,
    orientation: row.orientation ?? undefined,
    amenities: row.amenities,
    hideExactLocation: row.hideExactLocation,
    media: {
      photos: row.photos,
      videoUrl: row.videoUrl ?? undefined,
      virtualTourUrl: row.virtualTourUrl ?? undefined,
      blueprints: row.blueprints,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// FormData (DTO) → Insert model (uses null)
// ---------------------------------------------------------------------------

export function mapFormDataToInsert(
  data: PropertyFormData,
  ctx: SessionContext,
): PropertyInsert {
  return {
    organizationId: ctx.orgId,
    createdByUserId: ctx.userId,
    title: data.title,
    description: data.description,
    shortDescription: data.shortDescription || null,
    type: data.type as Property["type"],
    operationType: data.operationType as Property["operationType"],
    priceAmount: String(data.price),
    priceCurrency: data.currency,
    negotiable: data.negotiable,
    expensesAmount: data.expenses ? String(data.expenses) : null,
    expensesCurrency: data.expenses ? data.expensesCurrency : null,
    addressStreet: data.street,
    addressNumber: data.number || null,
    addressFloor: data.floor || null,
    addressApartment: data.apartment || null,
    addressCity: data.city,
    addressState: data.state,
    addressCountry: data.country,
    addressNeighborhood: data.neighborhood || null,
    addressLat: data.lat ? Number(data.lat) : null,
    addressLng: data.lng ? Number(data.lng) : null,
    addressGoogleMapsUrl: data.googleMapsUrl || null,
    totalAreaValue: data.totalArea ? Number(data.totalArea) : null,
    totalAreaUnit: data.totalArea ? data.surfaceUnit : null,
    coveredAreaValue: data.coveredArea ? Number(data.coveredArea) : null,
    coveredAreaUnit: data.coveredArea ? data.surfaceUnit : null,
    rooms: data.rooms !== "" && data.rooms !== undefined ? Number(data.rooms) : null,
    bedrooms: data.bedrooms !== "" && data.bedrooms !== undefined ? Number(data.bedrooms) : null,
    bathrooms: data.bathrooms !== "" && data.bathrooms !== undefined ? Number(data.bathrooms) : null,
    garages: data.garages !== "" && data.garages !== undefined ? Number(data.garages) : null,
    age: data.age !== "" && data.age !== undefined ? Number(data.age) : null,
    condition: (data.condition as Property["condition"]) || null,
    orientation: (data.orientation as Property["orientation"]) || null,
    amenities: data.amenities,
    hideExactLocation: data.hideExactLocation,
    photos: data.photos,
    videoUrl: data.videoUrl || null,
    virtualTourUrl: data.virtualTourUrl || null,
    blueprints: data.blueprints,
  }
}

// ---------------------------------------------------------------------------
// Partial entity → update record (domain → DB column mapping)
// ---------------------------------------------------------------------------

export function mapPartialEntityToUpdate(
  data: Partial<Property>,
): Record<string, unknown> {
  const update: Record<string, unknown> = {}

  if (data.title !== undefined) update.title = data.title
  if (data.description !== undefined) update.description = data.description
  if (data.shortDescription !== undefined)
    update.shortDescription = data.shortDescription ?? null
  if (data.type !== undefined) update.type = data.type
  if (data.operationType !== undefined)
    update.operationType = data.operationType
  if (data.status !== undefined) update.status = data.status
  if (data.negotiable !== undefined) update.negotiable = data.negotiable
  if (data.amenities !== undefined) update.amenities = data.amenities
  if (data.hideExactLocation !== undefined)
    update.hideExactLocation = data.hideExactLocation

  if (data.price) {
    update.priceAmount = String(data.price.amount)
    update.priceCurrency = data.price.currency
  }
  if (data.expenses !== undefined) {
    update.expensesAmount = data.expenses
      ? String(data.expenses.amount)
      : null
    update.expensesCurrency = data.expenses ? data.expenses.currency : null
  }

  if (data.address) {
    if (data.address.street !== undefined)
      update.addressStreet = data.address.street
    if (data.address.number !== undefined)
      update.addressNumber = data.address.number ?? null
    if (data.address.floor !== undefined)
      update.addressFloor = data.address.floor ?? null
    if (data.address.apartment !== undefined)
      update.addressApartment = data.address.apartment ?? null
    if (data.address.city !== undefined)
      update.addressCity = data.address.city
    if (data.address.state !== undefined)
      update.addressState = data.address.state
    if (data.address.country !== undefined)
      update.addressCountry = data.address.country
    if (data.address.neighborhood !== undefined)
      update.addressNeighborhood = data.address.neighborhood ?? null
    if (data.address.lat !== undefined)
      update.addressLat = data.address.lat ?? null
    if (data.address.lng !== undefined)
      update.addressLng = data.address.lng ?? null
    if (data.address.googleMapsUrl !== undefined)
      update.addressGoogleMapsUrl = data.address.googleMapsUrl ?? null
  }

  if (data.totalArea !== undefined) {
    update.totalAreaValue = data.totalArea ? data.totalArea.value : null
    update.totalAreaUnit = data.totalArea ? data.totalArea.unit : null
  }
  if (data.coveredArea !== undefined) {
    update.coveredAreaValue = data.coveredArea
      ? data.coveredArea.value
      : null
    update.coveredAreaUnit = data.coveredArea ? data.coveredArea.unit : null
  }

  if (data.rooms !== undefined) update.rooms = data.rooms ?? null
  if (data.bedrooms !== undefined) update.bedrooms = data.bedrooms ?? null
  if (data.bathrooms !== undefined) update.bathrooms = data.bathrooms ?? null
  if (data.garages !== undefined) update.garages = data.garages ?? null
  if (data.age !== undefined) update.age = data.age ?? null
  if (data.condition !== undefined) update.condition = data.condition ?? null
  if (data.orientation !== undefined)
    update.orientation = data.orientation ?? null

  if (data.media) {
    if (data.media.photos !== undefined) update.photos = data.media.photos
    if (data.media.videoUrl !== undefined)
      update.videoUrl = data.media.videoUrl ?? null
    if (data.media.virtualTourUrl !== undefined)
      update.virtualTourUrl = data.media.virtualTourUrl ?? null
    if (data.media.blueprints !== undefined)
      update.blueprints = data.media.blueprints
  }

  return update
}
