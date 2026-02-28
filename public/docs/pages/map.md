# Page: /map

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/map/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Visual map showing georeferenced incident reports as pins/markers.
- Allows users to browse incidents by location and see incident density.
- Tapping a pin navigates to that incident's detail page.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Subscription required:** No.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getIncidentsForMap()` — `lib/actions/incidents.ts` |
| Tables read | `incidents` (columns: `id`, `title`, `category`, `latitude`, `longitude`, `geohash`, `verification_level`) |
| Browser API | `navigator.geolocation` to center map on user's position |
| Realtime | None |
| External | Leaflet.js or similar map library **TODO (unconfirmed — check `app/(app)/map/page.tsx` imports)** |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Title "Map" |
| Map canvas | Full-screen interactive map |
| Incident pins | Colored markers per category on map |
| Pin popup | Tapping pin shows incident title + category chip |
| "View Incident" button | Inside popup, navigates to `/incident/[id]` |
| Location button | Centers map on user's current GPS position |
| Category filter | Filter which incident types are shown on map |
| Empty state | "No incidents in this area" if no pins visible |

---

## 5) Actions

### Action: Pan / Zoom Map
- **Location:** Map canvas
- **Trigger:** Touch drag / pinch-zoom / mouse wheel
- **Client-side:** Native map library interaction; no server requests triggered
- **Database changes:** None

### Action: Tap Incident Pin
- **Location:** Incident marker on map
- **Trigger:** Tap/click
- **Client-side:** Opens popup with incident summary
- **Database changes:** None

### Action: View Incident from Popup
- **Location:** "View Incident" button inside pin popup
- **Trigger:** Click
- **Request:** Client-side navigation to `/incident/[id]`

### Action: Center on My Location
- **Location:** Location button (bottom right or top right of map)
- **Trigger:** Click
- **Preconditions:** Browser geolocation permission
- **Client-side:** `navigator.geolocation.getCurrentPosition()` → map centers on coordinates
- **Failure states:** Permission denied → error toast; GPS timeout → no action

### Action: Filter by Category
- **Location:** Filter chips above/below map
- **Trigger:** Tap chip
- **Client-side:** Hides/shows pins by category; no server re-fetch (filtered client-side from loaded data)
- **Database changes:** None

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Incidents being fetched |
| Rendered | Map shown with pins |
| Empty | No incidents with coordinates |
| Error | Server fetch failed |

---

## 7) Audit & Logging
- No logging on map view actions.
- Geolocation only used client-side, not persisted.

---

## 8) Test Checklist (UAT)
- Given incidents with lat/lng in DB → When map loads → Then pins shown at correct positions
- Given pin tapped → Then popup with incident title shown
- Given "View Incident" in popup tapped → Then navigate to `/incident/[id]`
- Given "My Location" tapped + permission granted → Then map centers on user
- Given "My Location" tapped + permission denied → Then error toast
- Given category filter applied → Then only matching pins visible
- Given unauthenticated user → Then redirect to login
