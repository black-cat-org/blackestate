import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

type AdminClient = SupabaseClient

const globalForSupabase = globalThis as typeof globalThis & {
  supabaseAdmin?: AdminClient
}

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[supabase] Missing environment variable ${name}. ` +
        `Set it in .env.local (local) or the deployment environment.`,
    )
  }
  return value
}

/**
 * Guard against a common misconfiguration: pasting the publishable/anon key
 * where the secret/service_role key is expected. The admin client would
 * appear to work for reads but fail on any RLS-protected operation with a
 * generic "row-level security" error that is slow to diagnose.
 *
 * Supported secret key formats:
 *   - Legacy JWT starting with `eyJ` (payload.role === "service_role")
 *   - New format starting with `sb_secret_`
 *
 * Rejects:
 *   - `sb_publishable_...` (publishable key)
 *   - JWTs whose decoded role is not `service_role`
 */
function assertSecretKey(key: string): void {
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is set to a publishable key " +
        "(`sb_publishable_...`). Replace it with the secret/service_role key " +
        "from the Supabase dashboard (Settings → API → service_role / secret).",
    )
  }
  if (key.startsWith("sb_secret_")) return
  if (key.startsWith("eyJ")) {
    const parts = key.split(".")
    if (parts.length !== 3) {
      throw new Error(
        "[supabase] SUPABASE_SERVICE_ROLE_KEY looks malformed (not a valid JWT).",
      )
    }
    try {
      // `base64url` as a Buffer encoding is available on Node 14.18+ / 15.13+;
      // Next.js 16 requires Node 18.18+, so this is safe for every target.
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      ) as { role?: string }
      if (payload.role !== "service_role") {
        throw new Error(
          `[supabase] SUPABASE_SERVICE_ROLE_KEY has role="${payload.role}", ` +
            "expected role=\"service_role\". Check Supabase dashboard → Settings → API.",
        )
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("[supabase]")) throw error
      throw new Error("[supabase] Failed to decode SUPABASE_SERVICE_ROLE_KEY JWT payload.")
    }
    return
  }
  throw new Error(
    "[supabase] SUPABASE_SERVICE_ROLE_KEY is in an unrecognized format. " +
      "Expected `sb_secret_...` or a legacy service_role JWT (`eyJ...`).",
  )
}

/**
 * Server-side Supabase admin client using the service_role / secret key.
 *
 * Bypasses RLS but does NOT bypass bucket-level constraints
 * (`file_size_limit`, `allowed_mime_types`).
 *
 * Module-scoped singleton on `globalThis` to survive HMR reloads in dev.
 * Note: `assertSecretKey` runs inside the singleton init block, so changes
 * to `SUPABASE_SERVICE_ROLE_KEY` only take effect after the Node process
 * restarts — HMR does not re-evaluate module initializers.
 */
export function getSupabaseAdmin(): AdminClient {
  if (!globalForSupabase.supabaseAdmin) {
    const url = requireEnv("SUPABASE_URL")
    const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    assertSecretKey(key)
    globalForSupabase.supabaseAdmin = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return globalForSupabase.supabaseAdmin
}
