// Backward compatibility — re-exports from features/leads/presentation/actions
// Import directly from @/features/leads/presentation/actions for new code
export {
  getLeadsAction as getLeads,
  getLeadByIdAction as getLeadById,
  getLeadsByPropertyAction as getLeadsByProperty,
  createLeadAction as createLead,
  updateLeadAction as updateLead,
  deleteLeadAction as deleteLead,
  getQueueStatusAction as getQueueStatus,
  getPropertyQueueAction as getPropertyQueue,
  addToQueueAction as addToQueue,
  removeFromQueueAction as removeFromQueue,
  sendQueueItemNowAction as sendQueueItemNow,
  getCatalogTrackingAction as getCatalogTracking,
} from "@/features/leads/presentation/actions"

export {
  trackVisitAction as trackVisit,
  getVisitsByPropertyAction as getVisitsByProperty,
} from "@/features/leads/presentation/public-actions"

// Pure domain logic — re-export from use case
export { getSuggestedPropertiesUseCase as getSuggestedProperties } from "@/features/leads/application/get-suggested-properties.use-case"

// ---------------------------------------------------------------------------
// Functions not yet migrated to the feature module
// ---------------------------------------------------------------------------

import type { PropertyQueueItem } from "@/features/leads/domain/lead.entity"

/**
 * Reorder queue items for a lead.
 * TODO: migrate to feature module (use case + repository)
 */
export async function reorderQueue(leadId: string, _itemIds: string[]): Promise<PropertyQueueItem[]> {
  // Stub — real implementation will be added when the repository supports reorderQueue
  void leadId
  void _itemIds
  return Promise.resolve([])
}
