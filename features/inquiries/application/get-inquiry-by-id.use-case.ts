import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Fetch a single non-deleted Inquiry. Returns `undefined` if absent
 * or hidden by RLS. The use case has no opinion on whether the
 * absence is a 404 — callers decide their own error surface.
 */
export async function getInquiryByIdUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  id: string,
): Promise<Inquiry | undefined> {
  return inquiryRepo.findById(ctx, id)
}
