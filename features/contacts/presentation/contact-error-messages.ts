/**
 * Translate server-action throw tokens raised by the Contact actions
 * into user-facing Spanish copy. Shared across `contact-actions-menu`,
 * `contact-detail-header`, and `contact-trash-list` so the mapping has
 * one source of truth — duplicating it across components causes silent
 * drift the moment the action layer renames or adds a token (R46c
 * sweep being the imminent example).
 *
 * Why this lives in `presentation/` (not `lib/utils/`): the catalogue
 * is tightly coupled to the Contact feature's action contract. Pulling
 * it up to `lib/utils/` would imply general-purpose error translation,
 * which would invite unrelated features to dump their tokens here.
 *
 * Token shape mix (R23 doc, R46c pending):
 *   - `contact_has_active_deals:<count>` — lowercase, new convention
 *   - `CONTACT_NOT_FOUND` / `CONTACT_ALREADY_RESTORED` / `CONTACT_NO_PERMISSION`
 *     / `CONTACT_NOT_FOUND_OR_NO_PERMISSION` — SCREAMING, legacy
 */

export function describeContactDeleteError(code: string): string {
  if (code.startsWith("contact_has_active_deals:")) {
    const count = Number(code.split(":")[1])
    if (Number.isFinite(count) && count > 0) {
      return `Tiene ${count} negocio${count === 1 ? "" : "s"} activo${count === 1 ? "" : "s"}. Ciérralos o transfiérelos primero.`
    }
    return "Tiene negocios activos. Ciérralos o transfiérelos primero."
  }
  if (code === "CONTACT_NOT_FOUND_OR_NO_PERMISSION") {
    return "No tienes permiso para eliminar este contacto"
  }
  return "No se pudo eliminar el contacto"
}

export function describeContactRestoreError(code: string): string {
  switch (code) {
    case "CONTACT_NOT_FOUND":
      return "El contacto no existe"
    case "CONTACT_ALREADY_RESTORED":
      return "El contacto ya estaba restaurado"
    case "CONTACT_NO_PERMISSION":
    case "CONTACT_NOT_FOUND_OR_NO_PERMISSION":
      return "No tienes permiso para restaurar este contacto"
    default:
      return "No se pudo restaurar el contacto"
  }
}

export function describeContactSaveError(code: string, isEdit: boolean): string {
  if (code === "CONTACT_NOT_FOUND_OR_NO_PERMISSION") {
    return "No tienes permiso para editar este contacto"
  }
  return isEdit
    ? "No se pudo actualizar el contacto"
    : "No se pudo crear el contacto"
}
