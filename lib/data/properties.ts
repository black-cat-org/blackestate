"use server"

import { eq, and, isNull } from "drizzle-orm"
import { properties } from "@/lib/db/schema"
import { db } from "@/lib/db"
import { withRLS, type SessionContext } from "@/lib/db/rls"
import { getSessionContext } from "@/lib/db/session-context"
import type { Property, PropertyFormData } from "@/lib/types/property"

// ---------------------------------------------------------------------------
// Row ↔ Property mapper
// ---------------------------------------------------------------------------

type PropertyRow = typeof properties.$inferSelect

function mapRowToProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    shortDescription: row.shortDescription ?? undefined,
    type: row.type,
    operationType: row.operationType,
    status: row.status,
    price: { amount: Number(row.priceAmount), currency: row.priceCurrency },
    negotiable: row.negotiable,
    expenses: row.expensesAmount
      ? { amount: Number(row.expensesAmount), currency: row.expensesCurrency! }
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
      ? { value: row.totalAreaValue, unit: row.totalAreaUnit! }
      : undefined,
    coveredArea: row.coveredAreaValue
      ? { value: row.coveredAreaValue, unit: row.coveredAreaUnit! }
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

function mapFormDataToInsert(data: PropertyFormData, ctx: SessionContext) {
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
    rooms: data.rooms ? Number(data.rooms) : null,
    bedrooms: data.bedrooms ? Number(data.bedrooms) : null,
    bathrooms: data.bathrooms ? Number(data.bathrooms) : null,
    garages: data.garages ? Number(data.garages) : null,
    age: data.age ? Number(data.age) : null,
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
// CRUD Operations (all use RLS via session context)
// ---------------------------------------------------------------------------

export async function getProperties(): Promise<Property[]> {
  const ctx = await getSessionContext()
  const rows = await withRLS(ctx, (tx) =>
    tx.select().from(properties)
  )
  return rows.map(mapRowToProperty)
}

export async function getPropertyById(id: string): Promise<Property | undefined> {
  const ctx = await getSessionContext()
  const rows = await withRLS(ctx, (tx) =>
    tx.select().from(properties).where(eq(properties.id, id)).limit(1)
  )
  return rows[0] ? mapRowToProperty(rows[0]) : undefined
}

export async function createProperty(data: PropertyFormData): Promise<Property> {
  const ctx = await getSessionContext()
  const insert = mapFormDataToInsert(data, ctx)
  const rows = await withRLS(ctx, (tx) =>
    tx.insert(properties).values(insert).returning()
  )
  return mapRowToProperty(rows[0])
}

export async function updateProperty(id: string, data: Partial<Property>): Promise<Property> {
  const ctx = await getSessionContext()

  const updateData: Record<string, unknown> = {}

  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription ?? null
  if (data.type !== undefined) updateData.type = data.type
  if (data.operationType !== undefined) updateData.operationType = data.operationType
  if (data.status !== undefined) updateData.status = data.status
  if (data.negotiable !== undefined) updateData.negotiable = data.negotiable
  if (data.amenities !== undefined) updateData.amenities = data.amenities
  if (data.hideExactLocation !== undefined) updateData.hideExactLocation = data.hideExactLocation

  if (data.price) {
    updateData.priceAmount = String(data.price.amount)
    updateData.priceCurrency = data.price.currency
  }
  if (data.expenses !== undefined) {
    updateData.expensesAmount = data.expenses ? String(data.expenses.amount) : null
    updateData.expensesCurrency = data.expenses ? data.expenses.currency : null
  }
  if (data.address) {
    if (data.address.street !== undefined) updateData.addressStreet = data.address.street
    if (data.address.number !== undefined) updateData.addressNumber = data.address.number ?? null
    if (data.address.floor !== undefined) updateData.addressFloor = data.address.floor ?? null
    if (data.address.apartment !== undefined) updateData.addressApartment = data.address.apartment ?? null
    if (data.address.city !== undefined) updateData.addressCity = data.address.city
    if (data.address.state !== undefined) updateData.addressState = data.address.state
    if (data.address.country !== undefined) updateData.addressCountry = data.address.country
    if (data.address.neighborhood !== undefined) updateData.addressNeighborhood = data.address.neighborhood ?? null
    if (data.address.lat !== undefined) updateData.addressLat = data.address.lat ?? null
    if (data.address.lng !== undefined) updateData.addressLng = data.address.lng ?? null
    if (data.address.googleMapsUrl !== undefined) updateData.addressGoogleMapsUrl = data.address.googleMapsUrl ?? null
  }
  if (data.totalArea !== undefined) {
    updateData.totalAreaValue = data.totalArea ? data.totalArea.value : null
    updateData.totalAreaUnit = data.totalArea ? data.totalArea.unit : null
  }
  if (data.coveredArea !== undefined) {
    updateData.coveredAreaValue = data.coveredArea ? data.coveredArea.value : null
    updateData.coveredAreaUnit = data.coveredArea ? data.coveredArea.unit : null
  }
  if (data.rooms !== undefined) updateData.rooms = data.rooms ?? null
  if (data.bedrooms !== undefined) updateData.bedrooms = data.bedrooms ?? null
  if (data.bathrooms !== undefined) updateData.bathrooms = data.bathrooms ?? null
  if (data.garages !== undefined) updateData.garages = data.garages ?? null
  if (data.age !== undefined) updateData.age = data.age ?? null
  if (data.condition !== undefined) updateData.condition = data.condition ?? null
  if (data.orientation !== undefined) updateData.orientation = data.orientation ?? null
  if (data.media) {
    if (data.media.photos !== undefined) updateData.photos = data.media.photos
    if (data.media.videoUrl !== undefined) updateData.videoUrl = data.media.videoUrl ?? null
    if (data.media.virtualTourUrl !== undefined) updateData.virtualTourUrl = data.media.virtualTourUrl ?? null
    if (data.media.blueprints !== undefined) updateData.blueprints = data.media.blueprints
  }

  const rows = await withRLS(ctx, (tx) =>
    tx.update(properties).set(updateData).where(eq(properties.id, id)).returning()
  )
  if (rows.length === 0) throw new Error("Property not found or no permission")
  return mapRowToProperty(rows[0])
}

export async function deleteProperty(id: string): Promise<void> {
  const ctx = await getSessionContext()
  const rows = await withRLS(ctx, (tx) =>
    tx.update(properties)
      .set({ deletedAt: new Date() })
      .where(eq(properties.id, id))
      .returning({ id: properties.id })
  )
  if (rows.length === 0) throw new Error("Property not found or no permission")
}

export async function duplicateProperty(id: string): Promise<Property> {
  const ctx = await getSessionContext()

  return withRLS(ctx, async (tx) => {
    const original = await tx.select().from(properties).where(and(eq(properties.id, id), isNull(properties.deletedAt))).limit(1)
    if (original.length === 0) throw new Error("Property not found")

    const { id: _id, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...rest } = original[0]
    const rows = await tx.insert(properties).values({
      ...rest,
      createdByUserId: ctx.userId,
      title: `${rest.title} (copy)`,
      status: "draft",
    }).returning()

    return mapRowToProperty(rows[0])
  })
}

// ---------------------------------------------------------------------------
// Public query (no auth required — for landing pages)
// ---------------------------------------------------------------------------

export async function getPublicPropertyById(id: string): Promise<Property | undefined> {
  const rows = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.id, id),
        eq(properties.status, "active"),
        isNull(properties.deletedAt),
      )
    )
    .limit(1)

  if (!rows[0]) return undefined

  const property = mapRowToProperty(rows[0])
  if (property.hideExactLocation) {
    property.address.lat = undefined
    property.address.lng = undefined
    property.address.googleMapsUrl = undefined
  }
  return property
}
