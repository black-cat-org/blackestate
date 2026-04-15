import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Lead, PropertyQueueItem, QueueStatus, CatalogTracking, PropertyVisit } from "./lead.entity"

export interface CreateLeadDTO {
  propertyId: string
  propertyTitle?: string
  source?: string
  name: string
  phone?: string
  email?: string
  message?: string
  propertyTypeSought?: string
  budget?: string
  zoneOfInterest?: string
  wantsOffers: boolean
}

export interface ILeadRepository {
  findAll(ctx: SessionContext): Promise<Lead[]>
  findById(ctx: SessionContext, id: string): Promise<Lead | undefined>
  findByPropertyId(ctx: SessionContext, propertyId: string): Promise<Lead[]>
  create(ctx: SessionContext, data: CreateLeadDTO): Promise<Lead>
  update(ctx: SessionContext, id: string, data: Partial<Lead>): Promise<Lead>
  softDelete(ctx: SessionContext, id: string): Promise<void>

  // Queue operations
  getQueueStatus(ctx: SessionContext, leadId: string): Promise<QueueStatus>
  getPropertyQueue(ctx: SessionContext, leadId: string): Promise<PropertyQueueItem[]>
  addToQueue(ctx: SessionContext, leadId: string, propertyId: string, propertyTitle: string): Promise<PropertyQueueItem>
  removeFromQueue(ctx: SessionContext, leadId: string, queueItemId: string): Promise<void>
  sendQueueItemNow(ctx: SessionContext, leadId: string, queueItemId: string): Promise<PropertyQueueItem>

  // Catalog tracking
  getCatalogTracking(ctx: SessionContext, leadId: string): Promise<CatalogTracking>

  // Visits (public — no auth)
  trackVisit(propertyId: string, source: string | null): Promise<PropertyVisit>
  getVisitsByProperty(propertyId: string): Promise<PropertyVisit[]>
}
