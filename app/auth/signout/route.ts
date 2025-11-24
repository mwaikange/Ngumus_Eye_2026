import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const supabase = await createClient()

  // Sign out from Supabase
  await supabase.auth.signOut()

  // Get the origin from the request
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin

  // Create redirect response to login page
  const response = NextResponse.redirect(`${origin}/auth/login`)

  // Clear auth cookies
  const cookieStore = await cookies()
  cookieStore.delete("sb-access-token")
  cookieStore.delete("sb-refresh-token")

  return response
}
