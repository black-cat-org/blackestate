import "server-only"

/**
 * Email module environment access.
 *
 * Mirrors the pattern of `requireSupabaseEnv` in `lib/supabase/env.ts`:
 * uses a switch over literal `process.env.NAME` accesses because
 * Turbopack/Webpack only inline env vars on literal property access —
 * a dynamic `process.env[name]` lookup returns `undefined` in the
 * bundled output. Adding a new var means adding a case branch.
 *
 * All five vars are read server-side only; none are prefixed with
 * `NEXT_PUBLIC_` because SMTP credentials must never reach the
 * browser bundle.
 */
type EmailEnvVar =
  | "EMAIL_FROM"
  | "SMTP_HOST"
  | "SMTP_PORT"
  | "SMTP_USER"
  | "SMTP_PASS"

export function requireEmailEnv(name: EmailEnvVar): string {
  const value = readEnvVar(name)
  if (!value) {
    throw new Error(
      `[email] ${name} env var is not set. Configure it in .env.local (see .env.template).`,
    )
  }
  return value
}

function readEnvVar(name: EmailEnvVar): string | undefined {
  switch (name) {
    case "EMAIL_FROM":
      return process.env.EMAIL_FROM
    case "SMTP_HOST":
      return process.env.SMTP_HOST
    case "SMTP_PORT":
      return process.env.SMTP_PORT
    case "SMTP_USER":
      return process.env.SMTP_USER
    case "SMTP_PASS":
      return process.env.SMTP_PASS
  }
}
