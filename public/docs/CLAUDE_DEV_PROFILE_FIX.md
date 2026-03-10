# Ngumus Eye — Profile Screens Fix Guide for Claude Dev
**Date:** March 2026  
**Reference web app:** https://app.ngumus-eye.site  
**Screens affected:** `PublicProfileScreen` and `ProfileScreen`

---

## SCREEN DEFINITIONS

| Screen | Route | Purpose |
|--------|-------|---------|
| `ProfileScreen` | `/profile` tab | The logged-in user's OWN profile. Shows subscription, edit name, avatar upload, Case Deck button, sign out. |
| `PublicProfileScreen` | `navigation.navigate('PublicProfile', { userId })` | Any OTHER user's profile. Shows their avatar, name, level, trust score, followers/following counts, follow button, and posts. |

These are two completely separate screens with different data sources. Do NOT mix them up.

---

## ISSUE 1 — PublicProfileScreen shows "User not found" (CRITICAL)

### What is happening
`userApi.getPublicProfile(userId)` is returning `null` or an error, so the screen falls through to the "User not found" state.

### Root cause to check — in this order

**A. The `userId` param is not being passed or received correctly**

In the web app, the URL is `/profile/9f42400a-fc3d-4758-aaac-deaf79a2c7ea` — a full UUID.

Check what value is actually being passed when navigating:
```js
// Add this log temporarily to PublicProfileScreen
console.log('[debug] PublicProfileScreen userId param:', userId);
```
If `userId` is `undefined`, `null`, or an empty string, the query will return nothing. Fix the navigation call at the source (feed card, followers modal, etc.) to pass the correct UUID.

**B. `userApi.getPublicProfile` is calling the wrong Supabase table or column**

The web app queries:
```js
supabase
  .from('profiles')
  .select('id, display_name, full_name, avatar_url, trust_score, level')
  .eq('id', userId)   // ← userId must be the UUID from auth.users
  .single()
```

Verify your `getPublicProfile` function uses `.eq('id', userId)` NOT `.eq('user_id', userId)` — the `profiles` table primary key IS the user's UUID (it equals `auth.users.id`).

**C. Row Level Security (RLS) is blocking the query**

The mobile app may be querying `profiles` without an authenticated session, or as a different user, and RLS is blocking the read. The `profiles` table should have a public read policy. Verify by running this directly in Supabase SQL editor:
```sql
SELECT id, display_name, avatar_url, trust_score, level 
FROM profiles 
WHERE id = '<the-uuid-you-are-testing>';
```
If that returns a row but the mobile query returns null, RLS is the culprit.

### What the correct `getPublicProfile` function must return

The function must return an object in this exact shape (matching what `PublicProfileScreen` expects):
```ts
{
  id: string,
  displayName: string,        // from profiles.display_name
  avatarUrl: string | null,   // from profiles.avatar_url — full Vercel Blob URL, use directly
  trustScore: number,         // from profiles.trust_score, default 0
  level: number,              // from profiles.level, default 0
  town: string,               // from profiles.town, default ''
  bio: string,                // from profiles.bio, default ''
  followers: number,          // COUNT from user_follows WHERE following_id = userId
  following: number,          // COUNT from user_follows WHERE follower_id = userId
  isFollowing: boolean,       // does user_follows row exist WHERE follower_id=currentUser AND following_id=userId
  isOwnProfile: boolean,      // userId === currentUser.id
}
```

### Complete correct implementation

```js
async function getPublicProfile(targetUserId) {
  // 1. Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 2. Fetch target profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, avatar_url, trust_score, level, town, bio')
    .eq('id', targetUserId)
    .maybeSingle(); // use maybeSingle() not single() — single() throws if no row

  if (error) {
    console.error('[debug] getPublicProfile error:', error);
    return { data: null };
  }
  if (!profile) {
    console.error('[debug] getPublicProfile: no profile for id:', targetUserId);
    return { data: null };
  }

  // 3. Get follow counts and follow status in parallel
  const [followersRes, followingRes, isFollowingRes] = await Promise.all([
    supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', targetUserId),
    supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', targetUserId),
    currentUser
      ? supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    data: {
      id: profile.id,
      displayName: profile.display_name || profile.full_name || 'Anonymous',
      avatarUrl: profile.avatar_url || null,
      trustScore: profile.trust_score || 0,
      level: profile.level || 0,
      town: profile.town || '',
      bio: profile.bio || '',
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
      isFollowing: !!isFollowingRes?.data,
      isOwnProfile: currentUser?.id === targetUserId,
    },
  };
}
```

---

## ISSUE 2 — ProfileScreen avatar not showing after upload / name change not reflected

