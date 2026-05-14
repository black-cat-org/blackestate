import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Soft-deleted Inquiries (trash view). Powers the trash UI on the
 * inquiries dashboard from which an agent can restore inquiries that
 * were deleted in error.
 *
 * Ordered by `deleted_at DESC` (per `IInquiryRepository.findAllDeleted`
 * contract) so the most recently trashed inquiries surface first.
 * Cannot be expressed as a filter on `getInquiriesUseCase` because the
 * default list filters out soft-deleted rows entirely.
 */
export async function getDeletedInquiriesUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
): Promise<Inquiry[]> {
  return inquiryRepo.findAllDeleted(ctx)
}
