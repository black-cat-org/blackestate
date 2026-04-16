import "server-only"
import { createServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { requireSupabaseEnv } from "./env"

type ServerClient = SupabaseClient
type AdminClient = SupabaseClient

const globalForSupabase = globalThis as typeof globalThis & {
  supabaseAdmin?: AdminClient
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
    const url = requireSupabaseEnv("SUPABASE_URL")
    const key = requireSupabaseEnv("SUPABASE_SERVICE_ROLE_KEY")
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

/**
 * Server-side Supabase client authenticated as the current user via cookies.
 *
 * Use this in Server Components, Server Actions, and Route Handlers to run
 * queries with the caller's JWT. RLS policies will enforce org isolation.
 *
 * Not a singleton: a new instance is created per request because the cookie
 * jar differs between callers. Caching it on `globalThis` would leak one
 * user's session to another.
 *
 * The `setAll` handler is wrapped in try/catch because Server Components
 * cannot mutate cookies (they are read-only there). Cookie refresh happens
 * in the proxy (`proxy.ts`), so the thrown error is benign and expected
 * whenever this client is used from a Server Component.
 */
export async function getSupabaseServerClient(): Promise<ServerClient> {
  const cookieStore = await cookies()

  return createServerClient(
    requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Components cannot set cookies. Safe to ignore because
            // the proxy (`proxy.ts`) refreshes the session on every request.
          }
        },
      },
    },
  )
}
