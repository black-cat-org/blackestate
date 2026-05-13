import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Property, PropertyFormData } from "./property.entity"

export interface IPropertyRepository {
  findAll(ctx: SessionContext): Promise<Property[]>
  findAllActive(ctx: SessionContext): Promise<Property[]>
  findAllDeleted(ctx: SessionContext): Promise<Property[]>
  findById(ctx: SessionContext, id: string): Promise<Property | undefined>
  create(ctx: SessionContext, data: PropertyFormData): Promise<Property>
  update(ctx: SessionContext, id: string, data: Partial<Property>): Promise<Property>
  softDelete(ctx: SessionContext, id: string): Promise<void>
  restore(ctx: SessionContext, id: string): Promise<Property>
  duplicate(ctx: SessionContext, id: string): Promise<Property>
  findPublicById(id: string): Promise<Property | undefined>
}
