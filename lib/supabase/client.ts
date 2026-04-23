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
// DEBUG-ONLY (QA 2026-04-22): logs every /auth/v1/* request + response body
// to the browser console so we can diagnose 400/422/429 errors exactly as
// GoTrue returns them. Revert this block after the QA run — do not ship.
//
// SECURITY: gated to NODE_ENV === 'development' so it can never execute in
// prod even if the revert is forgotten. Without this gate the interceptor
// would log plaintext passwords from sign-in and sign-up requests.
function installAuthFetchInterceptor() {
  if (typeof window === "undefined") return
  if (process.env.NODE_ENV !== "development") return
  const flag = "__sbAuthDebugInstalled" as const
  const w = window as typeof window & { [flag]?: boolean }
  if (w[flag]) return
  w[flag] = true
  const origFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const isAuth = url.includes("/auth/v1/")
    if (isAuth) {
      const method = init?.method ?? (input instanceof Request ? input.method : "GET")
      let reqBody: unknown
      try {
        reqBody = init?.body ? JSON.parse(init.body.toString()) : undefined
      } catch {
        reqBody = init?.body
      }
      console.log("[sb-auth] →", method, url, reqBody)
    }
    const res = await origFetch(input, init)
    if (isAuth) {
      try {
        const clone = res.clone()
        const text = await clone.text()
        let parsed: unknown = text
        try {
          parsed = JSON.parse(text)
        } catch {}
        console.log("[sb-auth] ←", res.status, url, parsed)
      } catch (e) {
        console.warn("[sb-auth] clone-read failed", e)
      }
    }
    return res
  }
}

export function getSupabaseBrowserClient(): BrowserClient {
  if (!globalForSupabase.supabaseBrowser) {
    installAuthFetchInterceptor()
    globalForSupabase.supabaseBrowser = createBrowserClient(
      requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    )
  }
  return globalForSupabase.supabaseBrowser
}
