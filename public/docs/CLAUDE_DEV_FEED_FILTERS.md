# Feed Filter Logic — Mobile Implementation Guide

## The Four Tabs and Their Exact Rules

| Tab | Rule |
|-----|------|
| ALL | `expires_at IS NULL OR expires_at > NOW()` |
| NEARBY | Not expired + user coordinates within 50km radius |
| VERIFIED | Not expired + `admin_verified = TRUE` |
| FOLLOWING | Not expired + `created_by IN (users current user follows)` |

**"Not expired" means:** `incidents.expires_at IS NULL OR incidents.expires_at > NOW()`
This filter MUST be applied on EVERY tab, no exceptions.

---

## ALL Tab

```js
const now = new Date().toISOString()

const { data } = await supabase
  .from('incidents')
  .select(`
    id, title, description, created_at, created_by,
    lat, lng, town, area_radius_m, verification_level, admin_verified,
    incident_types(label, severity),
    incident_media(path),
    profiles!incidents_created_by_fkey(id, display_name, avatar_url)
  `)
  .or(`expires_at.is.null,expires_at.gt.${now}`)
  .order('created_at', { ascending: false })
  .limit(40)
```

---

## VERIFIED Tab

```js
const now = new Date().toISOString()

const { data } = await supabase
  .from('incidents')
  .select(`...same fields...`)
  .or(`expires_at.is.null,expires_at.gt.${now}`)
  .eq('admin_verified', true)
  .order('created_at', { ascending: false })
  .limit(40)
```

---

## FOLLOWING Tab

```js
const now = new Date().toISOString()

// Step 1: get who the current user follows
const { data: follows } = await supabase
  .from('user_follows')
  .select('following_id')
  .eq('follower_id', currentUser.id)

const followingIds = follows?.map(f => f.following_id) || []

// If not following anyone, show empty state immediately
if (followingIds.length === 0) {
  return []
}

// Step 2: get their non-expired posts
const { data } = await supabase
  .from('incidents')
  .select(`...same fields...`)
  .or(`expires_at.is.null,expires_at.gt.${now}`)
  .in('created_by', followingIds)
  .order('created_at', { ascending: false })
  .limit(40)
```

---

## NEARBY Tab

The nearby filter CANNOT be done cleanly in a single Supabase query from the client.
Use a two-step approach: fetch candidates, filter by distance in JavaScript/Dart.

```js
// Step 1: Request device location
const userLat = <device latitude>
const userLng = <device longitude>
const now = new Date().toISOString()

// Step 2: Fetch non-expired incidents that have coordinates
const { data } = await supabase
  .from('incidents')
  .select(`...same fields...`)
  .or(`expires_at.is.null,expires_at.gt.${now}`)
  .not('lat', 'is', null)
  .not('lng', 'is', null)
  .order('created_at', { ascending: false })
  .limit(200) // fetch more, then filter down

// Step 3: Filter by 50km radius in code
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const nearby = data.filter(row =>
  haversineDistance(userLat, userLng, row.lat, row.lng) <= 50
)
```

**Important:** If the user denies location permission, show a banner:
> "Enable location access to see nearby incidents"
Do NOT show any posts in this state. Show the banner + a "View All" button only.

---

## Media URL Handling (applies to all tabs)

`incident_media.path` can be either:
1. A full Vercel Blob URL: `https://hebbkx1anhila5yf.public.blob.vercel-storage.com/...`
2. A relative Supabase Storage key: `incident-media/abc123.jpg`

**Detection logic:**
```js
function resolveMediaUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path // already a full URL, use directly
  }
  // Supabase Storage key
  return supabase.storage.from('incident-media').getPublicUrl(path).data.publicUrl
}
```

---

## Empty States per Tab

| Tab | Empty state message |
|-----|---------------------|
| ALL | "No incidents reported yet" + Report button |
| NEARBY | "No incidents within 50km of your location" OR location permission banner |
| VERIFIED | "No verified incidents yet" |
| FOLLOWING | "You're not following anyone yet. Follow users to see their posts here." |

---

## Summary of Rules

- `expires_at` filter is MANDATORY on all tabs — never show expired posts
- `expires_at IS NULL` means the post never expires — always show it
- Nearby radius is exactly **50km** (not 5km)
- Verified = `admin_verified = TRUE` (not `verification_level > 0`)
- Following = posts by users in the `user_follows` table where `follower_id = currentUser.id`
