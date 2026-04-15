// Re-export all property types for backward compatibility during migration.
// New code should import directly from the feature module:
//   @/features/properties/domain/property.entity
//   @/features/shared/domain/value-objects

export type {
  Property,
  PropertyFormData,
  PropertyType,
  OperationType,
  PropertyStatus,
  PropertyCondition,
  Orientation,
  PropertyFilters,
  PropertyViewMode,
} from "@/features/properties/domain/property.entity"

export type {
  Currency,
  SurfaceUnit,
  CurrencyAmount,
  SurfaceArea,
  PostalAddress as PropertyAddress,
  MediaCollection as PropertyMedia,
} from "@/features/shared/domain/value-objects"
