# Page: /feed

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/feed/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Main home screen showing a reverse-chronological list of community incident reports.
- Supports filtering by incident type/category and keyword search.
- Interleaves sponsored Ad Cards from active advertisers.

---

## 2) Who Can Access It
- **Auth required:** Yes — enforced by `app/(app)/layout.tsx`.
- **Subscription required:** No — all authenticated users see the feed.
- **Enforcement:** Server-side `supabase.auth.getUser()` in layout; middleware keeps session fresh.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getIncidents({ category?, search?, limit?, offset? })` — `lib/actions/incidents.ts` |
| Tables read | `incidents`, `profiles` (via join for reporter name/avatar) |
| Server Action | `getActiveAds()` — `lib/actions/ads.ts` |
| Tables read | `ads` (where `active = true`) |
| Server Action | `getUserDisplayName()` — `lib/actions/profile.ts` |
| Realtime | None (server-rendered, no live updates on feed) |
| Storage | Incident media URLs from Vercel Blob |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Title "Feed" + notification bell |
| FeedFilters | Category chips + search bar (`components/feed-filters.tsx`) |
| Incident list | Scrollable list of `IncidentCard` components |
| AdCard | Sponsored ad card interleaved every N incidents (`components/ad-card.tsx`) |
| Empty state | "No incidents found" when list is empty |
| Loading skeleton | Shown during initial server render / client navigation |

---

## 5) Actions

### Action: Filter by Category
- **Location:** FeedFilters chip row below header
- **Trigger:** Tap category chip
- **Preconditions:** None
- **Client-side:** Updates URL search param `?category=<value>`; page re-renders server-side
- **Request:** Server re-fetches `getIncidents({ category })` with selected category
- **Database changes:** None
- **Success state:** Feed list filtered to selected category
- **Failure states:** Network error → skeleton stays, error toast shown
- **Edge cases:** "All" chip clears category filter

### Action: Search
- **Location:** Search bar in FeedFilters
- **Trigger:** Text input (debounced) or submit
- **Preconditions:** None
- **Client-side:** Updates URL search param `?search=<term>`
- **Request:** Server re-fetches `getIncidents({ search })` — queries `incidents.title ILIKE` and `incidents.description ILIKE`
- **Database changes:** None
- **Success state:** Feed filtered to matching incidents
- **Failure states:** No results → empty state shown

### Action: Open Incident Detail
- **Location:** Tap anywhere on an `IncidentCard`
- **Trigger:** Click/tap
- **Request:** Client-side navigation to `/incident/[id]`
- **Database changes:** None

### Action: View Ad
- **Location:** AdCard in feed
- **Trigger:** Tap
- **Request:** `recordAdView(adId)` server action → inserts row into `ad_views` table
- **Database changes:** `ad_views` — new row `{ ad_id, user_id, viewed_at }`
- **Success state:** Ad detail/URL opens (if link present)

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Server render in progress |
| Populated | Incidents loaded and displayed |
| Filtered | Category or search applied |
| Empty | No matching incidents |
| Error | Server action failed |

---

## 7) Audit & Logging
- Ad views logged to `ad_views` table.
- No explicit incident view tracking on the feed (only on detail page).

---

## 8) Test Checklist (UAT)
- Given authenticated user → When visiting `/feed` → Then incident list rendered
- Given category chip tapped → When selected → Then feed filtered to that category
- Given search term entered → When typed → Then feed filtered to matching incidents
- Given no matching incidents → Then empty state shown
- Given incident card tapped → Then navigate to `/incident/[id]`
- Given active ad in database → Then AdCard appears in feed at correct interval
- Given unauthenticated user → When visiting `/feed` → Then redirect to `/auth/login`
