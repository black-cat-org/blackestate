export type PropertyType =
  | "house"
  | "apartment"
  | "land"
  | "commercial"
  | "office"
  | "warehouse"
  | "cabin"
  | "ph"

export type OperationType = "sale" | "rent" | "short_term" | "anticretico"

export type PropertyStatus =
  | "draft"
  | "in_review"
  | "active"
  | "paused"
  | "sold"
  | "rented"
  | "rejected"

export type Currency = "USD" | "BOB"

export type SurfaceUnit = "m2" | "ha"

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
  shortDescription?: string
  type: PropertyType
  operationType: OperationType
  status: PropertyStatus
  price: CurrencyAmount
  negotiable: boolean
  expenses?: CurrencyAmount
  address: PropertyAddress
  totalArea?: SurfaceArea
  coveredArea?: SurfaceArea
  rooms?: number
  bedrooms?: number
  bathrooms?: number
  garages?: number
  age?: number
  condition?: "new" | "excellent" | "good" | "fair" | "to_renovate"
  orientation?: "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest"
  amenities: string[]
  hideExactLocation: boolean
  media: PropertyMedia
  createdAt: string
  updatedAt: string
}

export interface PropertyFormData {
  title: string
  description: string
  shortDescription: string
  type: PropertyType | ""
  operationType: OperationType | ""
  price: number | ""
  currency: Currency
  negotiable: boolean
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
  hideExactLocation: boolean
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
