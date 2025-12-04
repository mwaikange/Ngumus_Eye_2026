import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/server"
import { Shield, Award, Calendar, LogOut } from "lucide-react"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/actions/auth"
import { ActionButton } from "@/components/action-button-with-loading"
import Link from "next/link"
import { SetDisplayNameDialog } from "@/components/set-display-name-dialog"
import { AvatarUpload } from "@/components/avatar-upload"
import { FollowersDialog } from "@/components/followers-dialog"

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

  const [followersResult, followingResult] = await Promise.all([
    supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", user.id),
    supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", user.id),
  ])

  const followersCount = followersResult.count || 0
  const followingCount = followingResult.count || 0

  const daysRemaining = subscription
    ? Math.ceil((new Date(subscription.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Profile" />

      <div className="container max-w-2xl px-4 py-4 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Avatar with upload */}
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile?.display_name?.charAt(0).toUpperCase() ||
                      profile?.first_name?.charAt(0).toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <AvatarUpload />
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold truncate">
                      {profile?.display_name || `${profile?.first_name} ${profile?.surname}`}
                    </h2>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    {profile?.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="gap-1 whitespace-nowrap">
                      <Shield className="h-3 w-3" />
                      Level {profile?.level || 0}
                    </Badge>
                    <SetDisplayNameDialog currentDisplayName={profile?.display_name || ""} userId={user.id} />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Trust Score: {profile?.trust_score || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-around">
              <FollowersDialog userId={user.id} type="followers" count={followersCount} />
              <div className="h-8 w-px bg-border" />
              <FollowersDialog userId={user.id} type="following" count={followingCount} />
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
