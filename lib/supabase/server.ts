import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    "https://tdkeamquekkpalauorpk.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka2VhbXF1ZWtrcGFsYXVvcnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzQzMjQsImV4cCI6MjA3Nzg1MDMyNH0.iiGErIAG9jKRLE210fe1VNWPBq0ETBPowc7_tmuVLg8",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
