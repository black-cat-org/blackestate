import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { requireSupabaseEnv } from "./env"

type BrowserClient = SupabaseClient

const globalForSupabase = globalThis as typeof globalThis & {
  supabaseBrowser?: BrowserClient
}

/**
 * Browser Supabase client using the publishable key.
 *
 * Safe to use in Client Components. Reads session from cookies set by the
 * proxy (`proxy.ts` at the project root), so this client stays in sync with
 * the server without manual token management.
 *
 * Singleton on `globalThis` to survive HMR reloads in dev and avoid creating
 * multiple `GoTrueClient` instances (Supabase emits a warning when duplicated).
 */
export function getSupabaseBrowserClient(): BrowserClient {
  if (!globalForSupabase.supabaseBrowser) {
    globalForSupabase.supabaseBrowser = createBrowserClient(
      requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    )
  }
  return globalForSupabase.supabaseBrowser
}
