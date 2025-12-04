import { AppHeader } from "@/components/app-header"
import { IncidentCard } from "@/components/incident-card"
import { AdCard } from "@/components/ad-card"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { mergePostsAndAds, type FeedPost, type FeedAd } from "@/lib/feed-utils"
import { getActiveAds } from "@/lib/actions/ads"
import { FeedFilters } from "@/components/feed-filters"

async function getFeedData(filter: string, userId?: string) {
  const supabase = await createClient()

  let query = supabase
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
    .order("created_at", { ascending: false })
    .limit(40)

  if (filter === "following" && userId) {
    const { data: followingData } = await supabase.from("user_follows").select("following_id").eq("follower_id", userId)

    const followingIds = followingData?.map((f) => f.following_id) || []

    if (followingIds.length > 0) {
      query = query.in("created_by", followingIds)
    } else {
      // Return empty if not following anyone
      return []
    }
  }

  const [incidentsResult, adsData] = await Promise.all([query, getActiveAds()])

  const { data: incidentsData, error: incidentsError } = incidentsResult

  if (incidentsError) {
    console.error("[v0] Error loading incidents:", incidentsError)
  }

  let followingSet = new Set<string>()
  if (userId) {
    const { data: followingData } = await supabase.from("user_follows").select("following_id").eq("follower_id", userId)

    followingSet = new Set(followingData?.map((f) => f.following_id) || [])
  }

  const posts: FeedPost[] =
    incidentsData?.map((row: any) => {
      // Convert storage paths to full public URLs
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
        is_following: row.profiles ? followingSet.has(row.profiles.id) : false,
      }
    }) ?? []

  // Transform ads
  const ads: FeedAd[] =
    adsData?.map((ad) => ({
      id: ad.id,
      type: "ad" as const,
      title: ad.title,
      description: ad.description,
      media_url: ad.media_url,
      media_type: ad.media_type,
      target_url: ad.target_url,
    })) ?? []

  // Merge with random ad insertion
  return mergePostsAndAds(posts, ads)
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = params.filter || "all"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const feedItems = await getFeedData(filter, user?.id)

  const isFollowingEmpty = filter === "following" && feedItems.length === 0

  return (
    <div className="min-h-screen bg-[#F2F4F7]">
      <AppHeader title="Community Feed" showSearch />

      <main className="max-w-md mx-auto px-3 pb-6 pt-2">
        <FeedFilters currentFilter={filter} />

        <div>
          {isFollowingEmpty ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-500 mb-2">You're not following anyone yet</p>
              <p className="text-gray-400 text-sm mb-4">Follow users to see their posts here</p>
              <Button asChild variant="outline">
                <a href="/feed">View All Posts</a>
              </Button>
            </div>
          ) : feedItems.length > 0 ? (
            feedItems.map((item) =>
              item.type === "ad" ? (
                <AdCard key={`ad-${item.id}`} ad={item} />
              ) : (
                <IncidentCard key={`post-${item.id}`} incident={item} />
              ),
            )
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-500 mb-4">No incidents reported yet</p>
              <Button asChild>
                <a href="/report">Report an Incident</a>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
