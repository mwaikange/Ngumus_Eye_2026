# Page: /profile/[id]

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/profile/[id]/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Public profile view of another user (not the logged-in user).
- Shows their display name, avatar, verification level, trust score, public incident reports, follower counts.
- Allows the viewer to follow/unfollow the profile.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Any authenticated user** can view any other user's public profile (RLS: `profiles` is readable by all authenticated users).
- If `id` matches own user ID → redirects to `/profile` **TODO (unconfirmed — check page logic)**.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getProfile(id)` — `lib/actions/profile.ts` |
| Tables read | `profiles`, `incidents` (user's public reports) |
| Server Action | `getFollowCounts(id)` — `lib/actions/profile.ts` |
| Server Action | `isFollowing(targetId)` — `lib/actions/profile.ts` |
| Server Action | `toggleFollow(targetId)` — `lib/actions/profile.ts` |
| Tables read/written | `user_follows` |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Back button + display name |
| Avatar | Read-only profile picture |
| Display name | Read-only |
| Verification level badge | Visual badge |
| Trust score | Numeric display |
| Follow / Unfollow button | Toggle follow state |
| Follower / Following counts | Tappable |
| Incidents list | Public incidents reported by this user |

---

## 5) Actions

### Action: Follow / Unfollow
- **Location:** Follow button below avatar
- **Trigger:** Click
- **Preconditions:** Authenticated; cannot follow self
- **Request:** `toggleFollow(targetId)` — `lib/actions/profile.ts`
- **Database changes:**
  - Follow: insert into `user_follows { follower_id: auth.uid(), following_id: targetId, created_at }`
  - Unfollow: delete matching row
- **Side effects:** Follow counts update; notification to target user **TODO (unconfirmed)**
- **Success state:** Button toggles to "Unfollow" / "Follow"; count updates
- **Failure states:** Error toast

### Action: View Incident
- **Location:** Incidents list
- **Trigger:** Tap
- **Request:** Navigate to `/incident/[id]`

### Action: View Followers / Following
- **Location:** Count chips
- **Trigger:** Tap
- **Client-side:** Opens `FollowersDialog`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Data fetch |
| Not found | Invalid user ID → error state |
| Populated | Profile shown |
| Following | Follow button shows "Unfollow" |
| Not following | Follow button shows "Follow" |

---

## 7) Audit & Logging
- Follow/unfollow written to `user_follows` with timestamp.

---

## 8) Test Checklist (UAT)
- Given valid user ID → When visiting `/profile/[id]` → Then profile shown
- Given invalid ID → Then error/not-found state
- Given Follow clicked → Then user followed, button switches to Unfollow
- Given Unfollow clicked → Then user unfollowed, button switches to Follow
- Given own ID used → Then redirect to `/profile` **TODO (unconfirmed)**
