import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getUserCases } from "@/lib/actions/cases"
import { FileText, Plus, Clock, CheckCircle2, AlertCircle, Archive } from "lucide-react"
import Link from "next/link"

export default async function CaseDeckPage() {
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

  const { cases } = await getUserCases()

  const activeCases = cases?.filter((c) => !["closed", "archived"].includes(c.status)) || []
  const closedCases = cases?.filter((c) => ["closed", "archived"].includes(c.status)) || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <AppHeader title="My Case Deck" />

      <div className="container max-w-6xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Case Deck</h1>
            <p className="text-muted-foreground">Private investigator dashboard</p>
          </div>
          <Link href="/case-deck/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Open New Case
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCases.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">New</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cases?.filter((c) => c.status === "new").length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cases?.filter((c) => c.status === "in_progress").length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{closedCases.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Cases */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Cases</h2>
          {activeCases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No active cases</CardTitle>
                <CardDescription className="mb-4">Open a new case to get started</CardDescription>
                <Link href="/case-deck/new">
                  <Button>Open New Case</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeCases.map((caseItem) => (
                <CaseCard key={caseItem.id} caseItem={caseItem} />
              ))}
            </div>
          )}
        </div>

        {/* Closed Cases */}
        {closedCases.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Closed Cases</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {closedCases.map((caseItem) => (
                <CaseCard key={caseItem.id} caseItem={caseItem} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/case-deck/devices">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">Device Tracking</CardTitle>
                <CardDescription>Track stolen devices</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/case-deck/support">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">Counseling & Support</CardTitle>
                <CardDescription>Request assistance</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/case-deck/new">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Open New Case</CardTitle>
                <CardDescription>Report a new incident</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

function CaseCard({ caseItem }: { caseItem: any }) {
  const statusConfig = {
    new: { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-100", label: "NEW" },
    assigned: { icon: Clock, color: "text-blue-600", bg: "bg-blue-100", label: "ASSIGNED" },
    in_progress: { icon: Clock, color: "text-purple-600", bg: "bg-purple-100", label: "IN PROGRESS" },
    closed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "CLOSED" },
    archived: { icon: Archive, color: "text-gray-600", bg: "bg-gray-100", label: "ARCHIVED" },
  }

  const config = statusConfig[caseItem.status as keyof typeof statusConfig] || statusConfig.new
  const StatusIcon = config.icon

  return (
    <Link href={`/case-deck/${caseItem.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{caseItem.case_number}</span>
              </div>
              <CardTitle className="text-lg line-clamp-1">{caseItem.title}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">{caseItem.description}</CardDescription>
            </div>
            <StatusIcon className={`h-5 w-5 ${config.color} flex-shrink-0`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="capitalize">{caseItem.category?.replace("_", " ")}</span>
              {caseItem.profiles?.display_name && (
                <span className="text-xs">Investigator: {caseItem.profiles.display_name}</span>
              )}
            </div>
            <span className="text-xs">{new Date(caseItem.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
