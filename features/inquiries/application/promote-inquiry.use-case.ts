import type { Deal } from "@/features/deals/domain/deal.entity"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"
import type {
  IInquiryRepository,
  PromoteInquiryDealInput,
} from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Promote an Inquiry into a Deal. Pure delegation — the atomicity of
 * the two-row transaction (`INSERT deal` + `UPDATE inquiry`) lives
 * entirely inside `IInquiryRepository.promote()` because cross-table
 * writes in a single tx are the repository's responsibility. The use
 * case does NOT receive `dealRepo` for the same reason: orchestrating
 * the partner-table mutation from the application layer would force
 * the second write outside the lock window.
 *
 * Throw tokens surfaced by the repository:
 *   - `inquiry_not_found`     — id missing or hidden by RLS
 *   - `inquiry_not_open`      — already promoted / discarded
 *   - `deal_already_active`   — contact already has an active deal on
 *                               the property; deep-link instead
 *
 * Returns `{ deal, inquiry }` in their post-transaction state so the
 * caller can render "Created Deal X from Inquiry Y" without a second
 * roundtrip.
 *
 * Sub-plan §4.4 commits to this delegate signature.
 */
export async function promoteInquiryUseCase(
  ctx: SessionContext,
  inquiryRepo: IInquiryRepository,
  inquiryId: string,
  dealInput: PromoteInquiryDealInput,
): Promise<{ deal: Deal; inquiry: Inquiry }> {
  return inquiryRepo.promote(ctx, inquiryId, dealInput)
}
