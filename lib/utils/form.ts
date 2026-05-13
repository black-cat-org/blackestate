/**
 * Normalize an optional text-input value to `undefined` when it is empty
 * (or only whitespace). Use at form submit boundaries to avoid persisting
 * empty strings as real values.
 */
export function nullable(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}
