import { createClient } from "@supabase/supabase-js"

const globalForSupabase = globalThis as typeof globalThis & {
  supabaseAdmin?: ReturnType<typeof createClient>
}

export function getSupabaseAdmin() {
  if (!globalForSupabase.supabaseAdmin) {
    globalForSupabase.supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return globalForSupabase.supabaseAdmin
}
