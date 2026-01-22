import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/feed"

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if this is a password recovery by looking at the user's metadata or session
      // Password recovery links will have been initiated via resetPasswordForEmail
      // The most reliable way is to check if the user came from an email link
      const isRecovery = data.session?.user?.aud === "authenticated" && searchParams.get("type") === "recovery"

      if (isRecovery) {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }

      // Otherwise redirect to the next page (default: feed)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login with error if something went wrong
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}
