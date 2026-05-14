import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type {
  FindInquiriesOptions,
  IInquiryRepository,
} from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * List Inquiries the caller can see, optionally narrowed by status /
 * source / propertyId / search filters. Ordered by `updated_at DESC`
 * in the adapter (general-purpose list — most-recent-activity first).
 *
 * For the dashboard default (open only, `created_at DESC`), use
 * `getOpenInquiriesUseCase`. The two methods intentionally differ on
 * the sort key — see `IInquiryRepository.findAllOpen` JSDoc.
 */
export async function getInquiriesUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  options?: FindInquiriesOptions,
): Promise<Inquiry[]> {
  return inquiryRepo.findAll(ctx, options)
}
