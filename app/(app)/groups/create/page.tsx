"use client"

import type React from "react"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { createGroup } from "@/lib/actions/groups"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function CreateGroupPage() {
  const [formData, setFormData] = useState({
    name: "",
    geohash_prefix: "",
    visibility: "public" as "public" | "private",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const result = await createGroup(formData)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)

      // Redirect after showing success message
      setTimeout(() => {
        router.push("/groups")
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Create Group" />

      <div className="container max-w-2xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Create a Community Group</CardTitle>
            <CardDescription>Set up a new neighborhood or community group for better coordination</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Windhoek Central Neighborhood Watch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading || success}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="geohash">Area Code (Geohash Prefix)</Label>
                <Input
                  id="geohash"
                  placeholder="e.g., kqe8w (6-7 characters)"
                  value={formData.geohash_prefix}
                  onChange={(e) => setFormData({ ...formData, geohash_prefix: e.target.value })}
                  maxLength={7}
                  required
                  disabled={isLoading || success}
                />
                <p className="text-xs text-muted-foreground">This defines the geographic area your group covers</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: "public" | "private") => setFormData({ ...formData, visibility: value })}
                  disabled={isLoading || success}
                >
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone can join</SelectItem>
                    <SelectItem value="private">Private - Approval required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-600">Group created successfully! Redirecting...</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => router.back()}
                  disabled={isLoading || success}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading || success}>
                  {isLoading ? "Creating..." : success ? "Created!" : "Create Group"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
