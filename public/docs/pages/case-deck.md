# Page: /case-deck

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/case-deck/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** Yes

---

## 1) Purpose
- Private investigator-style dashboard for managing personal investigation files (formerly "cases").
- Displays stats: active files count, new, in-progress, closed.
- Lists all user's files with status badges.
- Quick-access cards for Device Tracking, Support, and Open New File.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Subscription required:** Yes — checks `user_subscriptions` for active, non-expired subscription. Redirects to `/subscribe` if none found.
- **Enforcement:** Server-side in `app/(app)/case-deck/page.tsx` after auth check.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getUserCases()` — `lib/actions/cases.ts` |
| Tables read | `cases` (filtered by `user_id`) |
| Tables read | `user_subscriptions` (to verify active subscription) |
| Realtime | None |
| Storage | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Title "My File Deck" |
| Page header | "My File Deck" h1 + "Private investigator dashboard" subtitle + "New File" button |
| Stats cards | Active Files / New / In Progress / Closed counts |
| Active Files list | Grid of `FileCard` components for non-closed files |
| Empty state | "No active files — Open a new file to get started" + button |
| Closed Files list | Grid of `FileCard` components for closed/archived files |
| Quick Actions | Device Tracking, Counseling & Support, Open New File cards |

---

## 5) Actions

### Action: Open New File
- **Location:** "New File" button top-right + "Open New File" quick action card + empty state button
- **Trigger:** Click
- **Request:** Navigate to `/case-deck/new`

### Action: Open File Detail
- **Location:** FileCard (anywhere on card)
- **Trigger:** Tap
- **Request:** Navigate to `/case-deck/[id]`

### Action: Go to Device Tracking
- **Location:** "Device Tracking" quick action card
- **Trigger:** Tap
- **Request:** Navigate to `/case-deck/devices`

### Action: Go to Support
- **Location:** "Counseling & Support" quick action card
- **Trigger:** Tap
- **Request:** Navigate to `/case-deck/support`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Server render in progress |
| No subscription | Redirect to `/subscribe` |
| Empty | User has no files |
| Populated | Files listed |

---

## 7) Audit & Logging
- No explicit logging on this page — file creation logged on `/case-deck/new`.

---

## 8) Test Checklist (UAT)
- Given subscriber with files → When visiting `/case-deck` → Then files listed with correct status badges
- Given subscriber with no files → Then empty state shown with "Open New File" button
- Given non-subscriber → Then redirect to `/subscribe`
- Given unauthenticated user → Then redirect to `/auth/login`
- Given "New File" button clicked → Then navigate to `/case-deck/new`
- Given file card tapped → Then navigate to `/case-deck/[id]`
