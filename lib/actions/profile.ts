"use server"

import { createClient } from "@/lib/supabase/server"

export async function updateDisplayName(displayName: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id)

  if (error) {
    console.error("Error updating display name:", error)
    return { error: error.message }
  }

  return { success: true }
}

export async function getProfile() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (error) {
    console.error("Error fetching profile:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
