import type {
  CurrencyAmount,
  SurfaceArea,
  PostalAddress,
  MediaCollection,
} from "@/features/shared/domain/value-objects"

export type PropertyType =
  | "house"
  | "apartment"
  | "land"
  | "commercial"
  | "office"
  | "warehouse"
  | "cabin"
  | "ph"

export type OperationType = "sale" | "rent" | "short_term" | "antichretic"

export type PropertyStatus =
  | "draft"
  | "in_review"
  | "active"
  | "paused"
  | "sold"
  | "rented"
  | "rejected"

export type PropertyCondition = "new" | "excellent" | "good" | "fair" | "to_renovate"

export type Orientation =
  | "north" | "south" | "east" | "west"
  | "northeast" | "northwest" | "southeast" | "southwest"

export interface Property {
  id: string
  createdByUserId: string
  title: string
  description: string
  shortDescription?: string
  type: PropertyType
  operationType: OperationType
  status: PropertyStatus
  price: CurrencyAmount
  negotiable: boolean
  expenses?: CurrencyAmount
  address: PostalAddress
  totalArea?: SurfaceArea
  coveredArea?: SurfaceArea
  rooms?: number
  bedrooms?: number
  bathrooms?: number
  garages?: number
  age?: number
  condition?: PropertyCondition
  orientation?: Orientation
  amenities: string[]
  hideExactLocation: boolean
  media: MediaCollection
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
  currency: CurrencyAmount["currency"]
  negotiable: boolean
  expenses: number | ""
  expensesCurrency: CurrencyAmount["currency"]
  country: string
  state: string
  city: string
  neighborhood: string
  street: string
  number: string
  floor: string
  apartment: string
  googleMapsUrl: string
  lat: string
  lng: string
  totalArea: number | ""
  coveredArea: number | ""
  surfaceUnit: SurfaceArea["unit"]
  rooms: number | ""
  bedrooms: number | ""
  bathrooms: number | ""
  garages: number | ""
  age: number | ""
  condition: PropertyCondition | ""
  orientation: Orientation | ""
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
