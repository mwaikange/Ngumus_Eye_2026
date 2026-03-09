# Page: /notifications

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/notifications/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Lists all notifications for the current user (comments on incidents, follow events, group approvals, etc.).
- Allows marking notifications as read.

---

## 2) Who Can Access It
- **Auth required:** Yes.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getNotifications()` — **TODO (unconfirmed — check `app/(app)/notifications/page.tsx`)** |
| Tables read | `user_notifications` (filtered by `user_id`, ordered by `created_at` desc) |
| Server Action | `markNotificationRead(id)` — **TODO (unconfirmed)** |
| Tables written | `user_notifications.read_at` |
| Realtime | **TODO (unconfirmed — check if Supabase Realtime is used for live badge update)** |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Title "Notifications" + "Mark all read" button |
| Notification list | Chronological list of notification items |
| Notification item | Icon, message, timestamp, unread indicator |
| Empty state | "No notifications yet" |

---

## 5) Actions

### Action: Tap Notification
- **Location:** Notification list item
- **Trigger:** Tap
- **Preconditions:** Authenticated
- **Request:** `markNotificationRead(id)` → updates `read_at`; then navigates to linked resource (incident, group, profile)
- **Database changes:** `user_notifications.read_at = now()`
- **Success state:** Notification marked read (visual indicator removed); navigate to target page

### Action: Mark All Read
- **Location:** "Mark all read" button in header
- **Trigger:** Click
- **Request:** `markAllNotificationsRead()` — **TODO (unconfirmed)**
- **Database changes:** All `user_notifications` rows for user updated with `read_at = now()`
- **Success state:** All unread indicators cleared

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Fetch in progress |
| Empty | No notifications |
| Populated | Notifications listed |
| All read | No unread indicators |

---

## 7) Audit & Logging
- `user_notifications` table schema defined in `scripts/053_create_user_notifications_table.sql`.
- `read_at` timestamp records when notification was viewed.

---

## 8) Test Checklist (UAT)
- Given user with notifications → When visiting `/notifications` → Then list shown
- Given no notifications → Then empty state shown
- Given notification tapped → Then marked read + navigate to linked page
- Given "Mark all read" tapped → Then all unread indicators cleared
