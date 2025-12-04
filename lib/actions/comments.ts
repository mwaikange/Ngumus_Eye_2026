"use server"

import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"

export async function createComment(incidentId: string, text: string, imageFile?: File) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  let imageUrl: string | null = null

  if (imageFile) {
    try {
      const blob = await put(`comment-images/${user.id}/${Date.now()}-${imageFile.name}`, imageFile, {
        access: "public",
      })
      imageUrl = blob.url
    } catch (error) {
      console.error("Error uploading comment image:", error)
      return { error: "Failed to upload image" }
    }
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      incident_id: incidentId,
      author: user.id,
      text,
      image_url: imageUrl,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating comment:", error)
    return { error: error.message }
  }

  return { data, error: null }
}

export async function getComments(incidentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("comments")
    .select(`
      *,
      profiles:author (
        display_name,
        avatar_url
      )
    `)
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching comments:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
