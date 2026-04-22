type ServerSecretEnv = "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"
type PublicEnv = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"

export type SupabaseEnvVar = ServerSecretEnv | PublicEnv

/**
 * Reads a required Supabase-related env var and fails loud if missing.
 *
 * IMPORTANT: every access is a literal `process.env.SOMETHING` lookup. Next.js
 * and Turbopack only inline `NEXT_PUBLIC_*` vars into the browser bundle when
 * the property is accessed *literally* (`process.env.NEXT_PUBLIC_FOO`). The
 * dynamic form `process.env[name]` is not replaced at build time and therefore
 * evaluates to `undefined` on the client — a well-documented gotcha that
 * silently breaks browser-side Supabase clients.
 *
 * Keep this switch exhaustive. Any new var must be added here so the bundler
 * sees a literal access.
 */
export function requireSupabaseEnv(name: SupabaseEnvVar): string {
  const value = readEnvLiteral(name)
  if (!value) {
    throw new Error(
      `[supabase] Missing environment variable ${name}. ` +
        `Set it in .env.local (local) or the deployment environment.`,
    )
  }
  return value
}

function readEnvLiteral(name: SupabaseEnvVar): string | undefined {
  switch (name) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL
    case "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    case "SUPABASE_URL":
      return process.env.SUPABASE_URL
    case "SUPABASE_SERVICE_ROLE_KEY":
      return process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}
