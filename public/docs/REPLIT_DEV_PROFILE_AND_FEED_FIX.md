# Ngumus Eye — Replit Dev: Profile, Feed & Follow Fix

**Version:** 1.0
**Last Updated:** March 4, 2026
**Base URL:** https://app.ngumus-eye.site

---

## Issues to Fix

1. Profile page shows no avatar, no details (name, level, trust score)
2. Follower / Following count buttons do nothing when tapped
3. Feed: tapping a poster name does not navigate to their profile
4. Feed: images / videos not rendering (see STORAGE doc for that fix)

---

## 1. Profile Page — What to Fetch

### Query

```sql
SELECT
  id,
  display_name,
  full_name,
  avatar_url,
  trust_score,
  level,
  phone
FROM profiles
WHERE id = auth.uid();
```

### Column reference

| Column | Type | Notes |
|--------|------|-------|
| display_name | text | Show this first |
| full_name | text | Fallback if display_name is null |
| avatar_url | text | Full public URL (Vercel Blob). Use directly in Image src. |
| trust_score | int | Default 0 |
| level | int | Default 0 |
| phone | text | Optional, may be null |

### Avatar URL

`avatar_url` is a FULL public URL like:
`https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatars/...`

Use it directly:
```jsx
<Image source={{ uri: profile.avatar_url }} />
```

Do NOT pass it through Supabase Storage. Do NOT call `supabase.storage.getPublicUrl()` on it.

If `avatar_url` is null, show initials fallback using `display_name?.charAt(0)`.

---

## 2. Follower / Following Counts + Tap to Open Modal

### Fetch counts

```js
const [followersRes, followingRes] = await Promise.all([
  supabase
    .from('user_follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId),
  supabase
    .from('user_follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId),
])

const followersCount = followersRes.count ?? 0
const followingCount = followingRes.count ?? 0
```

### When Followers tapped — fetch the list

```js
async function getFollowers(userId) {
  const { data: follows } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('following_id', userId)

  const ids = follows.map(f => f.follower_id)
  if (ids.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, trust_score')
    .in('id', ids)

  return profiles
}
```

### When Following tapped — fetch the list

```js
async function getFollowing(userId) {
  const { data: follows } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId)

  const ids = follows.map(f => f.following_id)
  if (ids.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, trust_score')
    .in('id', ids)

  return profiles
}
```

Open a modal/sheet with the list. Each item shows avatar, display_name, trust_score.

---

## 3. Follow / Unfollow Actions

### Table: user_follows

| Column | Type |
|--------|------|
| id | uuid (auto) |
| follower_id | uuid — the person doing the following (current user) |
| following_id | uuid — the person being followed |
| created_at | timestamptz |

### Follow a user

```js
async function followUser(targetUserId) {
  const { error } = await supabase.from('user_follows').insert({
    follower_id: currentUser.id,
    following_id: targetUserId,
  })
  // error code 23505 = already following — handle gracefully
}
```

### Unfollow a user

```js
async function unfollowUser(targetUserId) {
  await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', currentUser.id)
    .eq('following_id', targetUserId)
}
```

### Check if current user already follows someone

```js
const { data } = await supabase
  .from('user_follows')
  .select('id')
  .eq('follower_id', currentUser.id)
  .eq('following_id', targetUserId)
  .maybeSingle()

const isFollowing = !!data
```

---

## 4. Feed — Tap Reporter Name → Navigate to Their Profile

Each incident on the feed has a `reporter` object (from the `profiles` join).

The reporter's `id` (UUID) is the profile ID.

When user taps the reporter name or avatar on a feed card, navigate to:
```
/profile/:reporterId
```

On that screen, fetch:
```js
// Profile data
const { data: profile } = await supabase
  .from('profiles')
  .select('id, display_name, full_name, avatar_url, trust_score, level')
  .eq('id', reporterId)
  .single()

// Their posts
const { data: incidents } = await supabase
  .from('incidents')
  .select('...')
  .eq('created_by', reporterId)
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false })

// Follow status
const { data: followRow } = await supabase
  .from('user_follows')
  .select('id')
  .eq('follower_id', currentUser.id)
  .eq('following_id', reporterId)
  .maybeSingle()

const isFollowing = !!followRow
```

Show the profile card (avatar, name, level, trust score, followers/following counts) and a Follow/Unfollow button (hide if viewing own profile).

---

## 5. Send Follow Notification

After a successful follow insert, also insert a notification:

```js
await supabase.from('notifications').insert({
  user_id: targetUserId,       // person being followed
  type: 'new_follower',
  metadata: { follower_id: currentUser.id },
  is_read: false,
})
```

---

## Summary Checklist

- [ ] `profiles.avatar_url` used directly as Image src (no Supabase Storage wrapper)
- [ ] `profiles.display_name` shown, fallback to `full_name`
- [ ] `profiles.trust_score` and `profiles.level` rendered
- [ ] Followers count from `user_follows` where `following_id = userId`
- [ ] Following count from `user_follows` where `follower_id = userId`
- [ ] Tapping Followers count opens modal with follower list
- [ ] Tapping Following count opens modal with following list
- [ ] Follow button inserts into `user_follows`
- [ ] Unfollow button deletes from `user_follows`
- [ ] Feed reporter name/avatar is tappable and navigates to `/profile/:id`
- [ ] Public profile screen shows avatar, name, level, trust score, counts, follow button
