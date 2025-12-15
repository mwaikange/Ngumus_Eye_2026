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
 * Shuffles an array using Fisher-Yates algorithm
 * Creates a new array to avoid mutating the original
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Merges posts and ads with rotating ad placement
 * Ads are shuffled on each call so different ads appear in different positions
 * Inserts after post #1, then every 4 posts with fair rotation
 */
export function mergePostsAndAds(posts: FeedPost[], ads: FeedAd[]): FeedItem[] {
  const result: FeedItem[] = []
  let postCounter = 0
  let adIndex = 0

  const shuffledAds = shuffleArray(ads)

  // First ad after post #1, subsequent ads after every 4 posts
  const firstAdAfter = 1
  const adInterval = 4

  for (const post of posts) {
    result.push({ ...post, type: "post" as const })
    postCounter++

    // Determine if we should insert an ad
    const shouldInsertAd =
      postCounter === firstAdAfter || (postCounter > firstAdAfter && (postCounter - firstAdAfter) % adInterval === 0)

    if (shouldInsertAd && shuffledAds.length > 0) {
      const ad = shuffledAds[adIndex % shuffledAds.length]
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
