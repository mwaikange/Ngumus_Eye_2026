"use client"

import type React from "react"

import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { createIncident, uploadIncidentMedia } from "@/lib/actions/incidents"
import { useRouter } from "next/navigation"
import {
  MapPin,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Video,
  Loader2,
  CheckCircle,
  ImageIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

interface IncidentType {
  id: number
  code: string
  label: string
  severity: number
}

interface MediaFile {
  file: File
  preview: string
  compressed?: File
  status: "pending" | "compressing" | "ready" | "uploading" | "done" | "error"
  progress: number
}

async function compressImage(file: File, maxWidth = 1080, quality = 0.7): Promise<File> {
  if (!file.type.startsWith("image/")) return file

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }))
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

export default function ReportPage() {
  const [step, setStep] = useState(1)
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "compressing" | "uploading" | "processing" | "success">(
    "idle",
  )
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    type_id: "",
    title: "",
    description: "",
    area_radius_m: "200",
  })

  useEffect(() => {
    const fetchIncidentTypes = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("incident_types").select("*").order("severity", { ascending: false })

      if (data) {
        setIncidentTypes(data)
      }
    }

    fetchIncidentTypes()
  }, [])

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      mediaFiles.forEach((mf) => URL.revokeObjectURL(mf.preview))
    }
  }, [])

  const getCurrentLocation = () => {
    setLocationLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationLoading(false)
        toast({ title: "Location set", description: "Your current location has been captured" })
      },
      (error) => {
        setError("Unable to get your location. Please enable location services.")
        setLocationLoading(false)
      },
    )
  }

  const handleMediaChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])

      const newMediaFiles: MediaFile[] = []

      for (const file of files) {
        const isImage = file.type.startsWith("image/")
        const isVideo = file.type.startsWith("video/")

        // Validate
        if (!isImage && !isVideo) {
          toast({
            title: "Invalid file",
            description: `${file.name} is not a valid image or video`,
            variant: "destructive",
          })
          continue
        }

        // Check size limits
        const maxSize = isVideo ? 25 * 1024 * 1024 : 10 * 1024 * 1024
        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds ${isVideo ? "25MB" : "10MB"} limit`,
            variant: "destructive",
          })
          continue
        }

        // Create fast preview immediately
        const preview = URL.createObjectURL(file)

        newMediaFiles.push({
          file,
          preview,
          status: isImage ? "compressing" : "ready",
          progress: 0,
        })
      }

      setMediaFiles((prev) => [...prev, ...newMediaFiles])

      // Compress images in background
      for (let i = 0; i < newMediaFiles.length; i++) {
        const mf = newMediaFiles[i]
        if (mf.status === "compressing") {
          try {
            const compressed = await compressImage(mf.file)
            setMediaFiles((prev) =>
              prev.map((p) => (p.preview === mf.preview ? { ...p, compressed, status: "ready" as const } : p)),
            )
          } catch (e) {
            setMediaFiles((prev) =>
              prev.map((p) => (p.preview === mf.preview ? { ...p, status: "ready" as const } : p)),
            )
          }
        }
      }

      // Reset input
      e.target.value = ""
    },
    [toast],
  )

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const removed = prev[index]
      if (removed) {
        URL.revokeObjectURL(removed.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    if (!location) {
      setError("Please set a location")
      return
    }

    setIsLoading(true)
    setError(null)
    setUploadStatus("processing")
    setUploadProgress(10)

    const result = await createIncident({
      type_id: Number.parseInt(formData.type_id),
      title: formData.title,
      description: formData.description,
      lat: location.lat,
      lng: location.lng,
      area_radius_m: Number.parseInt(formData.area_radius_m),
    })

    setUploadProgress(30)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      setUploadStatus("idle")
      toast({ title: "Error", description: result.error, variant: "destructive" })
      return
    }

    if (result.data) {
      if (mediaFiles.length > 0) {
        setUploadStatus("uploading")
        setUploadProgress(40)

        // Get files to upload (use compressed if available)
        const filesToUpload = mediaFiles.map((mf) => mf.compressed || mf.file)

        // Simulate per-file progress
        const progressPerFile = 50 / filesToUpload.length

        for (let i = 0; i < filesToUpload.length; i++) {
          setMediaFiles((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "uploading" as const } : p)))

          // Upload one file at a time with progress simulation
          await uploadIncidentMedia(result.data.id, [filesToUpload[i]])

          setMediaFiles((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, status: "done" as const, progress: 100 } : p)),
          )

          setUploadProgress(40 + (i + 1) * progressPerFile)
        }
      }

      setUploadProgress(100)
      setUploadStatus("success")

      toast({ title: "Report submitted!", description: "Your incident has been reported successfully" })

      await new Promise((resolve) => setTimeout(resolve, 600))
      router.push(`/incident/${result.data.id}`)
    }
  }

  const canProceedStep1 = formData.type_id && location
  const canProceedStep2 = formData.title.trim().length > 0
  const allFilesReady = mediaFiles.every((mf) => mf.status === "ready" || mf.status === "done")

  const getSubmitButtonContent = () => {
    switch (uploadStatus) {
      case "compressing":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Compressing...
          </>
        )
      case "processing":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        )
      case "uploading":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading {uploadProgress}%
          </>
        )
      case "success":
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Success!
          </>
        )
      default:
        return "Submit Report"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Report Incident" />

      <div className="container max-w-2xl px-4 py-4">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 3</span>
            <span className="text-sm text-muted-foreground">
              {step === 1 && "Type & Location"}
              {step === 2 && "Details & Media"}
              {step === 3 && "Review"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Step 1: Type & Location */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>What are you reporting?</CardTitle>
              <CardDescription>Select the type of incident and set the location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="type">Incident Type</Label>
                <Select
                  value={formData.type_id}
                  onValueChange={(value) => setFormData({ ...formData, type_id: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                {location ? (
                  <div className="p-4 bg-muted rounded-lg space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Location set</span>
                      </div>
                      <Badge variant="outline">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={getCurrentLocation} disabled={locationLoading}>
                      {locationLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Update Location
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={getCurrentLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    {locationLoading ? "Getting location..." : "Use Current Location"}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Alert Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={formData.area_radius_m}
                  onChange={(e) => setFormData({ ...formData, area_radius_m: e.target.value })}
                  min="50"
                  max="5000"
                  step="50"
                />
                <p className="text-xs text-muted-foreground">People within this radius will be notified</p>
              </div>

              <Button className="w-full" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Details & Media */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
              <CardDescription>Provide a clear description and upload photos or videos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of the incident"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">{formData.title.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide more details about what happened..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">{formData.description.length}/1000 characters</p>
              </div>

              <div className="space-y-2">
                <Label>Photos & Videos (Optional)</Label>
                <div className="space-y-3">
                  {mediaFiles.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {mediaFiles.map((mf, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-lg overflow-hidden bg-muted animate-fade-in"
                        >
                          {mf.file.type.startsWith("image/") ? (
                            <img
                              src={mf.preview || "/placeholder.svg"}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Video className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}

                          {/* Status overlay */}
                          {mf.status === "compressing" && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="text-center text-white">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                                <span className="text-xs">Compressing</span>
                              </div>
                            </div>
                          )}

                          {mf.status === "uploading" && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="text-center text-white">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                                <span className="text-xs">Uploading</span>
                              </div>
                            </div>
                          )}

                          {mf.status === "done" && (
                            <div className="absolute top-1 left-1">
                              <CheckCircle className="h-5 w-5 text-green-500 drop-shadow" />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            disabled={mf.status === "uploading"}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <input
                      type="file"
                      id="media-upload"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => document.getElementById("media-upload")?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photos or Videos
                    </Button>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-1">File Requirements:</p>
                      <ul className="text-xs text-blue-700 space-y-0.5">
                        <li>• Images: JPG, PNG, HEIC (max 10MB, auto-compressed)</li>
                        <li>• Videos: MP4, MOV (max 25MB)</li>
                        <li>• Multiple files allowed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)} disabled={!canProceedStep2 || !allFilesReady}>
                  {!allFilesReady ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
              <CardDescription>Please review your report before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">
                    {incidentTypes.find((t) => t.id === Number.parseInt(formData.type_id))?.label}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{formData.title}</p>
                </div>

                {formData.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                )}

                {mediaFiles.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Media</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{mediaFiles.length} file(s) attached</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Alert Radius</Label>
                  <p className="text-sm">{formData.area_radius_m} meters</p>
                </div>
              </div>

              {isLoading && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {uploadStatus === "uploading" ? "Uploading media..." : "Processing..."}
                    </span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  By submitting this report, you confirm that the information provided is accurate to the best of your
                  knowledge. False reports may result in account suspension.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setStep(2)}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1 min-w-[140px] transition-all duration-200"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {getSubmitButtonContent()}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
