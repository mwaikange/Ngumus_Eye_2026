"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error("[v0] Sign out error:", error)
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/auth/login")
}
