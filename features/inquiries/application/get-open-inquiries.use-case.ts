import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Open Inquiries hot path. Powers the dashboard default view, the
 * pending-inquiries sidebar badge, and the contact-detail "Active
 * inquiries" section.
 *
 * Ordered by `created_at DESC` so freshest expressed interest surfaces
 * first — distinct from `getInquiriesUseCase` which orders by
 * `updated_at DESC` for general-purpose lists. The split is
 * intentional; see `IInquiryRepository.findAllOpen` JSDoc.
 */
export async function getOpenInquiriesUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
): Promise<Inquiry[]> {
  return inquiryRepo.findAllOpen(ctx)
}
