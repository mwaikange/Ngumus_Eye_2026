import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] Upload API called")
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.error("[v0] No file provided in upload request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] Uploading file:", file.name, file.type, file.size)

    const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith("video/") ? 50 : 10
      return NextResponse.json({ error: `File too large. Maximum size is ${maxSizeMB}MB` }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = /^(image|video)\//
    if (!allowedTypes.test(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only images and videos are allowed" }, { status: 400 })
    }

    const blob = await put(file.name, file, {
      access: "public",
    })

    console.log("[v0] File uploaded successfully:", blob.url)
    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}
