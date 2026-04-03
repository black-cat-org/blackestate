export type LeadStatus = "nuevo" | "contactado" | "interesado" | "ganado" | "perdido" | "descartado"

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

export interface CatalogTracking {
  sentWithOrigin: boolean
  openedAt: string | null
}

export type QueueStatusId =
  | "en_espera"
  | "activa"
  | "pausada_conversacion"
  | "pausada_cita"
  | "inactiva_catalogo"
  | "inactiva_cita_completada"
  | "inactiva_ganado"
  | "inactiva_perdido"
  | "inactiva_descartado"

export interface QueueStatus {
  status: QueueStatusId
}

export type QueueItemStatus = "pendiente" | "enviada" | "pausada"

export interface PropertyQueueItem {
  id: string
  propertyId: string
  propertyTitle: string
  status: QueueItemStatus
  estimatedSendAt?: string
  sentAt?: string
  addedAt: string
}
