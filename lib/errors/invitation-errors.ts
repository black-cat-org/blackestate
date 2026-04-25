/**
 * Domain-level error codes + ES messages for invitation flows.
 *
 * Why a code-based mapper instead of `throw new Error("string")`:
 * - The code is a stable contract the server boundary translates once. UI
 *   copy can change without touching every call site.
 * - Server actions wrap the business throws and re-throw plain Error with
 *   already-localised `message`, so the client never sees raw Drizzle/pg
 *   strings (which leak SQL + params + PII).
 * - Mirrors the existing `lib/auth/error-messages.ts` pattern so both
 *   surfaces look the same to readers.
 *
 * Copy style: Spanish neutro with "tú" (haz, copia, ve — no voseo).
 */
export type InvitationErrorCode =
  // Authorisation / role rules
  | "caller_role_insufficient"
  | "admin_cannot_invite_admin"
  // Validation rules
  | "self_invite"
  | "email_not_registered"
  | "pending_already_exists"
  | "seat_limit_reached"
  | "caller_session_no_email"
  // Mutation outcomes
  | "not_found_or_rejected"
  | "not_found_or_cancelled"
  // accept_invitation RPC raises
  | "accept_not_found"
  | "accept_not_pending"
  | "accept_expired"
  | "accept_email_mismatch"
  | "accept_unauthenticated"
  // Catch-all (logged + generic UI copy)
  | "unknown"

const INVITATION_ERROR_MESSAGES: Record<InvitationErrorCode, string> = {
  caller_role_insufficient:
    "Solo propietarios o administradores pueden enviar o cancelar invitaciones.",
  admin_cannot_invite_admin: "Solo el propietario puede invitar administradores.",
  self_invite: "No puedes invitarte a ti mismo.",
  email_not_registered: "Este email no tiene cuenta en Black Estate.",
  pending_already_exists: "Ya existe una invitación pendiente para este email.",
  seat_limit_reached: "Sin asientos disponibles. Mejora tu plan para invitar más miembros.",
  caller_session_no_email: "Tu cuenta no tiene email asociado. Inicia sesión con una cuenta de email.",
  not_found_or_rejected: "No se pudo rechazar la invitación. Puede que ya no exista.",
  not_found_or_cancelled: "No se pudo cancelar la invitación. Puede que ya no exista.",
  accept_not_found: "La invitación no existe o ya fue procesada.",
  accept_not_pending: "Esta invitación ya fue aceptada o cancelada.",
  accept_expired: "Esta invitación expiró. Pide una nueva.",
  accept_email_mismatch:
    "Esta invitación es para otro email. Inicia sesión con la cuenta correcta.",
  accept_unauthenticated: "Tu sesión expiró. Inicia sesión de nuevo.",
  unknown: "Ocurrió un error. Intenta de nuevo.",
}

/**
 * Throwable carrying a stable code + ES message. Use cases and the
 * repository raise this; server actions catch it and translate before
 * crossing the React serialization boundary.
 *
 * Note: Next.js Server Actions only forward `message` and `digest` across
 * the wire to the client. The `code` field is server-side only — that's
 * intentional, the client never branches on codes for invitation copy.
 */
export class InvitationDomainError extends Error {
  readonly code: InvitationErrorCode

  constructor(code: InvitationErrorCode, messageOverride?: string) {
    super(messageOverride ?? INVITATION_ERROR_MESSAGES[code])
    this.code = code
    this.name = "InvitationDomainError"
  }
}

/**
 * Sanitises any thrown value into a user-facing ES message. Callers
 * (server actions) use this on the catch boundary so raw Drizzle / pg /
 * framework errors never reach the React tree, where they would leak
 * SQL + params (G24).
 *
 * Logs the underlying error to the server console so unmapped failures
 * stay debuggable in dev and in production logs.
 */
export function sanitizeInvitationError(error: unknown): string {
  if (error instanceof InvitationDomainError) {
    return error.message
  }
  console.error("[invitation] Unmapped error sanitised to generic copy:", error)
  return INVITATION_ERROR_MESSAGES.unknown
}

/**
 * Extract the message from a thrown value for client-side display.
 *
 * The server boundary (`withInvitationActionBoundary`) guarantees the
 * `Error.message` that crosses to the client is already an ES neutral
 * string from this module's mapper. The client therefore SHOULD render
 * `error.message` — but the ESLint rule that protects UI files (G24
 * defence-in-depth) forbids `err.message` access in JSX, `toast.error`,
 * and `setError` arguments to keep future code from re-leaking SQL.
 *
 * This helper centralises the access in `lib/errors/`, which the lint
 * rule whitelists. UI code calls it instead of touching `.message`
 * directly, so swapping a leaky throw for a sanitised one only requires
 * touching the server, not every component.
 */
export function getDisplayMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return fallback
}
