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

function getRandomInt(min: number, max: number) {
  const mn = Math.ceil(min)
  const mx = Math.floor(max)
  return Math.floor(Math.random() * (mx - mn + 1)) + mn
}

/**
 * Merge posts and ads with random insertion algorithm
 * Inserts ads after 3 posts initially, then randomly after 3-7 posts
 */
export function mergePostsAndAds(posts: FeedPost[], ads: FeedAd[]): FeedItem[] {
  const result: FeedItem[] = []
  let postCounter = 0
  let nextInsertPoint = 3 // First ad after 3 posts
  const adQueue = [...ads]

  for (const post of posts) {
    result.push({ ...post, type: "post" as const })
    postCounter++

    if (postCounter >= nextInsertPoint && adQueue.length > 0) {
      const ad = adQueue.shift()!
      result.push(ad)
      postCounter = 0
      nextInsertPoint = getRandomInt(3, 7) // Random interval for next ad
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
