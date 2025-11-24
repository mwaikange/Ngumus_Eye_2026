import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCaseDetails } from "@/lib/actions/cases"
import { Clock, User, FileText, ImageIcon, Video, FileIcon } from "lucide-react"
import { CaseTimeline } from "@/components/case-timeline"
import { CaseEvidenceUpload } from "@/components/case-evidence-upload"

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check subscription
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .maybeSingle()

  if (!subscription) {
    redirect("/subscribe")
  }

  const result = await getCaseDetails(params.id)

  if (result.error || !result.case) {
    redirect("/case-deck")
  }

  const { case: caseData, updates, evidence } = result

  const statusConfig = {
    new: { color: "bg-yellow-100 text-yellow-800", label: "NEW" },
    assigned: { color: "bg-blue-100 text-blue-800", label: "ASSIGNED" },
    in_progress: { color: "bg-purple-100 text-purple-800", label: "IN PROGRESS" },
    closed: { color: "bg-green-100 text-green-800", label: "CLOSED" },
    archived: { color: "bg-gray-100 text-gray-800", label: "ARCHIVED" },
  }

  const config = statusConfig[caseData.status as keyof typeof statusConfig] || statusConfig.new

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Case Details" backHref="/case-deck" />

      <div className="container max-w-6xl px-4 py-6 space-y-6">
        {/* Case Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={config.color}>{config.label}</Badge>
                  <span className="text-sm text-muted-foreground">{caseData.case_number}</span>
                </div>
                <CardTitle className="text-2xl">{caseData.title}</CardTitle>
                <CardDescription className="mt-2">{caseData.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium capitalize">{caseData.category?.replace("_", " ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p className="text-sm font-medium">{new Date(caseData.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Investigator</p>
                  <p className="text-sm font-medium">{caseData.profiles?.display_name || "Pending assignment"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {caseData.priority} Priority
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timeline & Updates */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Case Timeline</h2>
            <CaseTimeline caseId={params.id} updates={updates || []} />
          </div>

          {/* Evidence */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Evidence & Attachments</h2>
            <CaseEvidenceUpload caseId={params.id} />
            {evidence && evidence.length > 0 && (
              <div className="space-y-2">
                {evidence.map((item) => (
                  <EvidenceItem key={item.id} evidence={item} />
                ))}
              </div>
            )}
            {(!evidence || evidence.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No evidence uploaded yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EvidenceItem({ evidence }: { evidence: any }) {
  const iconMap = {
    image: ImageIcon,
    video: Video,
    audio: FileIcon,
    document: FileIcon,
  }

  const Icon = iconMap[evidence.file_type as keyof typeof iconMap] || FileIcon

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{evidence.file_name || "Untitled"}</p>
            {evidence.description && <p className="text-xs text-muted-foreground mt-1">{evidence.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">{new Date(evidence.created_at).toLocaleDateString()}</p>
          </div>
          <a href={evidence.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">
            View
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
