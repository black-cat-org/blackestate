import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Move an open Inquiry to `status = 'discarded'`. Optional `reason`
 * captures the funnel-analysis annotation.
 *
 * Throw tokens surfaced by the repository:
 *   - `inquiry_not_found` — id missing or hidden by RLS
 *   - `inquiry_not_open`  — already discarded / promoted
 *
 * Action layer (I8) maps these to localised Spanish messages.
 */
export async function discardInquiryUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  id: string,
  reason?: string,
): Promise<Inquiry> {
  return inquiryRepo.discard(ctx, id, reason)
}
