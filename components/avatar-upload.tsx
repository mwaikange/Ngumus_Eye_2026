"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Camera, Loader2 } from "lucide-react"
import { uploadAvatar } from "@/lib/actions/profile"
import { useToast } from "@/hooks/use-toast"

async function compressImage(file: File, maxWidth = 400, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      let width = img.width
      let height = img.height

      // Scale down if needed
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }))
          } else {
            resolve(file)
          }
        },
        "image/jpeg",
        quality,
      )
    }

    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

export function AvatarUpload() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading" | "success">("idle")
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setProgress(0)
    setStatus("compressing")

    try {
      // Compress the image first
      setProgress(10)
      const compressedFile = await compressImage(file, 400, 0.8)
      setProgress(30)

      setStatus("uploading")

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 15, 85))
      }, 150)

      const formData = new FormData()
      formData.append("avatar", compressedFile)

      const result = await uploadAvatar(formData)

      clearInterval(progressInterval)
      setProgress(100)
      setStatus("success")

      if (result.error) {
        toast({
          title: "Upload failed",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated",
        })
      }

      // Reset after brief delay
      await new Promise((r) => setTimeout(r, 500))
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setProgress(0)
      setStatus("idle")
      // Reset file input
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Progress overlay when uploading */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center">
          <span className="text-white text-xs font-medium mb-1">
            {status === "compressing" ? "Preparing..." : `${progress}%`}
          </span>
          <div className="w-12 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </button>
    </>
  )
}
