"use client"

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
import { AlertCircle } from "lucide-react"

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [category, setCategory] = useState("")

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")

    const result = await createCase(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

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
                  rows={6}
                  required
                />
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
                {loading ? "Creating Case..." : "Submit Case"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
