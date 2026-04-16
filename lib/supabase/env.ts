type ServerSecretEnv = "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"
type PublicEnv = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"

export type SupabaseEnvVar = ServerSecretEnv | PublicEnv

/**
 * Reads a required Supabase-related env var and fails loud if missing.
 *
 * Centralised so all three client factories (browser, server, admin) raise
 * the same error shape — making misconfigurations trivially greppable across
 * environments (`[supabase] Missing environment variable ...`).
 */
export function requireSupabaseEnv(name: SupabaseEnvVar): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[supabase] Missing environment variable ${name}. ` +
        `Set it in .env.local (local) or the deployment environment.`,
    )
  }
  return value
}
