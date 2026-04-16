import "server-only"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { requireSupabaseEnv } from "./env"

/**
 * Supabase session refresh intended to be called from the Next.js proxy.
 *
 * When wired into `proxy.ts` (see sub-plan 09 task #63), it reads the
 * existing session cookie, refreshes the JWT if expired, and writes the
 * new cookies back to both the request (so the downstream server picks
 * it up) and the response (so the browser picks it up).
 *
 * The call to `supabase.auth.getClaims()` is what triggers the refresh. It
 * MUST run immediately after `createServerClient` — any intervening logic
 * risks using a stale session and causes hard-to-debug logouts.
 *
 * IMPORTANT: Returns the exact `response` object created inside. Callers
 * must not create a new `NextResponse` — if they need to modify headers,
 * they should mutate the returned object and copy cookies over with
 * `newResponse.cookies.setAll(response.cookies.getAll())`.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  await supabase.auth.getClaims()

  return response
}
