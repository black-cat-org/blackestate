/**
 * Translate server-action throw tokens raised by the Deal actions
 * into user-facing Spanish copy. Shared across the Deal dialogs and
 * components (R26 deal-create-dialog, R27 deal-detail-page, future
 * Kanban interactions) so the mapping has one source of truth — same
 * pattern as `contact-error-messages.ts` (R23) and
 * `inquiry-error-messages.ts` (I9).
 *
 * Token surface (lowercase_snake_case, R20 + R22 standard):
 *   - `deal_not_found`           — id missing or hidden by RLS
 *   - `deal_no_permission`       — defensive fallback in restore()
 *   - `deal_already_restored`    — restore() called on an active row
 *   - `deal_missing_contact`     — createDeal called without either
 *                                  contactId or contactDraft (use case)
 *   - `reorder_ids_mismatch`     — reorderInStage() payload mismatch
 *   - `terminal_stage_reorder`   — reorderInStage() called on won/lost
 *
 * Race-violation surface: createDealAction retries on 23505 once
 * (action layer) and the second pass short-circuits on the existing
 * active deal. The UI therefore should NEVER see a raw 23505 — but
 * if the second pass somehow propagates raw PG error, the default
 * fallback copy here covers the unmapped case.
 */

export function describeDealCreateError(code: string): string {
  switch (code) {
    case "deal_missing_contact":
      return "Selecciona un contacto o ingresa los datos del nuevo"
    default:
      return "No se pudo crear el negocio"
  }
}

export function describeDealUpdateError(code: string): string {
  switch (code) {
    case "deal_not_found":
      return "El negocio ya no existe"
    default:
      return "No se pudo actualizar el negocio"
  }
}

export function describeDealMoveStageError(code: string): string {
  switch (code) {
    case "deal_not_found":
      return "El negocio ya no existe"
    default:
      return "No se pudo mover el negocio"
  }
}

export function describeDealReorderError(code: string): string {
  switch (code) {
    case "reorder_ids_mismatch":
      return "El orden cambió mientras lo movías. Recarga la página e intenta de nuevo."
    case "terminal_stage_reorder":
      return "No se pueden reordenar negocios en columnas cerradas"
    default:
      return "No se pudo reordenar"
  }
}

export function describeDealDeleteError(code: string): string {
  switch (code) {
    case "deal_not_found":
      return "El negocio ya no existe"
    default:
      return "No se pudo eliminar el negocio"
  }
}

export function describeDealRestoreError(code: string): string {
  switch (code) {
    case "deal_not_found":
      return "El negocio ya no existe"
    case "deal_already_restored":
      return "El negocio ya estaba restaurado"
    case "deal_no_permission":
      return "No tienes permiso para restaurar este negocio"
    default:
      return "No se pudo restaurar el negocio"
  }
}
