import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Archived Inquiries view (status IN ('discarded','promoted'), not
 * soft-deleted). Powers the "Histórico de consultas" tab on the
 * inquiries dashboard — distinct from the open list (still actionable)
 * and from the trash (soft-deleted).
 *
 * Ordered by `updated_at DESC` (per `IInquiryRepository.findAllArchived`
 * contract) so the most recently transitioned inquiries surface first,
 * which matches the archive's "what closed recently?" UX. Filtering
 * `getInquiriesUseCase` by `status='discarded'` would order by
 * `updated_at DESC` too BUT only cover one of the two terminal states
 * — this use case unions both `discarded` and `promoted` into a
 * single archived view without a UI workaround.
 */
export async function getArchivedInquiriesUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
): Promise<Inquiry[]> {
  return inquiryRepo.findAllArchived(ctx)
}
