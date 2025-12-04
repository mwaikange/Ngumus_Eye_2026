export type FeedPost = {
  id: string
  title: string
  description: string | null
  category: string
  created_at: string
  area_radius_m: number | null
  verification_level: number | null
  media_urls: string[]
  severity: number
  reporter?: {
    id: string
    display_name: string
    avatar_url?: string
  }
  is_following?: boolean
}

export type FeedAd = {
  id: string
  type: "ad"
  title: string
  description: string | null
  media_url: string
  media_type: string
  target_url: string | null
}

export type FeedItem = (FeedPost & { type: "post" }) | FeedAd

/**
 * Fixed ad placement algorithm - now inserts after post #1, then every 4 posts
 * Also uses backfill if we run out of ads
 */
export function mergePostsAndAds(posts: FeedPost[], ads: FeedAd[]): FeedItem[] {
  const result: FeedItem[] = []
  let postCounter = 0
  let adIndex = 0

  // First ad after post #1, subsequent ads after every 4 posts
  const firstAdAfter = 1
  const adInterval = 4

  for (const post of posts) {
    result.push({ ...post, type: "post" as const })
    postCounter++

    // Determine if we should insert an ad
    const shouldInsertAd =
      postCounter === firstAdAfter || (postCounter > firstAdAfter && (postCounter - firstAdAfter) % adInterval === 0)

    if (shouldInsertAd && ads.length > 0) {
      // Use the next ad, or backfill with oldest active ad (cycle through)
      const ad = ads[adIndex % ads.length]
      result.push(ad)
      adIndex++
    }
  }

  return result
}

export function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "1 day ago"
  return `${diffDays} days ago`
}

export function formatRadius(radiusM: number | null): string {
  if (radiusM == null) return ""
  if (radiusM >= 1000) {
    return `${(radiusM / 1000).toFixed(0)}Km Radius`
  }
  return `${radiusM}m Radius`
}
