import type {
  Contact,
  CreateContactDTO,
} from "@/features/contacts/domain/contact.entity"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Finds an existing Contact by phone or email, OR creates a new one if
 * no match is found. Best-effort dedup at capture time — used by:
 *   - `createInquiryUseCase` (I7) when the DTO carries a `contactDraft`
 *     instead of a resolved `contactId`.
 *   - `createDealUseCase` (R22) for the same dual-mode resolution.
 *   - `createPublicInquiryAction` (I8 public form) for cold landing visitors.
 *
 * Race tolerance: two concurrent callers with the same phone/email may
 * both miss the `findByPhoneOrEmail` lookup and both create — the DB
 * has no UNIQUE constraint on `(org, phone)` / `(org, email)` because
 * phone/email are nullable and a shared family phone can legitimately
 * belong to multiple Contacts. The duplicate-after-race is acceptable
 * because the agent's UI lets them merge or correct downstream. This
 * is the explicit trade-off documented in `IContactRepository`
 * `findByPhoneOrEmail` JSDoc.
 *
 * If both `phone` and `email` are absent in `data`, the lookup is
 * skipped and a new Contact is created directly — there is nothing to
 * dedup against.
 */
export async function findOrCreateContactUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  data: CreateContactDTO,
): Promise<Contact> {
  if (data.phone || data.email) {
    const existing = await contactRepo.findByPhoneOrEmail(
      ctx,
      data.phone,
      data.email,
    )
    if (existing) return existing
  }
  return contactRepo.create(ctx, data)
}
