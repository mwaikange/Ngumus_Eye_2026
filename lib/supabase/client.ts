import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_CONFIG } from "./config"

let client: SupabaseClient | undefined

export function createClient() {
  if (client) {
    return client
  }

  client = createBrowserClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)

  return client
}
