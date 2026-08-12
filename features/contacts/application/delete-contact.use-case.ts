import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Soft-delete a Contact. The repository writes `deleted_at = now()` and
 * snapshots the deleter's identity into the audit columns.
 *
 * **EC13 enforcement deferred** (sub-plan §7 edge case 13): "borrar
 * contact con Deals activos → hard error: 'Tiene N negocios activos.
 * Cierra o transfiere primero'". Enforcing this here would require a
 * cross-feature dependency (this use case would have to know about
 * IDealRepository), which is acceptable at the application layer but
 * adds composition complexity for the action. The current scope (R21)
 * keeps the use case thin; EC13 will land in Fase 6 server-action
 * orchestration (R23) where both repos are already in scope — see
 * tracker note in §7. Until then, CASCADE FK on `deal.contact_id`
 * would propagate the soft-delete on a hard-delete, but soft-deletes
 * do NOT cascade (CASCADE only fires on true DELETE). So today's
 * behaviour: the contact is soft-deleted, the deals remain visible
 * but their `contactName` JOIN renders empty — the UI degrades
 * gracefully even without the EC13 guard.
 */
export async function deleteContactUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  id: string,
): Promise<void> {
  return contactRepo.softDelete(ctx, id)
}
