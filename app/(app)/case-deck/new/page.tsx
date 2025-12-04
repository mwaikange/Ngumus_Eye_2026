"use client"

import type React from "react"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createCase } from "@/lib/actions/cases"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertCircle, Upload, X, FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const categories = [
  { value: "theft", label: "Theft" },
  { value: "gbv", label: "Gender-Based Violence (GBV)" },
  { value: "harassment", label: "Harassment" },
  { value: "missing_person", label: "Missing Person" },
  { value: "fraud", label: "Fraud" },
  { value: "domestic", label: "Domestic Issues" },
  { value: "stolen_device", label: "Stolen Device" },
  { value: "other", label: "Other" },
]

export default function NewCasePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [category, setCategory] = useState("")

  const [crNumber, setCrNumber] = useState("")
  const [vehiclePlate, setVehiclePlate] = useState("")
  const [serialNumbers, setSerialNumbers] = useState("")
  const [stolenItemRef, setStolenItemRef] = useState("")

  const [images, setImages] = useState<File[]>([])
  const [documents, setDocuments] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validImages = files.filter((f) => f.type.startsWith("image/"))

    if (images.length + validImages.length > 7) {
      toast({
        title: "Too many images",
        description: "Maximum 7 images allowed per case",
        variant: "destructive",
      })
      return
    }

    setImages((prev) => [...prev, ...validImages])

    // Create previews
    validImages.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validDocs = files.filter(
      (f) =>
        f.type === "application/pdf" ||
        f.type === "application/msword" ||
        f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        f.type.startsWith("image/"),
    )

    if (documents.length + validDocs.length > 5) {
      toast({
        title: "Too many documents",
        description: "Maximum 5 documents allowed per case",
        variant: "destructive",
      })
      return
    }

    setDocuments((prev) => [...prev, ...validDocs])
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")

    formData.set("cr_number", crNumber)
    formData.set("vehicle_plate", vehiclePlate)
    formData.set("serial_numbers", serialNumbers)
    formData.set("stolen_item_ref", stolenItemRef)

    const result = await createCase(formData)

    if (result.error) {
      setError(result.error)
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    toast({
      title: "Case Created",
      description: `Case ${result.case?.case_number || ""} created successfully!`,
    })

    router.push(`/case-deck/${result.case?.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Open New Case" backHref="/case-deck" />

      <div className="container max-w-2xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Open New Case</CardTitle>
            <CardDescription>Provide details about the incident you want to report</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Incident Category *</Label>
                <Select name="category" value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Case Title *</Label>
                <Input id="title" name="title" placeholder="Brief description of the incident" required />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Provide as much detail as possible..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cr_number">Police CR Number (if available)</Label>
                <Input
                  id="cr_number"
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  placeholder="e.g. CR-2025-001234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_plate">Vehicle Number Plate (if applicable)</Label>
                <Input
                  id="vehicle_plate"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="e.g. N 123 ABC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_numbers">Serial Numbers (devices/items)</Label>
                <Textarea
                  id="serial_numbers"
                  value={serialNumbers}
                  onChange={(e) => setSerialNumbers(e.target.value)}
                  placeholder="Enter serial numbers of stolen devices or items, one per line"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stolen_item_ref">Stolen Item Reference</Label>
                <Input
                  id="stolen_item_ref"
                  value={stolenItemRef}
                  onChange={(e) => setStolenItemRef(e.target.value)}
                  placeholder="e.g. IMEI, Asset Tag, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Evidence Images (max 7)</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="flex flex-col items-center cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Tap to upload images</span>
                    <span className="text-xs text-gray-400 mt-1">JPG, PNG up to 50MB each</span>
                  </label>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img src={preview || "/placeholder.svg"} alt="" className="h-16 w-16 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Supporting Documents (max 5)</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    multiple
                    onChange={handleDocUpload}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label htmlFor="doc-upload" className="flex flex-col items-center cursor-pointer">
                    <FileText className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Tap to upload documents</span>
                    <span className="text-xs text-gray-400 mt-1">PDF, Word, Images</span>
                  </label>
                </div>
                {documents.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-sm">
                        <span className="truncate flex-1">{doc.name}</span>
                        <button type="button" onClick={() => removeDocument(idx)} className="text-red-500 ml-2">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Submit Case"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
