import type {
  Contact,
  CreateContactDTO,
} from "@/features/contacts/domain/contact.entity"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Creates a Contact in the caller's org. Pure delegation — the use case
 * carries no business logic of its own because the create flow is
 * already governed by:
 *   - Zod validation at the server-action boundary (input shape).
 *   - The mapper's phone/email canonicalisation (R17 lesson).
 *   - RLS at the DB (insert policy verifies `created_by_user_id = auth.uid()`
 *     and `organization_id = active_org_id`).
 *
 * Repository is injected (DI) per CLAUDE.md Clean Architecture rule —
 * Application NEVER imports Infrastructure. The server action (Fase 6)
 * instantiates `DrizzleContactRepository` and passes it here.
 */
export async function createContactUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  data: CreateContactDTO,
): Promise<Contact> {
  return contactRepo.create(ctx, data)
}
