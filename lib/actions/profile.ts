"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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

  revalidatePath("/profile")
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

export async function followUser(userId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  if (user.id === userId) {
    return { error: "Cannot follow yourself" }
  }

  const { error } = await supabase.from("user_follows").insert({
    follower_id: user.id,
    following_id: userId,
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "Already following this user" }
    }
    return { error: error.message }
  }

  revalidatePath("/feed")
  return { success: true, message: "You're now following this user" }
}

export async function unfollowUser(userId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/feed")
  return { success: true, message: "Unfollowed user" }
}

export async function getFollowCounts(userId: string) {
  const supabase = await createClient()

  const [followersResult, followingResult] = await Promise.all([
    supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", userId),
    supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", userId),
  ])

  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
  }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const file = formData.get("avatar") as File
  if (!file) {
    return { error: "No file provided" }
  }

  const fileExt = file.name.split(".").pop()
  const fileName = `${user.id}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath("/profile")
  revalidatePath("/feed")
  return { success: true, url: urlData.publicUrl }
}

export async function getFollowersList(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_follows")
    .select("follower_id, profiles!user_follows_follower_id_fkey(id, display_name, avatar_url, trust_score)")
    .eq("following_id", userId)

  if (error) {
    return { error: error.message }
  }

  return { data: data?.map((d) => d.profiles) || [] }
}

export async function getFollowingList(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_follows")
    .select("following_id, profiles!user_follows_following_id_fkey(id, display_name, avatar_url, trust_score)")
    .eq("follower_id", userId)

  if (error) {
    return { error: error.message }
  }

  return { data: data?.map((d) => d.profiles) || [] }
}
