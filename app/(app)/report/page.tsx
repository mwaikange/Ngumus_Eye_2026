"use client"

import type React from "react"

import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { createIncident, uploadIncidentMedia } from "@/lib/actions/incidents"
import { useRouter } from "next/navigation"
import { MapPin, AlertCircle, ChevronRight, ChevronLeft, Upload, X, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface IncidentType {
  id: number
  code: string
  label: string
  severity: number
}

export default function ReportPage() {
  const [step, setStep] = useState(1)
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const router = useRouter()

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
      },
      (error) => {
        setError("Unable to get your location. Please enable location services.")
        setLocationLoading(false)
      },
    )
  }

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/")
      const isVideo = file.type.startsWith("video/")
      const isUnder50MB = file.size <= 50 * 1024 * 1024
      return (isImage || isVideo) && isUnder50MB
    })

    if (validFiles.length !== files.length) {
      setError("Some files were skipped. Only images and videos under 50MB are allowed.")
    }

    setMediaFiles((prev) => [...prev, ...validFiles])

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!location) {
      setError("Please set a location")
      return
    }

    setIsLoading(true)
    setError(null)

    console.log("[v0] Submitting incident report...")

    const result = await createIncident({
      type_id: Number.parseInt(formData.type_id),
      title: formData.title,
      description: formData.description,
      lat: location.lat,
      lng: location.lng,
      area_radius_m: Number.parseInt(formData.area_radius_m),
    })

    console.log("[v0] Create incident result:", result)

    if (result.error) {
      console.log("[v0] Error creating incident:", result.error)
      setError(result.error)
      setIsLoading(false)
    } else if (result.data) {
      console.log("[v0] Incident created successfully, ID:", result.data.id)

      if (mediaFiles.length > 0) {
        console.log("[v0] Uploading", mediaFiles.length, "media files...")
        const uploadResult = await uploadIncidentMedia(result.data.id, mediaFiles)
        console.log("[v0] Media upload result:", uploadResult)
      }

      console.log("[v0] Waiting for database replication before redirect...")
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("[v0] Redirecting to /incident/" + result.data.id)
      router.push(`/incident/${result.data.id}`)
    }
  }

  const canProceedStep1 = formData.type_id && location
  const canProceedStep2 = formData.title.trim().length > 0

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
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Step 1: Type & Location */}
        {step === 1 && (
          <Card>
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
                  <div className="p-4 bg-muted rounded-lg space-y-2">
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
                    <MapPin className="h-4 w-4 mr-2" />
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
          <Card>
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
                  {mediaPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                          {mediaFiles[index].type.startsWith("image/") ? (
                            <img
                              src={preview || "/placeholder.svg"}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
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
                        <li>• Images: JPG, PNG, HEIC (max 50MB each)</li>
                        <li>• Videos: MP4, MOV (max 50MB each)</li>
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
                <Button className="flex-1" onClick={() => setStep(3)} disabled={!canProceedStep2}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <Card>
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
                    <p className="text-sm">{mediaFiles.length} file(s) attached</p>
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
                <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
