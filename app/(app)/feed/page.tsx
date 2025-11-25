import { AppHeader } from "@/components/app-header"
import { IncidentCard } from "@/components/incident-card"
import { AdCard } from "@/components/ad-card"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { mergePostsAndAds, type FeedPost, type FeedAd } from "@/lib/feed-utils"
import { getActiveAds } from "@/lib/actions/ads"

async function getFeedData() {
  const supabase = await createClient()

  // Fetch incidents with related data
  const [incidentsResult, adsData] = await Promise.all([
    supabase
      .from("incidents")
      .select(
        `
        id,
        title,
        description,
        type_id,
        created_at,
        area_radius_m,
        verification_level,
        incident_types(label, severity),
        incident_media(path)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(40),
    getActiveAds(),
  ])

  const { data: incidentsData, error: incidentsError } = incidentsResult

  if (incidentsError) {
    console.error("[v0] Error loading incidents:", incidentsError)
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

export default async function FeedPage() {
  const feedItems = await getFeedData()

  return (
    <div className="min-h-screen bg-[#F2F4F7]">
      <AppHeader title="Community Feed" showSearch />

      <main className="max-w-md mx-auto px-3 pb-6 pt-2">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
          <button className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium whitespace-nowrap">
            All
          </button>
          <button className="px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium whitespace-nowrap">
            Nearby
          </button>
          <button className="px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium whitespace-nowrap">
            Verified
          </button>
          <button className="px-3 py-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium whitespace-nowrap">
            Following
          </button>
        </div>

        <div className="space-y-8">
          {feedItems.length > 0 ? (
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
