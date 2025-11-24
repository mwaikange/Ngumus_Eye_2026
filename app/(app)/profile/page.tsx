import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { Shield, Award, Calendar, LogOut } from "lucide-react"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/actions/auth"
import { ActionButton } from "@/components/action-button-with-loading"
import Link from "next/link"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .maybeSingle()

  let plan = null
  if (subscription?.plan_id) {
    const { data: planData } = await supabase.from("plans").select("*").eq("id", subscription.plan_id).single()
    plan = planData
  }

  const daysRemaining = subscription
    ? Math.ceil((new Date(subscription.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Profile" />

      <div className="container max-w-2xl px-4 py-4 space-y-4">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{profile?.display_name || "User"}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                Level {profile?.level || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Trust Score: {profile?.trust_score || 0}</span>
              </div>
              {profile?.phone && <div className="text-sm text-muted-foreground">{profile.phone}</div>}
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>{subscription ? "Active membership" : "No active subscription"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && plan ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{plan.label}</span>
                    <Badge className="bg-primary">Active</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Expires {new Date(subscription.expires_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm font-medium text-primary">{daysRemaining} days remaining</div>
                </div>
                <div className="flex gap-2">
                  <Link href="/subscribe" className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      Renew / Upgrade
                    </Button>
                  </Link>
                  <Link href="/case-deck" className="flex-1">
                    <Button className="w-full">My Case Deck</Button>
                  </Link>
                </div>
              </>
            ) : (
              <Link href="/subscribe">
                <Button className="w-full">Subscribe Now</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <form action={signOut}>
              <ActionButton variant="outline" className="w-full bg-transparent" loadingText="Signing out...">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </ActionButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
