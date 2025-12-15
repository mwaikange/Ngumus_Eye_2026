import { AppHeader } from "@/components/app-header"
import { IncidentCard } from "@/components/incident-card"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

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
    .select("id, display_name, full_name, avatar_url, trust_score")
    .eq("id", id)
    .single()

  if (!profile) {
    redirect("/feed")
  }

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
      incident_types(label, severity),
      incident_media(path),
      profiles!incidents_created_by_fkey(id, display_name, avatar_url)
    `)
    .eq("created_by", id)
    .order("created_at", { ascending: false })
    .limit(50)

  const posts =
    incidents?.map((row: any) => {
      const mediaUrls =
        row.incident_media
          ?.map((m: any) => {
            if (!m.path) return null
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
            }
          : undefined,
        is_following: false,
        currentUserId: currentUser.id,
      }
    }) || []

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={`${profile.display_name || profile.full_name}'s Posts`} backHref="/feed" />

      <div className="container max-w-4xl px-4 py-6">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {(profile.display_name || profile.full_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{profile.display_name || profile.full_name}</h2>
                <p className="text-sm text-muted-foreground">Trust Score: {profile.trust_score}</p>
              </div>
              <Button variant="outline" asChild>
                <a href="/feed">Back to Feed</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{posts.length} Posts</h3>
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No posts yet</p>
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
