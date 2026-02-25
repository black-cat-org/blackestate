export type LeadStatus = "nuevo" | "contactado" | "interesado" | "cerrado" | "descartado"

export interface Lead {
  id: string
  propertyId: string
  propertyTitle?: string
  source: string | null
  status: LeadStatus
  name: string
  phone: string
  email: string
  message?: string
  propertyTypeSought?: string
  budget?: string
  zoneOfInterest?: string
  wantsOffers: boolean
  suggestedPropertyIds?: string[]
  createdAt: string
}

export interface LeadFilters {
  search: string
  status: LeadStatus | "all"
  source: string | "all"
}

export interface PropertyVisit {
  id: string
  propertyId: string
  source: string | null
  timestamp: string
}
