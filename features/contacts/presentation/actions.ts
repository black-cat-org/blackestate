"use server"

import { createContactUseCase } from "@/features/contacts/application/create-contact.use-case"
import { deleteContactUseCase } from "@/features/contacts/application/delete-contact.use-case"
import { getContactByIdUseCase } from "@/features/contacts/application/get-contact-by-id.use-case"
import { getContactByPhoneOrEmailUseCase } from "@/features/contacts/application/get-contact-by-phone-or-email.use-case"
import { getContactsUseCase } from "@/features/contacts/application/get-contacts.use-case"
import { restoreContactUseCase } from "@/features/contacts/application/restore-contact.use-case"
import { searchContactsUseCase } from "@/features/contacts/application/search-contacts.use-case"
import { updateContactUseCase } from "@/features/contacts/application/update-contact.use-case"
import type {
  Contact,
  CreateContactDTO,
  UpdateContactDTO,
} from "@/features/contacts/domain/contact.entity"
import type { ContactSearchOptions } from "@/features/contacts/domain/contact.repository"
import { DrizzleContactRepository } from "@/features/contacts/infrastructure/drizzle-contact.repository"
import { getDealsByContactUseCase } from "@/features/deals/application/get-deals-by-contact.use-case"
import { TERMINAL_DEAL_STAGES } from "@/features/deals/domain/deal.entity"
import { DrizzleDealRepository } from "@/features/deals/infrastructure/drizzle-deal.repository"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"

// Module-level singletons. The Drizzle adapters are stateless — every
// query opens its own `withRLS` transaction with the per-call SessionContext
// — so a single instance is reusable across the process's request lifetime.
// Repositories are constructed here at the presentation boundary, NOT in
// the use cases (Clean Architecture: Application never imports Infrastructure).
const contactRepo = new DrizzleContactRepository()
const dealRepo = new DrizzleDealRepository()

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getContactsAction(): Promise<Contact[]> {
  const ctx = await getSessionContext()
  return getContactsUseCase(ctx, contactRepo)
}

export async function getContactByIdAction(
  id: string,
): Promise<Contact | undefined> {
  const ctx = await getSessionContext()
  return getContactByIdUseCase(ctx, contactRepo, id)
}

export async function getContactByPhoneOrEmailAction(
  phone?: string,
  email?: string,
): Promise<Contact | undefined> {
  const ctx = await getSessionContext()
  return getContactByPhoneOrEmailUseCase(ctx, contactRepo, phone, email)
}

export async function searchContactsAction(
  query: string,
  options?: ContactSearchOptions,
): Promise<Contact[]> {
  const ctx = await getSessionContext()
  return searchContactsUseCase(ctx, contactRepo, query, options)
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createContactAction(
  data: CreateContactDTO,
): Promise<Contact> {
  const ctx = await getSessionContext()
  return createContactUseCase(ctx, contactRepo, data)
}

export async function updateContactAction(
  id: string,
  data: UpdateContactDTO,
): Promise<Contact> {
  const ctx = await getSessionContext()
  return updateContactUseCase(ctx, contactRepo, id, data)
}

/**
 * Soft-delete a Contact, enforcing edge case EC13 from the sub-plan:
 * the operation is blocked when the Contact has any active (non-deleted,
 * non-terminal) Deals.
 *
 * Throw token shape: `contact_has_active_deals:<count>` — the trailing
 * `:<count>` suffix lets the UI render "Tiene N negocios activos. Cierra
 * o transfiere primero" without a second roundtrip. The action layer
 * is the correct enforcement point because it is the first place in
 * the call stack where both `contactRepo` AND `dealRepo` are in scope
 * — the use case layer would have to receive a cross-feature dependency
 * to do the same check.
 *
 * Race window: an agent could create a new active Deal between this
 * action's read and the use case's write. The check is best-effort UX
 * armour, not an atomicity guarantee. A future SQL trigger could
 * enforce the same invariant at the DB if the race becomes a real
 * product problem.
 *
 * Throw tokens raised by this surface follow the project's
 * `lowercase_snake_case` convention (see `CLAUDE.md` "Throw token
 * convention"): `contact_has_active_deals:<count>` parametric guard
 * plus the four repository tokens propagated unchanged
 * (`contact_not_found`, `contact_already_restored`, `contact_no_permission`,
 * `contact_not_found_or_no_permission`).
 */
export async function deleteContactAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  const deals = await getDealsByContactUseCase(ctx, dealRepo, id)
  const activeCount = deals.filter(
    (d) => !TERMINAL_DEAL_STAGES.includes(d.stage),
  ).length
  if (activeCount > 0) {
    throw new Error(`contact_has_active_deals:${activeCount}`)
  }
  return deleteContactUseCase(ctx, contactRepo, id)
}

export async function restoreContactAction(id: string): Promise<Contact> {
  const ctx = await getSessionContext()
  return restoreContactUseCase(ctx, contactRepo, id)
}
