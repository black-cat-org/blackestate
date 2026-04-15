// Backward compatibility — re-exports from features/properties/presentation/actions
// Import directly from @/features/properties/presentation/actions for new code
export {
  getPropertiesAction as getProperties,
  getPropertyByIdAction as getPropertyById,
  createPropertyAction as createProperty,
  updatePropertyAction as updateProperty,
  deletePropertyAction as deleteProperty,
  duplicatePropertyAction as duplicateProperty,
} from "@/features/properties/presentation/actions"

export {
  getPublicPropertyAction as getPublicPropertyById,
} from "@/features/properties/presentation/public-actions"
