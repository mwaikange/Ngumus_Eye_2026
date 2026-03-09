# Page: /groups

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/groups/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Lists all community groups the user belongs to, and allows discovery of public groups to join.
- Entry point to group chat and management.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Subscription required:** No.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getUserGroups()` — `lib/actions/groups.ts` |
| Server Action | `getPublicGroups()` — `lib/actions/groups.ts` |
| Tables read | `groups`, `group_members` |
| Realtime | None |
| Storage | Group avatar images from Vercel Blob |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Title "Groups" |
| "My Groups" tab/section | Groups the user is a member of |
| "Discover" tab/section | Public groups the user has not joined |
| Group card | Group name, member count, avatar, description snippet |
| Create Group button | Navigates to `/groups/create` |
| Empty state | "You haven't joined any groups yet" |
| Loading skeleton | During fetch |

---

## 5) Actions

### Action: Open Group
- **Location:** Group card
- **Trigger:** Tap
- **Request:** Navigate to `/groups/[id]`

### Action: Join Group
- **Location:** "Join" button on Discover group cards
- **Trigger:** Tap
- **Preconditions:** Not already a member; group must be public or have open membership
- **Request:** `joinGroup(groupId)` — `lib/actions/groups.ts`
- **Database changes:**
  - If group `requires_approval = false`: insert into `group_members { group_id, user_id, role: "member", status: "active" }`
  - If group `requires_approval = true`: insert with `status: "pending"` into approval queue
- **Side effects:** If pending, admin notification created **TODO (unconfirmed — check notification trigger)**
- **Success state:** Group moves to "My Groups" tab; toast "Joined group" or "Request sent"
- **Failure states:** Already member → error; DB error → toast

### Action: Create Group
- **Location:** "Create Group" / "+" button
- **Trigger:** Click
- **Request:** Navigate to `/groups/create`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Fetching groups |
| My Groups empty | User not in any groups |
| Populated | Groups listed |
| Error | Fetch failed |

---

## 7) Audit & Logging
- `group_members` row created with `joined_at` timestamp on join.

---

## 8) Test Checklist (UAT)
- Given member of groups → When visiting `/groups` → Then "My Groups" list shown
- Given not in any groups → Then empty state shown
- Given "Discover" tab → Then public groups listed that user hasn't joined
- Given "Join" tapped on open group → Then user added, group moves to "My Groups"
- Given "Join" tapped on approval-required group → Then status "pending", toast "Request sent"
- Given group card tapped → Then navigate to `/groups/[id]`