### What the web app does
- `avatar_url` in `profiles` is a **full Vercel Blob URL** e.g. `https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatars/...`
- After upload, `profiles.avatar_url` is updated in Supabase with that full URL.
- After any change (name, avatar), the web app re-fetches the profile.

### What to check on mobile

**A. Avatar upload stores the URL correctly**

After calling `POST https://app.ngumus-eye.site/api/upload`, the response is:
```json
{ "url": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatars/..." }
```
That `url` must be saved to `profiles.avatar_url`:
```js
const uploadRes = await uploadToServer(imageUri); // returns { url: '...' }
await supabase
  .from('profiles')
  .update({ avatar_url: uploadRes.url })
  .eq('id', currentUser.id);
```
Do NOT pass it through `supabase.storage.getPublicUrl()`. The URL is already public.

**B. After save, re-fetch the profile**

The `ProfileScreen` already calls `fetchUser()` after `updateAvatar()` — make sure `userApi.getProfile()` re-queries Supabase and does NOT return a cached version. If using a cache layer, bust it after any profile update.

**C. `Image` component cache issue on Android**

If the URL changes but the same image appears, add a cache-busting timestamp to force reload:
```js
<Image
  source={{ uri: `${displayUser.avatarUrl}?t=${Date.now()}` }}
  style={styles.avatarImage}
/>
```
Only do this after an upload — not on every render (or it will re-fetch on every scroll).

---

## ISSUE 3 — ProfileScreen followers/following count mismatch with web

### What the web app queries
```js
// Followers = rows in user_follows WHERE following_id = currentUser.id
// Following = rows in user_follows WHERE follower_id = currentUser.id
```

### What to verify in `userApi.getProfile()`

The `User` object returned must include `followers` and `following` as counts. Confirm the API function does this:
```js
const [followersRes, followingRes] = await Promise.all([
  supabase
    .from('user_follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId),    // people following ME
  supabase
    .from('user_follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId),     // people I follow
]);

// Then include in the returned user object:
followers: followersRes.count || 0,
following: followingRes.count || 0,
```

**Common mistake:** swapping `follower_id` and `following_id`. Double-check:
- `following_id = userId` → counts people who follow YOU (your followers)
- `follower_id = userId` → counts people YOU follow (your following)

---

## ISSUE 4 — Trust score shows 0 on ProfileScreen even when it should be higher

The `trust_score` column is on the `profiles` table. Verify `userApi.getProfile()` selects it:
```js
supabase.from('profiles').select('*, trust_score').eq('id', userId).single()
```
If using `select('*')` it should already be included. Check the `User` type definition — if `trustScore` is mapped from `trust_score`, make sure the mapping is correct:
```js
// In the API response mapping:
trustScore: data.trust_score || 0,
```

---

## ISSUE 5 — Name change updates on feed but not on ProfileScreen

The web app calls `revalidatePath('/profile')` and `revalidatePath('/feed')` after updating `display_name`. On mobile, after `updateDisplayName` succeeds:

1. Call `fetchUser()` immediately to re-fetch the profile from Supabase.
2. Make sure `userApi.updateDisplayName` actually commits to `profiles.display_name`:
```js
await supabase
  .from('profiles')
  .update({ display_name: newName.trim() })
  .eq('id', currentUser.id);
```
3. The feed shows the updated name because feed cards fetch `profiles.display_name` fresh on each load. The ProfileScreen only updates if you call `fetchUser()` after save — which the current code does. If it's still not updating, the issue is that `userApi.getProfile()` is returning stale data from a cache or the update query is failing silently.

---

## QUICK CHECKLIST

### PublicProfileScreen
- [ ] Log `userId` param on screen mount — confirm it is a valid UUID, not null/undefined
- [ ] Use `.maybeSingle()` not `.single()` in `getPublicProfile`
- [ ] Query `profiles` table with `.eq('id', userId)` — NOT `.eq('user_id', userId)`
- [ ] Return `displayName`, `avatarUrl`, `trustScore`, `level`, `followers`, `following`, `isFollowing`, `isOwnProfile`
- [ ] `avatarUrl` used directly as `Image source={{ uri: ... }}` — no Supabase storage wrapper

### ProfileScreen  
- [ ] `followers` count = `user_follows` WHERE `following_id = currentUser.id`
- [ ] `following` count = `user_follows` WHERE `follower_id = currentUser.id`
- [ ] After avatar upload, save full Vercel Blob URL to `profiles.avatar_url`
- [ ] After any profile update, call `fetchUser()` to refresh state
- [ ] `trust_score` fetched from `profiles` table, mapped to `trustScore` in User type
