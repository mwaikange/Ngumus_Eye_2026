"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"

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
    return { error: "You cannot follow yourself" }
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

  // Fetch follower display name for the notification message
  const { data: followerProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle()

  await supabase.from("user_notifications").insert({
    user_id: userId,
    type: "new_follower",
    title: "New follower",
    message: `${followerProfile?.display_name || "Someone"} started following you`,
    entity_id: user.id,
  })

  revalidatePath("/feed")
  revalidatePath("/profile")
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
  revalidatePath("/profile")
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

  try {
    // Use Vercel Blob for uploads
    const blob = await put(`avatars/${user.id}-${Date.now()}.jpg`, file, {
      access: "public",
    })

    // Update profile with the Blob URL
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: blob.url }).eq("id", user.id)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath("/profile")
    revalidatePath("/feed")
    return { success: true, url: blob.url }
  } catch (error) {
    console.error("[v0] Avatar upload error:", error)
    return { error: "Upload failed. Please try again." }
  }
}

export async function getFollowersList(userId: string) {
  const supabase = await createClient()

  const { data: follows, error: followsError } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("following_id", userId)

  if (followsError) {
    console.error("[v0] Error fetching followers:", followsError)
    return { error: followsError.message }
  }

  if (!follows || follows.length === 0) {
    return { data: [] }
  }

  const followerIds = follows.map((f) => f.follower_id)

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, trust_score")
    .in("id", followerIds)

  if (profilesError) {
    console.error("[v0] Error fetching follower profiles:", profilesError)
    return { error: profilesError.message }
  }

  return { data: profiles || [] }
}

export async function getFollowingList(userId: string) {
  const supabase = await createClient()

  const { data: follows, error: followsError } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId)

  if (followsError) {
    console.error("[v0] Error fetching following:", followsError)
    return { error: followsError.message }
  }

  if (!follows || follows.length === 0) {
    return { data: [] }
  }

  const followingIds = follows.map((f) => f.following_id)

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, trust_score")
    .in("id", followingIds)

  if (profilesError) {
    console.error("[v0] Error fetching following profiles:", profilesError)
    return { error: profilesError.message }
  }

  return { data: profiles || [] }
}
