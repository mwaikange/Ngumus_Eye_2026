# Page: /search

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/search/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Search across incidents and user profiles simultaneously.
- Returns matching incidents and users based on text query.

---

## 2) Who Can Access It
- **Auth required:** Yes.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `searchIncidents(query)` — `lib/actions/incidents.ts` |
| Tables read | `incidents` (ILIKE on `title`, `description`) |
| Server Action | `searchUsers(query)` — `lib/actions/profile.ts` |
| Tables read | `profiles` (ILIKE on `display_name`, `full_name`) |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Title "Search" |
| Search bar | Full-width text input with debounce |
| "Incidents" results section | Matching `IncidentCard` list |
| "Users" results section | Matching user profile cards |
| Empty state | "No results for …" |
| Loading state | Skeleton while fetching |

---

## 5) Actions

### Action: Search
- **Location:** Search bar at top
- **Trigger:** Text input (debounced ~300ms) or submit
- **Preconditions:** Query string non-empty (min 2 chars)
- **Client-side:** Debounced; updates URL `?q=<query>`
- **Request:** Parallel: `searchIncidents(query)` + `searchUsers(query)`
- **Database changes:** None
- **Success state:** Results shown in two sections
- **Failure states:** Error toast; empty state shown

### Action: Open Incident Result
- **Location:** Incident result card
- **Trigger:** Tap
- **Request:** Navigate to `/incident/[id]`

### Action: Open User Result
- **Location:** User result card
- **Trigger:** Tap
- **Request:** Navigate to `/profile/[id]`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Idle | No search query |
| Loading | Debounce + fetch in progress |
| Results | Incidents and/or users found |
| Empty | No matches |
| Error | Fetch failed |

---

## 7) Audit & Logging
- No search queries logged to DB.

---

## 8) Test Checklist (UAT)
- Given search term typed → When debounce fires → Then matching incidents + users shown
- Given no matches → Then empty state shown
- Given incident result tapped → Then navigate to `/incident/[id]`
- Given user result tapped → Then navigate to `/profile/[id]`
- Given 1-char query → Then no search fired (min 2 chars)
