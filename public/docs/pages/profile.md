# Page: /profile

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/profile/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- The current user's own profile page.
- Shows personal info, verification level, trust score, incident history, follower/following counts.
- Allows editing display name, avatar, and logging out.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Own profile only** — `/profile` always shows the logged-in user's profile.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getProfile(userId)` — `lib/actions/profile.ts` |
| Tables read | `profiles`, `incidents` (user's reports), `user_follows` |
| Server Action | `updateProfile(formData)` — `lib/actions/profile.ts` |
| Server Action | `getFollowCounts(userId)` — `lib/actions/profile.ts` |
| Tables read | `user_follows` |
| Storage | Avatar via `POST /api/upload` (Vercel Blob) |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Title "Profile" + settings/logout |
| Avatar | Profile picture with edit overlay |
| Display name | Name + edit pencil icon |
| Verification level badge | Level 0–3 visual badge |
| Trust score | Numeric trust score |
| Follower/Following counts | Tappable → opens `FollowersDialog` |
| Subscription status | Active plan badge or "Subscribe" prompt |
| My Incidents | List of user's own reported incidents |
| Logout button | Signs out and redirects to login |

---

## 5) Actions

### Action: Edit Display Name
- **Location:** Display name + pencil icon, or via `SetDisplayNameDialog`
- **Trigger:** Click pencil → dialog opens → type new name → save
- **Preconditions:** Authenticated
- **Client-side validation:** Non-empty; max 50 chars
- **Request:** `updateProfile({ display_name })` — `lib/actions/profile.ts`
- **Database changes:** `profiles.display_name` updated
- **Success state:** Name updates on profile; dialog closes
- **Failure states:** Error toast

### Action: Upload Avatar
- **Location:** Avatar circle — tap/click to change
- **Trigger:** File picker (via `AvatarUpload` component)
- **Preconditions:** Authenticated; image file
- **Request:** `POST /api/upload` → Vercel Blob → `updateProfile({ avatar_url })`
- **Database changes:** `profiles.avatar_url` updated
- **Success state:** New avatar displayed
- **Failure states:** Upload error toast

### Action: View Followers / Following
- **Location:** Follower/Following count chips
- **Trigger:** Tap
- **Client-side:** Opens `FollowersDialog` (`components/followers-dialog.tsx`)
- **Request:** `getFollowers(userId)` or `getFollowing(userId)` — `lib/actions/profile.ts`
- **Database changes:** None

### Action: Logout
- **Location:** Logout button / settings
- **Trigger:** Click → confirm (optional)
- **Request:** POST to `/auth/signout` route
- **Database changes:** Supabase session invalidated
- **Success state:** Redirect to `/auth/login`

### Action: View Own Incident
- **Location:** "My Incidents" list
- **Trigger:** Tap
- **Request:** Navigate to `/incident/[id]`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Data fetch |
| Populated | Profile shown |
| Editing | Name/avatar edit dialog open |
| Error | Fetch or update failed |

---

## 7) Audit & Logging
- Profile updates recorded in `profiles.updated_at`.
- Avatar stored in Vercel Blob; old avatar **TODO (unconfirmed — check if old blob is deleted on update)**.

---

## 8) Test Checklist (UAT)
- Given authenticated user → When visiting `/profile` → Then own profile shown
- Given display name edit → When saved → Then new name shown on profile
- Given avatar uploaded → Then new avatar displayed
- Given followers tapped → Then FollowersDialog opens with follower list
- Given logout clicked → Then session ended, redirect to login
- Given my incident tapped → Then navigate to `/incident/[id]`
