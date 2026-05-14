import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Restore a soft-deleted Inquiry. Throw tokens from the repository:
 * `inquiry_not_found`, `inquiry_already_restored`, `inquiry_no_permission`.
 * Action layer (I8) maps to localised Spanish messages.
 */
export async function restoreInquiryUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  id: string,
): Promise<Inquiry> {
  return inquiryRepo.restore(ctx, id)
}
