import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * All non-deleted Inquiries belonging to a Contact, including discarded
 * and promoted. Powers the "Inquiries" section of the contact detail
 * page. Ordered `updated_at DESC` in the adapter.
 */
export async function getInquiriesByContactUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  contactId: string,
): Promise<Inquiry[]> {
  return inquiryRepo.findByContactId(ctx, contactId)
}
