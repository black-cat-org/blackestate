export type LeadStatus = "new" | "contacted" | "interested" | "won" | "lost" | "discarded"

export type LeadSource = "facebook" | "instagram" | "whatsapp" | "tiktok" | "google" | "referral" | "direct"

/**
 * Lightweight projection of a Property used by lead presentation forms
 * (create dialog + edit page) where only id + display title are needed.
 * Lives in the lead domain because every lead must reference a property —
 * the type is part of how leads compose with properties at the UI layer.
 */
export interface PropertyOption {
  id: string
  title: string
}

export interface Lead {
  id: string
  propertyId: string
  propertyTitle?: string
  source?: LeadSource
  status: LeadStatus
  name: string
  phone?: string
  email?: string
  message?: string
  propertyTypeSought?: string
  budget?: string
  zoneOfInterest?: string
  wantsOffers: boolean
  createdAt: string
  deletedAt?: string
  deletedBy?: {
    userId?: string
    userName?: string
    userEmail?: string
  }
}

export interface LeadFilters {
  search: string
  status: LeadStatus | "all"
  source: string | "all"
}

export interface PropertyVisit {
  id: string
  propertyId: string
  source?: string
  timestamp: string
}

export interface CatalogTracking {
  sentWithOrigin: boolean
  openedAt?: string
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
