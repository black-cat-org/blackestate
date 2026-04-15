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

export interface PostalAddress {
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

export interface MediaCollection {
  photos: string[]
  videoUrl?: string
  virtualTourUrl?: string
  blueprints: string[]
}
