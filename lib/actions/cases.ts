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

  const { data: profile } = await supabase.from("profiles").select("full_name, phone, email").eq("id", user.id).single()

  const category = formData.get("category") as string
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const priority = (formData.get("priority") as string) || "medium"
  const crNumber = formData.get("cr_number") as string
  const vehiclePlate = formData.get("vehicle_plate") as string
  const serialNumbers = formData.get("serial_numbers") as string
  const stolenItemRef = formData.get("stolen_item_ref") as string
  const locationAddress = formData.get("location_address") as string
  const town = formData.get("town") as string

  const year = new Date().getFullYear()
  const randomNum = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")
  const case_number = `CASE-${year}-${randomNum}`

  const { data: newCase, error } = await supabase
    .from("cases")
    .insert({
      user_id: user.id,
      serial_number: case_number,
      case_number: case_number,
      category: category,
      title,
      description,
      status: "open",
      priority,
      police_cr_number: crNumber || null,
      vehicle_number_plate: vehiclePlate || null,
      serial_numbers: serialNumbers ? serialNumbers.split("\n").filter(Boolean) : [],
      stolen_item_reference: stolenItemRef || null,
      reporter_name: profile?.full_name || "Unknown",
      reporter_phone: profile?.phone || null,
      reporter_email: profile?.email || user.email || null,
      location_address: locationAddress || null,
      town: town || null,
      evidence: [],
      documents: [],
      files: [],
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
        const blob = await put(`case-evidence/${newCase.id}/${image.name}`, image, {
          access: "public",
        })

        await addEvidenceToCase(newCase.id, {
          id: crypto.randomUUID(),
          file_url: blob.url,
          file_name: image.name,
          file_type: image.type,
          file_size: image.size,
          description: "Incident evidence photo",
          uploaded_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error("[v0] Error uploading evidence:", err)
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

        await addDocumentToCase(newCase.id, {
          id: crypto.randomUUID(),
          file_url: blob.url,
          file_name: doc.name,
          file_type: doc.type,
          file_size_bytes: doc.size,
          uploaded_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error("[v0] Error uploading document:", err)
      }
    }
  }

  revalidatePath("/case-deck")

  return { success: true, case: newCase, case_number: newCase.case_number, message: "Case created successfully!" }
}

async function addEvidenceToCase(caseId: string, evidence: any) {
  const supabase = await createClient()

  const { data: currentCase } = await supabase.from("cases").select("evidence").eq("id", caseId).single()

  const updatedEvidence = [...(currentCase?.evidence || []), evidence]

  await supabase.from("cases").update({ evidence: updatedEvidence }).eq("id", caseId)
}

async function addDocumentToCase(caseId: string, document: any) {
  const supabase = await createClient()

  const { data: currentCase } = await supabase.from("cases").select("documents").eq("id", caseId).single()

  const updatedDocuments = [...(currentCase?.documents || []), document]

  await supabase.from("cases").update({ documents: updatedDocuments }).eq("id", caseId)
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

  return {
    case: caseData,
    evidence: caseData.evidence || [],
    documents: caseData.documents || [],
    files: caseData.files || [],
  }
}

export async function uploadCaseFile(caseId: string, file: File, fileType: "evidence" | "document" | "file") {
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

    if (fileType === "evidence") {
      await addEvidenceToCase(caseId, {
        id: crypto.randomUUID(),
        file_url: blob.url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        description: "Evidence photo/video",
        uploaded_at: new Date().toISOString(),
      })
    } else if (fileType === "document") {
      await addDocumentToCase(caseId, {
        id: crypto.randomUUID(),
        file_url: blob.url,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        uploaded_at: new Date().toISOString(),
      })
    } else {
      const { data: currentCase } = await supabase.from("cases").select("files").eq("id", caseId).single()

      const newFile = {
        id: crypto.randomUUID(),
        file_url: blob.url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }

      const updatedFiles = [...(currentCase?.files || []), newFile]

      await supabase.from("cases").update({ files: updatedFiles }).eq("id", caseId)
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

  await addEvidenceToCase(caseId, {
    id: crypto.randomUUID(),
    file_url: fileUrl,
    file_type: fileType,
    file_name: fileName,
    file_size: fileSize ? Number.parseInt(fileSize) : null,
    description: description || "Case evidence",
    uploaded_at: new Date().toISOString(),
  })

  revalidatePath(`/case-deck/${caseId}`)

  return { success: true, message: "Evidence uploaded successfully!" }
}
