import { AppHeader } from "@/components/app-header"
import { IncidentCard } from "@/components/incident-card"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Award } from "lucide-react"
import { redirect } from "next/navigation"
import { FollowButtonClient } from "@/components/follow-button-client"

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, full_name, avatar_url, trust_score, level")
    .eq("id", id)
    .single()

  if (!profile) {
    redirect("/feed")
  }

  // Fetch follow counts and whether current user follows this profile
  const [followersResult, followingResult, isFollowingResult] = await Promise.all([
    supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", id),
    supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", id),
    supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", id)
      .maybeSingle(),
  ])

  const followersCount = followersResult.count || 0
  const followingCount = followingResult.count || 0
  const isAlreadyFollowing = !!isFollowingResult.data
  const isOwnProfile = currentUser.id === id

  const { data: incidents } = await supabase
    .from("incidents")
    .select(`
      id,
      title,
      description,
      type_id,
      created_at,
      created_by,
      area_radius_m,
      verification_level,
      expires_at,
      incident_types(label, severity),
      incident_media(path),
      profiles!incidents_created_by_fkey(id, display_name, avatar_url, trust_score)
    `)
    .eq("created_by", id)
    .gt("expires_at", new Date().toISOString()) // Only show non-expired posts
    .order("created_at", { ascending: false })
    .limit(50)

  const posts =
    incidents?.map((row: any) => {
      const mediaUrls =
          row.incident_media
            ?.map((m: any) => {
              if (!m.path) return null
              if (m.path.startsWith("http://") || m.path.startsWith("https://")) return m.path
              const { data } = supabase.storage.from("incident-media").getPublicUrl(m.path)
              return data.publicUrl
            })
            .filter(Boolean) || []

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.incident_types?.label || "Incident",
        created_at: row.created_at,
        area_radius_m: row.area_radius_m ?? null,
        verification_level: row.verification_level ?? null,
        media_urls: mediaUrls,
        severity: row.incident_types?.severity || 1,
        reporter: row.profiles
          ? {
              id: row.profiles.id,
              display_name: row.profiles.display_name || "Anonymous",
              avatar_url: row.profiles.avatar_url,
              trust_score: row.profiles.trust_score,
            }
          : undefined,
        is_following: false,
        currentUserId: currentUser.id,
      }
    }) || []

  const activePostCount = posts.length

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={`${profile.display_name || profile.full_name}'s Posts`} backHref="/feed" />

      <div className="container max-w-4xl px-4 py-6">
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            {/* Avatar + name + level */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 flex-shrink-0">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {(profile.display_name || profile.full_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-bold truncate">
                    {profile.display_name || profile.full_name}
                  </h2>
                  <Badge variant="outline" className="gap-1 whitespace-nowrap flex-shrink-0">
                    <Shield className="h-3 w-3" />
                    Level {profile.level || 0}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Award className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Trust Score: {profile.trust_score || 0}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{activePostCount} active posts</p>
              </div>
            </div>

            {/* Followers / Following counts */}
            <div className="flex items-center gap-6 pt-2 border-t">
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">{followersCount}</span>
                <span className="text-xs text-muted-foreground">Followers</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">{followingCount}</span>
                <span className="text-xs text-muted-foreground">Following</span>
              </div>
              {!isOwnProfile && (
                <div className="ml-auto">
                  <FollowButtonClient
                    targetUserId={id}
                    initialIsFollowing={isAlreadyFollowing}
                    displayName={profile.display_name || profile.full_name || "this user"}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{activePostCount} Active Posts</h3>
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No active posts</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => <IncidentCard key={post.id} incident={post} />)
          )}
        </div>
      </div>
    </div>
  )
}
