/**
 * Detects the Postgres `unique_violation` (`23505`) error code across
 * the realistic wrapper shapes the project's runtime
 * (`drizzle-orm/node-postgres` over the `pg` Pool) is known to produce:
 *   - Raw `pg` `DatabaseError` — `.code` at top level
 *   - Drizzle wrapper — `.cause.code`
 *   - Drizzle wrapping a pool/queue layer that re-wraps the pg error —
 *     `.cause.cause.code`
 *
 * Three depth levels cover every observed nesting. If the underlying
 * driver ever changes and an unmapped chain depth appears, the raw
 * error propagates to the caller (a server 500) — louder failure mode
 * than silently mis-mapping to a domain token.
 *
 * Lives in `lib/utils/` because both Infrastructure (`drizzle-*`
 * repositories that wrap raw PG errors into domain tokens) and
 * Presentation (`*-action.ts` files that retry on unique-violation
 * race windows) need it. `lib/utils/` is the canonical cross-cutting
 * layer callable from any feature layer per CLAUDE.md import rules.
 */
export function isUniqueViolation(error: unknown): boolean {
  const codeAt = (level: unknown): string | undefined => {
    if (!level || typeof level !== "object") return undefined
    const code = (level as { code?: unknown }).code
    return typeof code === "string" ? code : undefined
  }
  if (codeAt(error) === "23505") return true
  const cause = (error as { cause?: unknown } | null | undefined)?.cause
  if (codeAt(cause) === "23505") return true
  const cause2 = (cause as { cause?: unknown } | null | undefined)?.cause
  if (codeAt(cause2) === "23505") return true
  return false
}
