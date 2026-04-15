// Re-export all lead types for backward compatibility during migration.
// New code should import directly from the feature module:
//   @/features/leads/domain/lead.entity

export type {
  Lead,
  LeadStatus,
  LeadSource,
  LeadFilters,
  PropertyVisit,
  CatalogTracking,
  QueueStatusId,
  QueueStatus,
  QueueItemStatus,
  PropertyQueueItem,
} from "@/features/leads/domain/lead.entity"
