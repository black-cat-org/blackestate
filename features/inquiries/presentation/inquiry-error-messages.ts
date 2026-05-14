/**
 * Translate server-action throw tokens raised by the Inquiry actions
 * into user-facing Spanish copy. Shared across `inquiry-actions-menu`,
 * `inquiry-detail-header`, `inquiry-create-dialog`, `promote-inquiry-dialog`,
 * `discard-inquiry-dialog`, and `inquiry-trash-list` so the mapping
 * has one source of truth — the same lesson R23 / R24 learned for the
 * Contact feature (commit `5ab4c0f`).
 *
 * Token surface (lowercase_snake_case, new convention from I6):
 *   - `inquiry_not_found`             — id missing / hidden by RLS
 *   - `inquiry_not_open`              — already promoted or discarded
 *   - `inquiry_already_restored`     — restore() called on an active row
 *   - `inquiry_no_permission`         — defensive fallback from restore()
 *   - `inquiry_missing_contact`       — createInquiry called without either
 *                                       contactId or contactDraft
 *   - `deal_already_active`           — promote conflicts with the partial
 *                                       UNIQUE on (org, contact, property)
 *
 * Each helper is exported separately (instead of one switch) because
 * the same token (e.g. `inquiry_not_found`) carries different copy
 * depending on the calling verb — "no se pudo descartar" vs "no se pudo
 * eliminar" — and inlining the verb in the helper name keeps the
 * mapping obvious at the call site.
 */

export function describeInquiryCreateError(code: string): string {
  switch (code) {
    case "inquiry_missing_contact":
      return "Selecciona un contacto o ingresa los datos del nuevo"
    case "deal_already_active":
      // Should never reach here on the create path (promote is the path
      // that races against the deal partial UNIQUE), but the use case
      // calls into the contact resolution which could surface the token
      // if the repo composition changes in future. Defensive fallback.
      return "Ya existe un negocio activo para este contacto y propiedad"
    default:
      return "No se pudo crear la consulta"
  }
}

export function describeInquiryDiscardError(code: string): string {
  switch (code) {
    case "inquiry_not_found":
      return "La consulta ya no existe"
    case "inquiry_not_open":
      return "La consulta ya fue descartada o promovida"
    default:
      return "No se pudo descartar la consulta"
  }
}

export function describeInquiryPromoteError(code: string): string {
  switch (code) {
    case "inquiry_not_found":
      return "La consulta ya no existe"
    case "inquiry_not_open":
      return "La consulta ya fue descartada o promovida"
    case "deal_already_active":
      // TODO(R27 deal-detail): once the action layer surfaces the
      // conflicting deal id alongside this token, render a "Ver
      // negocio existente" link in the dialog so the agent can deep-
      // link to it instead of having to find it manually. The current
      // token-only error contract has no field for the deal id.
      return "Este contacto ya tiene un negocio activo en esta propiedad"
    default:
      return "No se pudo promover la consulta"
  }
}

export function describeInquiryDeleteError(code: string): string {
  switch (code) {
    case "inquiry_not_found":
      return "La consulta ya no existe"
    default:
      return "No se pudo eliminar la consulta"
  }
}

export function describeInquiryRestoreError(code: string): string {
  switch (code) {
    case "inquiry_not_found":
      return "La consulta ya no existe"
    case "inquiry_already_restored":
      return "La consulta ya estaba restaurada"
    case "inquiry_no_permission":
      return "No tienes permiso para restaurar esta consulta"
    default:
      return "No se pudo restaurar la consulta"
  }
}
