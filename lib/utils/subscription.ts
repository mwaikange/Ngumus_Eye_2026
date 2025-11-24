import { createClient } from "@/lib/supabase/server"

export async function checkSubscription() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { hasAccess: false, subscription: null }
  }

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .maybeSingle()

  return {
    hasAccess: !!subscription,
    subscription,
  }
}

export async function requireSubscription(redirectPath = "/subscribe") {
  const { hasAccess } = await checkSubscription()

  if (!hasAccess) {
    return {
      redirect: {
        destination: redirectPath,
        permanent: false,
      },
    }
  }

  return { redirect: null }
}
