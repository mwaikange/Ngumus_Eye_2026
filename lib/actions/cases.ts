"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getUserCases() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: cases, error } = await supabase
    .from("incident_files")
    .select("*, profiles!incident_files_investigator_id_fkey(display_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching cases:", error)
    return { error: error.message }
  }

  return { cases }
}

export async function createCase(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const category = formData.get("category") as string
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const priority = (formData.get("priority") as string) || "medium"

  const { data: newCase, error } = await supabase
    .from("incident_files")
    .insert({
      user_id: user.id,
      category,
      title,
      description,
      priority,
      status: "new",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating case:", error)
    return { error: error.message }
  }

  revalidatePath("/case-deck")

  return { success: true, case: newCase, message: "Case created successfully!" }
}

export async function getCaseDetails(caseId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get case details
  const { data: caseData, error: caseError } = await supabase
    .from("incident_files")
    .select("*, profiles!incident_files_investigator_id_fkey(display_name, trust_score)")
    .eq("id", caseId)
    .eq("user_id", user.id)
    .single()

  if (caseError) {
    console.error("[v0] Error fetching case:", caseError)
    return { error: caseError.message }
  }

  // Get case updates
  const { data: updates } = await supabase
    .from("incident_file_updates")
    .select("*, profiles(display_name)")
    .eq("incident_file_id", caseId)
    .order("created_at", { ascending: false })

  // Get evidence
  const { data: evidence } = await supabase
    .from("case_evidence")
    .select("*")
    .eq("incident_file_id", caseId)
    .order("created_at", { ascending: false })

  return { case: caseData, updates, evidence }
}

export async function uploadCaseEvidence(caseId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const fileUrl = formData.get("fileUrl") as string
  const fileType = formData.get("fileType") as string
  const fileName = formData.get("fileName") as string
  const description = formData.get("description") as string

  const { error } = await supabase.from("case_evidence").insert({
    incident_file_id: caseId,
    file_url: fileUrl,
    file_type: fileType,
    file_name: fileName,
    description,
    uploaded_by: user.id,
  })

  if (error) {
    console.error("[v0] Error uploading evidence:", error)
    return { error: error.message }
  }

  revalidatePath(`/case-deck/${caseId}`)

  return { success: true, message: "Evidence uploaded successfully!" }
}
