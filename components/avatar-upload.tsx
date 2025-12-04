"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Camera, Loader2 } from "lucide-react"
import { uploadAvatar } from "@/lib/actions/profile"
import { useToast } from "@/hooks/use-toast"

export function AvatarUpload() {
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append("avatar", file)

    const result = await uploadAvatar(formData)

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
    setLoading(false)
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </button>
    </>
  )
}
