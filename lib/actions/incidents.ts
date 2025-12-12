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

  // Check if reaction exists in new incident_reactions table
  const { data: existing } = await supabase
    .from("incident_reactions")
    .select("id")
    .eq("incident_id", incidentId)
    .eq("user_id", user.id)
    .eq("reaction_type", kind)
    .maybeSingle()

  if (existing) {
    // Remove reaction
    const { error } = await supabase.from("incident_reactions").delete().eq("id", existing.id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/incident/${incidentId}`)
    revalidatePath("/feed")
    return { data: { removed: true } }
  } else {
    // Add reaction - weight will be calculated by database trigger
    const { error } = await supabase.from("incident_reactions").insert({
      incident_id: incidentId,
      user_id: user.id,
      reaction_type: kind,
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/incident/${incidentId}`)
    revalidatePath("/feed")
    return { data: { added: true } }
  }
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

  revalidatePath(`/incident/${incidentId}`)

  return { data: result }
}
