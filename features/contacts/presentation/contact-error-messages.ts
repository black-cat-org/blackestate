/**
 * Translate server-action throw tokens raised by the Contact actions
 * into user-facing Spanish copy. Shared across `contact-actions-menu`,
 * `contact-detail-header`, and `contact-trash-list` so the mapping has
 * one source of truth — duplicating it across components causes silent
 * drift the moment the action layer renames or adds a token.
 *
 * Why this lives in `presentation/` (not `lib/utils/`): the catalogue
 * is tightly coupled to the Contact feature's action contract. Pulling
 * it up to `lib/utils/` would imply general-purpose error translation,
 * which would invite unrelated features to dump their tokens here.
 *
 * Tokens (lowercase_snake_case per project convention — see `CLAUDE.md`
 * "Throw token convention"):
 *   - `contact_has_active_deals:<count>` — parametric, EC13 guard for
 *     soft-delete when there are open deals to transfer
 *   - `contact_not_found` / `contact_already_restored` /
 *     `contact_no_permission` — restore-specific disambiguation
 *   - `contact_not_found_or_no_permission` — generic miss for update /
 *     softDelete (never leaks whether the row exists vs the caller
 *     simply cannot see it)
 */

export function describeContactDeleteError(code: string): string {
  if (code.startsWith("contact_has_active_deals:")) {
    const count = Number(code.split(":")[1])
    if (Number.isFinite(count) && count > 0) {
      return `Tiene ${count} negocio${count === 1 ? "" : "s"} activo${count === 1 ? "" : "s"}. Ciérralos o transfiérelos primero.`
    }
    return "Tiene negocios activos. Ciérralos o transfiérelos primero."
  }
  if (code === "contact_not_found_or_no_permission") {
    return "No tienes permiso para eliminar este contacto"
  }
  return "No se pudo eliminar el contacto"
}

export function describeContactRestoreError(code: string): string {
  switch (code) {
    case "contact_not_found":
      return "El contacto no existe"
    case "contact_already_restored":
      return "El contacto ya estaba restaurado"
    case "contact_no_permission":
    case "contact_not_found_or_no_permission":
      return "No tienes permiso para restaurar este contacto"
    default:
      return "No se pudo restaurar el contacto"
  }
}

export function describeContactSaveError(code: string, isEdit: boolean): string {
  if (code === "contact_not_found_or_no_permission") {
    return "No tienes permiso para editar este contacto"
  }
  return isEdit
    ? "No se pudo actualizar el contacto"
    : "No se pudo crear el contacto"
}
