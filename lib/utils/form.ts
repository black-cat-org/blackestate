/**
 * Normalize an optional text-input value to `undefined` when it is empty
 * (or only whitespace). Use at form submit boundaries to avoid persisting
 * empty strings as real values.
 *
 * Name reflects the semantic exactly: the result is the input string
 * trimmed, OR `undefined` for empty/whitespace-only input. The mapper
 * layer (per CLAUDE.md "Null Safety: Model → Mapper → Entity") then
 * translates `undefined → null` at the DB boundary when writing.
 */
export function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}
