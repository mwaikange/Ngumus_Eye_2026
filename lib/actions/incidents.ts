"use server"

import { createClient } from "@/lib/supabase/server"
import { encodeGeohash } from "@/lib/utils/geohash"
import { revalidatePath } from "next/cache"

export interface CreateIncidentData {
  type_id: number
  title: string
  description?: string
  town?: string
  lat: number
  lng: number
  area_radius_m?: number
}

export async function createIncident(data: CreateIncidentData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const geohash = encodeGeohash(data.lat, data.lng, 7)

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      type_id: data.type_id,
      title: data.title,
      description: data.description,
      town: data.town,
      lat: data.lat,
      lng: data.lng,
      geohash,
      area_radius_m: data.area_radius_m || 200,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.log("[v0] Error creating incident:", error)
    return { error: error.message }
  }

  // Create initial event
  await supabase.from("incident_events").insert({
    incident_id: incident.id,
    actor: user.id,
    kind: "note",
    data: { message: "Incident created" },
  })

  revalidatePath("/feed")

  return { data: incident }
}

export async function uploadIncidentMedia(incidentId: string, files: File[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const uploadedMedia = []

  for (const file of files) {
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/${incidentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from("incident-media").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      console.log("[v0] Error uploading file:", uploadError)
      continue
    }

    const { data: publicUrlData } = supabase.storage.from("incident-media").getPublicUrl(fileName)

    const { data: media, error: mediaError } = await supabase
      .from("incident_media")
      .insert({
        incident_id: incidentId,
        path: fileName,
        mime: file.type,
      })
      .select()
      .single()

    if (mediaError) {
      console.log("[v0] Error saving media record:", mediaError)
      continue
    }

    uploadedMedia.push({ ...media, url: publicUrlData.publicUrl })
  }

  revalidatePath(`/incident/${incidentId}`)

  return { data: uploadedMedia }
}

export async function toggleReaction(incidentId: string, kind: "upvote" | "downvote" | "love" | "confirm") {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Fetch ALL existing reactions this user has on this incident
  const { data: existingAll } = await supabase
    .from("incident_reactions")
    .select("id, reaction_type")
    .eq("incident_id", incidentId)
    .eq("user_id", user.id)

  const existing = existingAll?.find((r) => r.reaction_type === kind)

  if (existing) {
    // Tapping same reaction again → remove it (toggle off)
    const { error } = await supabase.from("incident_reactions").delete().eq("id", existing.id)
    if (error) return { error: error.message }
    revalidatePath(`/incident/${incidentId}`)
    revalidatePath("/feed")
    return { data: { removed: true } }
  }

  // Mutual exclusivity: upvote and downvote cancel each other out
  // love and confirm are independent but a user still can only have one of each
  const conflicting = existingAll?.filter((r) => {
    if (kind === "upvote") return r.reaction_type === "downvote"
    if (kind === "downvote") return r.reaction_type === "upvote"
    return false
  })

  if (conflicting && conflicting.length > 0) {
    // Remove the conflicting reaction before adding the new one
    await supabase
      .from("incident_reactions")
      .delete()
      .in("id", conflicting.map((r) => r.id))
  }

  // Add the new reaction
  const { error: insertError } = await supabase.from("incident_reactions").insert({
    incident_id: incidentId,
    user_id: user.id,
    reaction_type: kind,
  })

  if (insertError) return { error: insertError.message }

  // Notify the post creator (skip if reacting to own post)
  const { data: incident } = await supabase
    .from("incidents")
    .select("created_by, title")
    .eq("id", incidentId)
    .maybeSingle()

  if (incident && incident.created_by !== user.id) {
    const reactionLabel =
      kind === "upvote" ? "an upvote" :
      kind === "downvote" ? "a downvote" :
      kind === "love" ? "some love" :
      "a confirmation"

    await supabase.from("notifications").insert({
      user_id: incident.created_by,
      type: "reaction",
      metadata: {
        incident_id: incidentId,
        incident_title: incident.title,
        reactor_id: user.id,
        reaction_type: kind,
        message: `Your post received ${reactionLabel}`,
      },
      is_read: false,
    })
  }

  revalidatePath(`/incident/${incidentId}`)
  revalidatePath("/feed")
  return { data: { added: true } }
}

export async function toggleFollowIncident(incidentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: existing } = await supabase
    .from("incident_followers")
    .select("id")
    .eq("incident_id", incidentId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from("incident_followers").delete().eq("id", existing.id)
    revalidatePath(`/incident/${incidentId}`)
    return { data: { following: false } }
  }

  await supabase.from("incident_followers").insert({ incident_id: incidentId, user_id: user.id })
  revalidatePath(`/incident/${incidentId}`)
  return { data: { following: true } }
}

export async function addComment(incidentId: string, body: string, imageUrl?: string | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const insertData: any = {
    incident_id: incidentId,
    author: user.id,
    body,
  }

  // Add image_url if provided
  if (imageUrl) {
    insertData.image_url = imageUrl
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert(insertData)
    .select("id, body, created_at, author, image_url")
    .single()

  if (error) {
    console.error("[v0] Error adding comment:", error)
    return { error: error.message }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const result = {
    ...comment,
    profiles: profile || { display_name: "Anonymous", avatar_url: null },
  }

  // Fire notifications asynchronously — don't block the response
  const commenterName = profile?.display_name || "Someone"
  supabase
    .from("incidents")
    .select("created_by, title")
    .eq("id", incidentId)
    .maybeSingle()
    .then(async ({ data: incident }) => {
      if (!incident) return

      const notifySet = new Set<string>()

      // Always notify post creator (unless they're the commenter)
      if (incident.created_by !== user.id) {
        notifySet.add(incident.created_by)
      }

      // Notify all followers of this incident (except commenter)
      const { data: followers } = await supabase
        .from("incident_followers")
        .select("user_id")
        .eq("incident_id", incidentId)
        .neq("user_id", user.id)

      followers?.forEach((f) => notifySet.add(f.user_id))

      if (notifySet.size === 0) return

      const notifications = Array.from(notifySet).map((uid) => ({
        user_id: uid,
        type: "comment",
        metadata: {
          incident_id: incidentId,
          incident_title: incident.title,
          commenter_id: user.id,
          commenter_name: commenterName,
          message: `${commenterName} commented on "${incident.title}"`,
        },
        is_read: false,
      }))

      await supabase.from("notifications").insert(notifications)
    })

  revalidatePath(`/incident/${incidentId}`)

  return { data: result }
}
