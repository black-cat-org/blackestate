export interface Lead {
  id: string
  propertyId: string
  source: string | null
  name: string
  phone: string
  email: string
  message?: string
  propertyTypeSought?: string
  budget?: string
  zoneOfInterest?: string
  wantsOffers: boolean
  createdAt: string
}

export interface PropertyVisit {
  id: string
  propertyId: string
  source: string | null
  timestamp: string
}
