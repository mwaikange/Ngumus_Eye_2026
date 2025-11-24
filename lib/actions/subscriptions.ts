"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getSubscriptionPackages() {
  const supabase = await createClient()

  const { data: packages, error } = await supabase.from("plans").select("*").order("price_cents", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching packages:", error)
    return { error: error.message }
  }

  return { packages }
}

export async function getUserSubscription() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("*, plans(*)")
    .eq("user_id", user.id)
    .gte("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .maybeSingle()

  return { subscription }
}

export async function createSubscription(planId: number, paymentReference: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get plan details
  const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single()

  if (!plan) {
    return { error: "Plan not found" }
  }

  const startDate = new Date()
  const expiryDate = new Date(startDate)
  expiryDate.setDate(expiryDate.getDate() + plan.period_days)

  const { error } = await supabase.from("user_subscriptions").insert({
    user_id: user.id,
    plan_id: planId,
    started_at: startDate.toISOString(),
    expires_at: expiryDate.toISOString(),
    status: "active",
    payment_reference: paymentReference,
  })

  if (error) {
    console.error("[v0] Error creating subscription:", error)
    return { error: error.message }
  }

  revalidatePath("/profile")
  revalidatePath("/subscribe")
  revalidatePath("/case-deck")

  return { success: true, message: "Subscription activated successfully!" }
}

export async function cancelSubscription() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update({ status: "cancelled", auto_renew: false })
    .eq("user_id", user.id)
    .eq("status", "active")

  if (error) {
    console.error("[v0] Error cancelling subscription:", error)
    return { error: error.message }
  }

  revalidatePath("/profile")

  return { success: true, message: "Subscription cancelled successfully" }
}
