"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadCaseEvidence } from "@/lib/actions/cases"
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function CaseEvidenceUpload({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [fileType, setFileType] = useState("")

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")
    setSuccess(false)

    // In a real app, this would upload to Vercel Blob storage first
    // For now, we'll use a placeholder URL
    formData.append("fileUrl", "https://placeholder.com/file.jpg")

    const result = await uploadCaseEvidence(caseId, formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()

    // Reset form
    setTimeout(() => {
      setSuccess(false)
    }, 3000)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileType">File Type *</Label>
            <Select name="fileType" value={fileType} onValueChange={setFileType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select file type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fileName">File Name *</Label>
            <Input id="fileName" name="fileName" placeholder="Evidence-001.jpg" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Describe this evidence..." rows={3} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Evidence uploaded successfully!
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "Uploading..." : "Upload Evidence"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
