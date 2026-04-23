/**
 * Maps Supabase Auth (GoTrue) error codes to user-facing Spanish messages.
 *
 * Supabase returns errors shaped like `{ code, message, status }` where
 * `message` is the English default. Surfacing that raw string to a Spanish
 * UI is jarring and sometimes alarming (e.g. "email rate limit exceeded"
 * for a user waiting for a confirmation email). We map the stable `code`
 * — not the message — so SDK version bumps that reword the English copy
 * don't silently break this mapping.
 *
 * Copy style: Spanish neutro with "tú" (haz, revisa, pide — NOT "hacé",
 * "revisá", "pedí"). Aligned with the LATAM-wide product audience;
 * voseo is avoided regardless of the user's country.
 *
 * If a new error code appears in production that is not mapped here, the
 * helper falls back to the SDK's `message` (so the user at least sees
 * something) and logs a console warning so we can add the code to this
 * map in a follow-up.
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos",
  email_not_confirmed: "Confirma tu email antes de iniciar sesión",
  email_address_invalid: "El email ingresado no es válido",
  user_already_exists: "Ya existe una cuenta con este email",
  weak_password: "Contraseña débil. Usa mayúsculas, minúsculas y números",
  same_password: "La nueva contraseña debe ser diferente a la actual",
  session_not_found: "Tu sesión expiró. Pide un nuevo enlace de recuperación",
  // Two rate-limit codes map to the same copy because the user action is
  // the same regardless of which limiter triggered (SMTP budget vs request
  // throttler). Keep them in sync if you edit one.
  over_email_send_rate_limit: "Demasiados intentos. Espera unos minutos antes de intentar de nuevo",
  over_request_rate_limit: "Demasiados intentos. Espera unos minutos antes de intentar de nuevo",
  signup_disabled: "El registro está temporalmente deshabilitado",
  // Alias of `user_already_exists`. Supabase emits either one depending on
  // the SDK version / endpoint. Keep both strings identical to avoid leaks.
  email_exists: "Ya existe una cuenta con este email",
  // Anti-enumeration: intentionally identical to `invalid_credentials` so
  // an attacker cannot distinguish "unknown email" from "wrong password".
  user_not_found: "Email o contraseña incorrectos",
  // JWT/session-termination codes share copy because the UX action is the
  // same: re-authenticate.
  bad_jwt: "Tu sesión expiró. Inicia sesión de nuevo",
  no_authorization: "Tu sesión expiró. Inicia sesión de nuevo",
}

const GENERIC_FALLBACK = "Ocurrió un error. Intenta de nuevo."

/**
 * Returns the Spanish message for a given GoTrue error code. Falls back to
 * the caller-supplied `fallback` (usually `error.message`) and then to a
 * generic retry string if nothing maps.
 *
 * Returning the raw `message` as a second-tier fallback is intentional:
 * it keeps the UI useful for truly-new error codes that slipped past us,
 * while preserving the primary guarantee that known codes always show
 * localized copy.
 */
export function getAuthErrorMessage(
  code: string | undefined,
  fallback?: string | null,
): string {
  if (code && code in AUTH_ERROR_MESSAGES) return AUTH_ERROR_MESSAGES[code]
  if (code && process.env.NODE_ENV === "development") {
    console.warn(`[auth] Unmapped error code: "${code}". Add it to AUTH_ERROR_MESSAGES.`)
  }
  if (fallback && fallback.trim().length > 0) return fallback
  return GENERIC_FALLBACK
}
