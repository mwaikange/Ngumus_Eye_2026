import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Supabase Configuration Required</h1>
          <p className="text-muted-foreground">
            Please add the following environment variables in the <strong>Vars</strong> section:
          </p>
          <ul className="text-left space-y-2 bg-muted p-4 rounded-lg">
            <li>
              <code className="text-sm">NEXT_PUBLIC_SUPABASE_URL</code>
            </li>
            <li>
              <code className="text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Get these values from your Supabase project settings.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/feed")
  } else {
    redirect("/auth/login")
  }
}
