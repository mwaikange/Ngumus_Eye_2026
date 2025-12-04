"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"

export async function getUserCases() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: cases, error } = await supabase
    .from("cases")
    .select("*")
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
  const crNumber = formData.get("cr_number") as string
  const vehiclePlate = formData.get("vehicle_plate") as string
  const serialNumbers = formData.get("serial_numbers") as string
  const stolenItemRef = formData.get("stolen_item_ref") as string

  const { data: newCase, error } = await supabase
    .from("cases")
    .insert({
      user_id: user.id,
      category: category,
      title,
      description,
      status: "open",
      priority,
      police_cr_number: crNumber || null,
      vehicle_number_plate: vehiclePlate || null,
      serial_numbers: serialNumbers ? serialNumbers.split("\n").filter(Boolean) : [],
      stolen_item_reference: stolenItemRef || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating case:", error)
    return { error: error.message }
  }

  const images = formData.getAll("images") as File[]
  if (images.length > 0) {
    for (const image of images) {
      try {
        const blob = await put(`case-files/${newCase.id}/${image.name}`, image, {
          access: "public",
        })

        await supabase.from("case_files").insert({
          case_id: newCase.id,
          file_path: blob.url,
          file_name: image.name,
          file_type: image.type,
          file_size: image.size,
          uploaded_by: user.id,
        })
      } catch (err) {
        console.error("[v0] Error uploading image:", err)
      }
    }
  }

  const documents = formData.getAll("documents") as File[]
  if (documents.length > 0) {
    for (const doc of documents) {
      try {
        const blob = await put(`case-documents/${newCase.id}/${doc.name}`, doc, {
          access: "public",
        })

        await supabase.from("case_documents").insert({
          case_id: newCase.id,
          file_url: blob.url,
          file_name: doc.name,
          file_type: doc.type,
          file_size_bytes: doc.size,
          uploaded_by: user.id,
        })
      } catch (err) {
        console.error("[v0] Error uploading document:", err)
      }
    }
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

  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .eq("user_id", user.id)
    .single()

  if (caseError) {
    console.error("[v0] Error fetching case:", caseError)
    return { error: caseError.message }
  }

  const { data: files } = await supabase
    .from("case_files")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })

  const { data: documents } = await supabase
    .from("case_documents")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })

  return { case: caseData, files, documents }
}

export async function uploadCaseFile(caseId: string, file: File, fileType: "image" | "document") {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    const blob = await put(`case-${fileType}s/${caseId}/${file.name}`, file, {
      access: "public",
    })

    if (fileType === "image") {
      const { error } = await supabase.from("case_files").insert({
        case_id: caseId,
        file_path: blob.url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      })

      if (error) {
        console.error("[v0] Error uploading file:", error)
        return { error: error.message }
      }
    } else {
      const { error } = await supabase.from("case_documents").insert({
        case_id: caseId,
        file_url: blob.url,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        uploaded_by: user.id,
      })

      if (error) {
        console.error("[v0] Error uploading document:", error)
        return { error: error.message }
      }
    }

    revalidatePath(`/case-deck/${caseId}`)

    return { success: true, url: blob.url, message: `${fileType} uploaded successfully!` }
  } catch (err: any) {
    console.error("[v0] Error uploading to Blob:", err)
    return { error: err.message || "Upload failed" }
  }
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
  const fileSize = formData.get("fileSize") as string
  const description = formData.get("description") as string

  const { error } = await supabase.from("case_files").insert({
    case_id: caseId,
    file_path: fileUrl,
    file_type: fileType,
    file_name: fileName,
    file_size: fileSize ? Number.parseInt(fileSize) : null,
    uploaded_by: user.id,
  })

  if (error) {
    console.error("[v0] Error uploading evidence:", error)
    return { error: error.message }
  }

  revalidatePath(`/case-deck/${caseId}`)

  return { success: true, message: "Evidence uploaded successfully!" }
}
