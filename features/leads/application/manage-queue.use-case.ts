import type {
  QueueStatus,
  PropertyQueueItem,
  CatalogTracking,
} from "@/features/leads/domain/lead.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleLeadRepository } from "@/features/leads/infrastructure/drizzle-lead.repository"

export async function getQueueStatusUseCase(
  ctx: SessionContext,
  leadId: string,
): Promise<QueueStatus> {
  const repo = new DrizzleLeadRepository()
  return repo.getQueueStatus(ctx, leadId)
}

export async function getPropertyQueueUseCase(
  ctx: SessionContext,
  leadId: string,
): Promise<PropertyQueueItem[]> {
  const repo = new DrizzleLeadRepository()
  return repo.getPropertyQueue(ctx, leadId)
}

export async function addToQueueUseCase(
  ctx: SessionContext,
  leadId: string,
  propertyId: string,
  propertyTitle: string,
): Promise<PropertyQueueItem> {
  const repo = new DrizzleLeadRepository()
  return repo.addToQueue(ctx, leadId, propertyId, propertyTitle)
}

export async function removeFromQueueUseCase(
  ctx: SessionContext,
  leadId: string,
  queueItemId: string,
): Promise<void> {
  const repo = new DrizzleLeadRepository()
  return repo.removeFromQueue(ctx, leadId, queueItemId)
}

export async function sendQueueItemNowUseCase(
  ctx: SessionContext,
  leadId: string,
  queueItemId: string,
): Promise<PropertyQueueItem> {
  const repo = new DrizzleLeadRepository()
  return repo.sendQueueItemNow(ctx, leadId, queueItemId)
}

export async function getCatalogTrackingUseCase(
  ctx: SessionContext,
  leadId: string,
): Promise<CatalogTracking> {
  const repo = new DrizzleLeadRepository()
  return repo.getCatalogTracking(ctx, leadId)
}
