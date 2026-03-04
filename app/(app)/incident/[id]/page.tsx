import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { MapPin, Clock, User, Eye } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ReactionButtons } from "@/components/reaction-buttons"
import { CommentSection } from "@/components/comment-section"
import { MediaGallery } from "@/components/media-gallery"

const verificationLabels = ["Unverified", "Witness Verified", "Moderator Verified", "Partner Verified"]
const statusColors = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  verifying: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  assigned: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
  archived: "bg-muted text-muted-foreground",
}

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  console.log("[v0] Incident fetch result:", { incident, error: incidentError })

  if (incidentError || !incident) {
    console.error("[v0] Error fetching incident:", incidentError)
    notFound()
  }

  // Fetch related data in parallel
  const [incidentTypeResult, profileResult, eventsResult, commentsResult, mediaResult, allReactionsResult] =
    await Promise.all([
      supabase.from("incident_types").select("*").eq("id", incident.type_id).maybeSingle(),
      supabase.from("profiles").select("id, display_name, trust_score").eq("id", incident.created_by).maybeSingle(),
      supabase
        .from("incident_events")
        .select("*, profiles(display_name)")
        .eq("incident_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("comments")
        .select("*, profiles(display_name)")
        .eq("incident_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("incident_media").select("*").eq("incident_id", id),
      supabase.from("incident_reactions").select("reaction_type, user_id").eq("incident_id", id),
    ])

  const events = eventsResult.data
  const comments = commentsResult.data
  const allReactions = allReactionsResult.data

  const media = mediaResult.data?.map((record) => {
    // If path is already a full public URL (e.g. Vercel Blob), use it directly.
    // Otherwise treat it as a Supabase Storage key and build the public URL.
    let url: string
    if (record.path.startsWith("http://") || record.path.startsWith("https://")) {
      url = record.path
    } else {
      const { data: urlData } = supabase.storage.from("incident-media").getPublicUrl(record.path)
      url = urlData.publicUrl
    }
    return {
      ...record,
      url,
    }
  })

  const reactionCounts = {
    upvotes: allReactions?.filter((r) => r.reaction_type === "upvote").length || 0,
    downvotes: allReactions?.filter((r) => r.reaction_type === "downvote").length || 0,
    loves: allReactions?.filter((r) => r.reaction_type === "love").length || 0,
    confirms: allReactions?.filter((r) => r.reaction_type === "confirm").length || 0,
  }

  const userReactionTypes = allReactions?.filter((r) => r.user_id === user?.id).map((r) => r.reaction_type) || []

  // Combine the data
  const incidentWithRelations = {
    ...incident,
    incident_types: incidentTypeResult.data || { label: "Unknown" },
    profiles: profileResult.data || { display_name: "Anonymous", trust_score: 0 },
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Incident Details" />

      <div className="container max-w-4xl px-4 py-4 space-y-4">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary/10 text-primary">{incidentWithRelations.incident_types.label}</Badge>
                  <Badge className={statusColors[incidentWithRelations.status as keyof typeof statusColors]}>
                    {incidentWithRelations.status}
                  </Badge>
                  {incidentWithRelations.verification_level > 0 && (
                    <Badge variant="outline">✓ {verificationLabels[incidentWithRelations.verification_level]}</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl text-balance">{incidentWithRelations.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {incidentWithRelations.description && (
              <p className="text-muted-foreground">{incidentWithRelations.description}</p>
            )}

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Reported</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(incidentWithRelations.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{incidentWithRelations.area_radius_m}m radius</p>
                </div>
              </div>

              {incidentWithRelations.town && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Town</p>
                    <p className="font-medium">{incidentWithRelations.town}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Reporter</p>
                  <p className="font-medium">{incidentWithRelations.profiles.display_name || "Anonymous"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Trust Score</p>
                  <p className="font-medium">{incidentWithRelations.profiles.trust_score}</p>
                </div>
              </div>
            </div>

            <ReactionButtons
              incidentId={id}
              upvotes={reactionCounts.upvotes}
              downvotes={reactionCounts.downvotes}
              loves={reactionCounts.loves}
              confirms={reactionCounts.confirms}
              userReactions={userReactionTypes}
            />

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Follow
              </Button>
              <Button variant="outline" size="sm">
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="media">Media ({media?.length || 0})</TabsTrigger>
            <TabsTrigger value="comments">Comments ({comments?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-3 mt-4">
            {events && events.length > 0 ? (
              events.map((event) => (
                <Card key={event.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{event.profiles?.display_name || "System"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{event.kind.replace("_", " ")}</p>
                        {event.data && typeof event.data === "object" && "message" in event.data && (
                          <p className="text-sm">{String(event.data.message)}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">No timeline events yet</CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            {media && media.length > 0 ? (
              <MediaGallery media={media} />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">No media attached</CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 mt-4">
            <CommentSection incidentId={id} initialComments={comments || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
