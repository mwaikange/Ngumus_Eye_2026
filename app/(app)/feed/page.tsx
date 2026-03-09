"use client"

import { AppHeader } from "@/components/app-header"
import { IncidentCard } from "@/components/incident-card"
import { AdCard } from "@/components/ad-card"
import { Button } from "@/components/ui/button"
import { mergePostsAndAds, type FeedPost, type FeedAd } from "@/lib/feed-utils"
import { FeedFilters } from "@/components/feed-filters"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MapPin, Loader2 } from "lucide-react"

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return distance
}

export default function FeedPage() {
  const [filter, setFilter] = useState("all")
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [ads, setAds] = useState<FeedAd[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          console.log("[v0] User location obtained:", position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.error("[v0] Location error:", error)
          setLocationError(
            error.code === error.PERMISSION_DENIED
              ? "Location access denied. Please enable location to use Nearby filter."
              : "Unable to get your location. Please check your device settings.",
          )
        },
      )
    }
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id)
    }
    getUser()
  }, [])

  useEffect(() => {
    const fetchFeedData = async () => {
      setLoading(true)
      const supabase = createClient()

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
          admin_verified,
          lat,
          lng,
          town,
          incident_types(label, severity),
          incident_media(path),
          profiles!incidents_created_by_fkey(id, display_name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(40)

      if (filter === "verified") {
        query = query.eq("admin_verified", true)
      } else if (filter === "following" && userId) {
        const { data: followingData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", userId)

        const followingIds = followingData?.map((f) => f.following_id) || []

        if (followingIds.length === 0) {
          setPosts([])
          setAds([])
          setLoading(false)
          return
        }

        query = query.in("created_by", followingIds)
      }

      const [incidentsResult, adsResult] = await Promise.all([
        query,
        filter === "all"
          ? supabase.from("ad_inventory").select("*").eq("is_active", true).gte("end_date", new Date().toISOString())
          : Promise.resolve({ data: [] }),
      ])

      const { data: incidentsData, error: incidentsError } = incidentsResult

      if (incidentsError) {
        console.error("[v0] Error loading incidents:", incidentsError)
      }

      let followingSet = new Set<string>()
      if (userId) {
        const { data: followingData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", userId)

        followingSet = new Set(followingData?.map((f) => f.following_id) || [])
      }

      let filteredIncidents = incidentsData || []

      if (filter === "nearby" && userLocation) {
        filteredIncidents = filteredIncidents.filter((row: any) => {
          if (!row.lat || !row.lng) return false
          const distance = calculateDistance(userLocation.lat, userLocation.lng, row.lat, row.lng)
          return distance <= 5 // 5km radius
        })
      }

      const feedPosts: FeedPost[] = filteredIncidents.map((row: any) => {
        const mediaUrls =
          row.incident_media
            ?.map((m: any) => {
              if (!m.path) return null
              // If path is already a full public URL (e.g. Vercel Blob), use it directly.
              // Otherwise treat it as a Supabase Storage key and build the public URL.
              if (m.path.startsWith("http://") || m.path.startsWith("https://")) {
                return m.path
              }
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
                town: row.town || "Unknown",
              }
            : undefined,
          is_following: row.profiles ? followingSet.has(row.profiles.id) : false,
          currentUserId: userId,
        }
      })

      const feedAds: FeedAd[] =
        filter === "all"
          ? (adsResult.data?.map((ad: any) => ({
              id: ad.id,
              type: "ad" as const,
              title: ad.title,
              description: ad.description,
              media_url: ad.media_url,
              media_type: ad.media_type,
              target_url: ad.target_url,
            })) ?? [])
          : []

      setPosts(feedPosts)
      setAds(feedAds)
      setLoading(false)
    }

    fetchFeedData()
  }, [filter, userId, userLocation])

  const feedItems = mergePostsAndAds(posts, ads)

  const isFollowingEmpty = filter === "following" && feedItems.length === 0
  const isNearbyEmpty = filter === "nearby" && feedItems.length === 0 && !loading

  return (
    <div className="min-h-screen bg-[#F2F4F7]">
      <AppHeader title="Community Feed" showSearch />

      <main className="max-w-md mx-auto px-3 pb-6 pt-2">
        <FeedFilters currentFilter={filter} onFilterChange={setFilter} />

        {filter === "nearby" && locationError && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Location Access Required</p>
                <p className="text-xs text-amber-700 mt-1">{locationError}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isFollowingEmpty ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-500 mb-2">You're not following anyone yet</p>
              <p className="text-gray-400 text-sm mb-4">Follow users to see their posts here</p>
              <Button asChild variant="outline">
                <a href="/feed">View All Posts</a>
              </Button>
            </div>
          ) : isNearbyEmpty ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 mb-2">No incidents nearby</p>
              <p className="text-gray-400 text-sm mb-4">
                {userLocation
                  ? "There are no reported incidents within 5km of your location"
                  : "Enable location access to see nearby incidents"}
              </p>
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
