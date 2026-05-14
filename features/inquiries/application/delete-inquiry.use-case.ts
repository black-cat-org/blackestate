import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Soft-delete an Inquiry. The repository writes `deleted_at = now()`
 * and snapshots the deleter's identity into the audit columns.
 *
 * EC16 (sub-plan §7): a promoted Inquiry can be soft-deleted; the
 * resulting Deal stays alive because the FK `deal.inquiry_id` is
 * ON DELETE SET NULL — but soft-delete does not trigger the cascade,
 * so the link survives the trash trip. Restore brings the Inquiry
 * back with the original `promoted_deal_id` intact.
 */
export async function deleteInquiryUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  id: string,
): Promise<void> {
  return inquiryRepo.softDelete(ctx, id)
}
