"use server"

import { createClient } from "@/lib/supabase/server"

export async function updateDisplayName(userId: string, displayName: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId)

  if (error) {
    console.error("Error updating display name:", error)
    return { error: error.message }
  }

  return { success: true }
}
