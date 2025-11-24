import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

export function createClient() {
  if (client) {
    return client
  }

  client = createBrowserClient(
    "https://tdkeamquekkpalauorpk.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka2VhbXF1ZWtrcGFsYXVvcnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzQzMjQsImV4cCI6MjA3Nzg1MDMyNH0.iiGErIAG9jKRLE210fe1VNWPBq0ETBPowc7_tmuVLg8",
  )

  return client
}
