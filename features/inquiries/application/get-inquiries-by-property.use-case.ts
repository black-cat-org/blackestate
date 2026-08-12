import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * All non-deleted Inquiries on a Property, including discarded and
 * promoted — the property detail page renders this to show "who
 * expressed interest in this property?" plus aggregate analytics
 * ("12 inquiries this quarter, 3 converted"). Ordered `updated_at
 * DESC` in the adapter.
 */
export async function getInquiriesByPropertyUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  propertyId: string,
): Promise<Inquiry[]> {
  return inquiryRepo.findByPropertyId(ctx, propertyId)
}
