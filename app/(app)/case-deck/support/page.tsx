"use client"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Phone, MessageCircle, Calendar, Clock } from "lucide-react"

const WHATSAPP_NUMBER = "+264816802064"
const WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=264816802064&text&type=phone_number&app_absent=0"

export default function SupportPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [requestType, setRequestType] = useState("")

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from("support_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) {
      setRequests(data)
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase.from("support_requests").insert({
      user_id: user.id,
      request_type: formData.get("requestType"),
      priority: formData.get("priority"),
      description: formData.get("description"),
      status: "pending",
    })

    setLoading(false)

    if (!error) {
      loadRequests()
      ;(formData.target as any).reset()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Counseling & Support" backHref="/case-deck" />

      <div className="container max-w-4xl px-4 py-6 space-y-6">
        {/* Emergency Contact - Updated phone and WhatsApp to new number */}
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Phone className="h-5 w-5" />
              Emergency Assistance
            </CardTitle>
            <CardDescription>For immediate help, contact us directly</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="destructive" className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full bg-transparent">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Request Form - Increased description character limit */}
        <Card>
          <CardHeader>
            <CardTitle>Request Support</CardTitle>
            <CardDescription>Submit a counseling or support request</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit as any} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="requestType">Request Type *</Label>
                  <Select name="requestType" value={requestType} onValueChange={setRequestType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="counseling">Counseling Session</SelectItem>
                      <SelectItem value="emergency">Emergency Assistance</SelectItem>
                      <SelectItem value="legal">Legal Advice</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select name="priority" defaultValue="medium" required>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe your request in detail..."
                  rows={8}
                  maxLength={5000}
                  className="min-h-[200px] resize-y"
                  required
                />
                <p className="text-xs text-muted-foreground">Up to 1000 words allowed</p>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Request History */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Request History</h2>
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No support requests yet</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {request.request_type?.replace("_", " ")}
                      </Badge>
                      <Badge
                        className={
                          request.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : request.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {request.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
