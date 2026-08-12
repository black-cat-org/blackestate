"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import {
  publicInquiryFormSchema,
  type PublicInquiryFormValues,
} from "@/lib/validations/public-inquiry"

/**
 * Tokens raised by the `public.public_create_inquiry` SECURITY DEFINER
 * RPC (drizzle/sql/028). Surface mismatches between the SQL `RAISE
 * exception '...'` and this set break runtime UX without the
 * TypeScript compiler catching them — keep both in sync.
 */
type PublicInquiryErrorToken =
  | "name_required"
  | "contact_missing_phone_and_email"
  | "property_not_found_or_inactive"

const KNOWN_TOKENS: ReadonlySet<PublicInquiryErrorToken> = new Set([
  "name_required",
  "contact_missing_phone_and_email",
  "property_not_found_or_inactive",
])

function extractRpcErrorToken(message: string | undefined): string | undefined {
  if (!message) return undefined
  // Supabase returns the raw `RAISE exception` message as `error.message`.
  // PostgREST sometimes prefixes with `[code]: ` or trims to just the token
  // depending on the function's `RAISE ... USING errcode`. We accept either.
  for (const token of KNOWN_TOKENS) {
    if (message.includes(token)) return token
  }
  return undefined
}

/**
 * Create a public-form Inquiry from an unauthenticated visitor.
 *
 * Crosses the RLS boundary through the `public_create_inquiry`
 * SECURITY DEFINER RPC (drizzle/sql/028). The Supabase client used
 * here is the standard server client — when invoked from `/p/[id]`
 * without an authenticated session it carries the publishable/anon
 * key and reaches the database as the `anon` role, which is exactly
 * what the RPC's `GRANT EXECUTE TO anon` clause expects. A logged-in
 * agent submitting the form (e.g. from a device with stale cookies)
 * reaches the RPC as `authenticated` — also granted EXECUTE — and
 * the function still derives the org server-side from the property
 * lookup, so the auth identity never widens authorisation.
 *
 * Throws on error (project convention per `feedback_http_status_codes`
 * memory — no `{ ok: false }` shapes). The throw tokens are the
 * lowercase_snake_case strings the RPC raises, surfaced unwrapped so
 * the caller (page-level action) maps them to UI copy.
 *
 * Throw tokens propagated:
 *   - `invalid_input` — Zod validation failed at the server boundary
 *   - `name_required` — RPC validated empty name
 *   - `contact_missing_phone_and_email` — RPC validated absence of both
 *   - `property_not_found_or_inactive` — RPC could not resolve the property
 *   - `public_inquiry_failed` — any other PG / network error (raw error
 *     left on `.cause` for server logs to surface)
 */
export async function createPublicInquiryAction(
  propertyId: string,
  formData: PublicInquiryFormValues,
): Promise<{ inquiryId: string }> {
  const parsed = publicInquiryFormSchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error("invalid_input")
  }

  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.rpc("public_create_inquiry", {
    p_property_id: propertyId,
    p_name: parsed.data.name,
    p_phone: parsed.data.phone ?? null,
    p_email: parsed.data.email ?? null,
    p_message: parsed.data.message ?? null,
  })

  if (error) {
    const token = extractRpcErrorToken(error.message)
    if (token) throw new Error(token)
    throw new Error("public_inquiry_failed", { cause: error })
  }

  if (typeof data !== "string" || data.length === 0) {
    throw new Error("public_inquiry_failed")
  }

  return { inquiryId: data }
}
