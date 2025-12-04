"use server"

import { createClient } from "@/lib/supabase/server"

export async function getActiveAds() {
  const supabase = await createClient()

  const { data: ads, error } = await supabase
    .from("ad_inventory")
    .select("id, title, description, media_url, media_type, target_url, display_priority")
    .eq("is_active", true)
    .lte("start_date", new Date().toISOString())
    .gte("end_date", new Date().toISOString())
    .order("display_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching ads:", error)
    return []
  }

  return ads || []
}

export async function trackAdView(adId: string, userId?: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("ad_views").insert({
    ad_id: adId,
    user_id: userId || null,
  })

  if (error) {
    console.error("Error tracking ad view:", error)
  }
}

export async function getAdViewStats(adId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("ad_view_stats").select("*").eq("ad_id", adId).single()

  if (error) {
    console.error("Error fetching ad stats:", error)
    return null
  }

  return data
}
