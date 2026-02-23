export type PropertyType =
  | "house"
  | "apartment"
  | "land"
  | "commercial"
  | "office"
  | "warehouse"
  | "cabin"
  | "ph"

export type OperationType = "venta" | "alquiler" | "temporal" | "anticretico"

export type PropertyStatus =
  | "borrador"
  | "en_revision"
  | "activa"
  | "pausada"
  | "vendida"
  | "alquilada"
  | "rechazada"

export type Currency = "USD" | "ARS" | "BOB" | "EUR"

export type SurfaceUnit = "m2" | "ft2" | "ha" | "acres"

export interface CurrencyAmount {
  amount: number
  currency: Currency
}

export interface SurfaceArea {
  value: number
  unit: SurfaceUnit
}

export interface PropertyAddress {
  street: string
  number?: string
  floor?: string
  apartment?: string
  city: string
  state: string
  country: string
  neighborhood?: string
  lat?: number
  lng?: number
  googleMapsUrl?: string
}

export interface PropertyMedia {
  photos: string[]
  videoUrl?: string
  virtualTourUrl?: string
  blueprints: string[]
}

export interface Property {
  id: string
  title: string
  description: string
  type: PropertyType
  operationType: OperationType
  status: PropertyStatus
  price: CurrencyAmount
  expenses?: CurrencyAmount
  address: PropertyAddress
  totalArea?: SurfaceArea
  coveredArea?: SurfaceArea
  rooms?: number
  bedrooms?: number
  bathrooms?: number
  garages?: number
  age?: number
  condition?: "nueva" | "excelente" | "buena" | "regular" | "a_reciclar"
  orientation?: "norte" | "sur" | "este" | "oeste" | "noreste" | "noroeste" | "sureste" | "suroeste"
  amenities: string[]
  media: PropertyMedia
  createdAt: string
  updatedAt: string
}

export interface PropertyFormData {
  title: string
  description: string
  type: PropertyType | ""
  operationType: OperationType | ""
  price: number | ""
  currency: Currency
  expenses: number | ""
  expensesCurrency: Currency
  country: string
  state: string
  city: string
  neighborhood: string
  street: string
  floor: string
  apartment: string
  googleMapsUrl: string
  lat: string
  lng: string
  totalArea: number | ""
  coveredArea: number | ""
  surfaceUnit: SurfaceUnit
  rooms: number | ""
  bedrooms: number | ""
  bathrooms: number | ""
  garages: number | ""
  age: number | ""
  condition: Property["condition"] | ""
  orientation: Property["orientation"] | ""
  amenities: string[]
  photos: string[]
  videoUrl: string
  virtualTourUrl: string
  blueprints: string[]
}

export interface PropertyFilters {
  search: string
  type: PropertyType | "all"
  operationType: OperationType | "all"
  status: PropertyStatus | "all"
}

export type PropertyViewMode = "cards" | "table"
