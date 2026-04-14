export type LeadStatus = "new" | "contacted" | "interested" | "won" | "lost" | "discarded"

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
  | "waiting"
  | "active"
  | "paused_conversation"
  | "paused_appointment"
  | "inactive_catalog"
  | "inactive_appointment_completed"
  | "inactive_won"
  | "inactive_lost"
  | "inactive_discarded"

export interface QueueStatus {
  status: QueueStatusId
}

export type QueueItemStatus = "pending" | "sent" | "paused"

export interface PropertyQueueItem {
  id: string
  propertyId: string
  propertyTitle: string
  status: QueueItemStatus
  estimatedSendAt?: string
  sentAt?: string
  addedAt: string
}
