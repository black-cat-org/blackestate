"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getLeadsUseCase } from "@/features/leads/application/get-leads.use-case"
import { getLeadByIdUseCase } from "@/features/leads/application/get-lead-by-id.use-case"
import { getLeadsByPropertyUseCase } from "@/features/leads/application/get-leads-by-property.use-case"
import { createLeadUseCase } from "@/features/leads/application/create-lead.use-case"
import { updateLeadUseCase } from "@/features/leads/application/update-lead.use-case"
import { deleteLeadUseCase } from "@/features/leads/application/delete-lead.use-case"
import {
  getQueueStatusUseCase,
  getPropertyQueueUseCase,
  addToQueueUseCase,
  removeFromQueueUseCase,
  sendQueueItemNowUseCase,
  getCatalogTrackingUseCase,
} from "@/features/leads/application/manage-queue.use-case"
import type {
  Lead,
  QueueStatus,
  PropertyQueueItem,
  CatalogTracking,
} from "@/features/leads/domain/lead.entity"
import type { CreateLeadDTO } from "@/features/leads/domain/lead.repository"

// ---------------------------------------------------------------------------
// Authenticated actions (require session context)
// ---------------------------------------------------------------------------

export async function getLeadsAction(): Promise<Lead[]> {
  const ctx = await getSessionContext()
  return getLeadsUseCase(ctx)
}

export async function getLeadByIdAction(
  id: string,
): Promise<Lead | undefined> {
  const ctx = await getSessionContext()
  return getLeadByIdUseCase(ctx, id)
}

export async function getLeadsByPropertyAction(
  propertyId: string,
): Promise<Lead[]> {
  const ctx = await getSessionContext()
  return getLeadsByPropertyUseCase(ctx, propertyId)
}

export async function createLeadAction(
  data: CreateLeadDTO,
): Promise<Lead> {
  const ctx = await getSessionContext()
  return createLeadUseCase(ctx, data)
}

export async function updateLeadAction(
  id: string,
  data: Partial<Lead>,
): Promise<Lead> {
  const ctx = await getSessionContext()
  return updateLeadUseCase(ctx, id, data)
}

export async function deleteLeadAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return deleteLeadUseCase(ctx, id)
}

export async function getQueueStatusAction(
  leadId: string,
): Promise<QueueStatus> {
  const ctx = await getSessionContext()
  return getQueueStatusUseCase(ctx, leadId)
}

export async function getPropertyQueueAction(
  leadId: string,
): Promise<PropertyQueueItem[]> {
  const ctx = await getSessionContext()
  return getPropertyQueueUseCase(ctx, leadId)
}

export async function addToQueueAction(
  leadId: string,
  propertyId: string,
  propertyTitle: string,
): Promise<PropertyQueueItem> {
  const ctx = await getSessionContext()
  return addToQueueUseCase(ctx, leadId, propertyId, propertyTitle)
}

export async function removeFromQueueAction(
  leadId: string,
  queueItemId: string,
): Promise<void> {
  const ctx = await getSessionContext()
  return removeFromQueueUseCase(ctx, leadId, queueItemId)
}

export async function sendQueueItemNowAction(
  leadId: string,
  queueItemId: string,
): Promise<PropertyQueueItem> {
  const ctx = await getSessionContext()
  return sendQueueItemNowUseCase(ctx, leadId, queueItemId)
}

export async function getCatalogTrackingAction(
  leadId: string,
): Promise<CatalogTracking> {
  const ctx = await getSessionContext()
  return getCatalogTrackingUseCase(ctx, leadId)
}
