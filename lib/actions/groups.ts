"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function requestMembership(groupId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: group } = await supabase.from("groups").select("created_by, name").eq("id", groupId).single()

  if (!group) {
    return { error: "Group not found" }
  }

  const { error } = await supabase.from("group_requests").insert({
    group_id: groupId,
    user_id: user.id,
    status: "pending",
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "You already have a pending request for this group" }
    }
    return { error: error.message }
  }

  // This would require a notifications system
  console.log("[v0] Membership request created for group creator:", group.created_by)

  revalidatePath("/groups")
  return { success: true, message: "Membership request sent to group creator" }
}

export async function joinGroup(groupId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase.rpc("request_join_group", {
    p_group_id: groupId,
  })

  if (error) {
    console.error("[v0] Error joining group:", error)
    return { error: error.message }
  }

  // Check if the response indicates an error
  if (data && typeof data === "object" && "error" in data) {
    return { error: data.error as string }
  }

  revalidatePath("/groups")
  revalidatePath(`/groups/${groupId}`)

  return data as { success: boolean; message: string; is_member?: boolean; request_pending?: boolean }
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/groups")
  revalidatePath(`/groups/${groupId}`)

  return { success: true }
}

export async function createGroup(data: {
  name: string
  geohash_prefix: string
  visibility: "public" | "private"
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Check if group name already exists
  const { data: existingGroup } = await supabase
    .from("groups")
    .select("id")
    .eq("name", data.name)
    .limit(1)
    .maybeSingle()

  if (existingGroup) {
    return { error: "A group with this name already exists" }
  }

  // Create group with creator using database function
  const { data: groupId, error } = await supabase
    .rpc("create_group_with_creator", {
      p_name: data.name,
      p_geohash_prefix: data.geohash_prefix,
      p_visibility: data.visibility,
    })
    .single()

  if (error) {
    console.error("[v0] Error creating group:", error)
    return { error: error.message }
  }

  revalidatePath("/groups")
  revalidatePath("/admin/groups")

  return { success: true, data: { id: groupId }, message: "Group created successfully!" }
}

export async function getTrustScore(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("profiles").select("trust_score").eq("id", userId).single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data.trust_score }
}

export async function getPendingRequests(groupId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify user is the creator
  const { data: group } = await supabase.from("groups").select("created_by").eq("id", groupId).single()

  if (!group || group.created_by !== user.id) {
    return { error: "Only group creators can view pending requests" }
  }

  // Fetch pending requests with profile data
  const { data: requests, error } = await supabase
    .from("group_requests")
    .select("id, user_id, created_at")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) {
    return { error: error.message }
  }

  // Fetch profiles separately to avoid RLS issues
  const userIds = requests?.map((r) => r.user_id) || []
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)

  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]))

  const requestsWithData = requests?.map((req) => ({
    ...req,
    display_name: profileMap.get(req.user_id) || "Unknown",
  }))

  return { success: true, data: requestsWithData }
}

export async function approveRequest(requestId: string, groupId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase.rpc("approve_group_request", {
    p_request_id: requestId,
  })

  if (error) {
    console.error("[v0] Error approving request:", error)
    return { error: error.message }
  }

  if (data && typeof data === "object" && "error" in data) {
    console.error("[v0] RPC error:", data.code, data.error)
    return { error: data.error as string }
  }

  revalidatePath(`/groups/${groupId}`)
  return {
    success: true,
    message: data?.message || "Request approved",
    user_name: data?.user_name,
    group_name: data?.group_name,
  }
}

export async function rejectRequest(requestId: string, groupId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("group_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/groups/${groupId}`)
  return { success: true, message: "Request rejected" }
}

export async function sendGroupMessage(data: {
  groupId: string
  message?: string
  imageUrl?: string
  videoUrl?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", data.groupId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (memberError) {
    console.error("[v0] Membership check error:", memberError)
    return { error: "Unable to verify group membership" }
  }

  if (!membership) {
    return { error: "You must be a member of this group to post messages" }
  }

  const { error } = await supabase.from("group_messages").insert({
    group_id: data.groupId,
    user_id: user.id,
    message: data.message || null,
    image_url: data.imageUrl || null,
    video_url: data.videoUrl || null,
  })

  if (error) {
    console.error("[v0] Error sending message:", error)
    return { error: error.message }
  }

  revalidatePath(`/groups/${data.groupId}`)

  return { success: true, message: "Message sent!" }
}

export async function deleteGroupMessage(messageId: string, groupId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("group_messages").delete().eq("id", messageId).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/groups/${groupId}`)

  return { success: true }
}

export async function removeMember(groupId: string, userId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase.rpc("remove_group_member", {
    p_group_id: groupId,
    p_user_id_to_remove: userId,
  })

  if (error) {
    console.error("[v0] Error removing member:", error)
    return { error: error.message }
  }

  if (data && typeof data === "object" && "error" in data) {
    return { error: data.error as string }
  }

  revalidatePath(`/groups/${groupId}`)
  return data as { success: boolean; message: string }
}
