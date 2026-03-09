# Page: /groups/create

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/groups/create/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Form to create a new community group.
- Sets group name, description, privacy (public/private), and approval requirements.

---

## 2) Who Can Access It
- **Auth required:** Yes.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `createGroup(formData)` — `lib/actions/groups.ts` |
| Tables written | `groups`, `group_members` |
| Storage | Group avatar via `POST /api/upload` (optional) |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Back + "Create Group" |
| Group name field | Required text input |
| Description textarea | Optional group description |
| Privacy toggle | Public / Private |
| Requires approval toggle | Whether join requests need admin approval |
| Avatar upload | Optional group image |
| Create button | Submits form |

---

## 5) Actions

### Action: Create Group
- **Location:** "Create Group" button
- **Trigger:** Click
- **Preconditions:** Authenticated; name non-empty
- **Client-side validation:** Name required; max length
- **Request:** `createGroup({ name, description, is_private, requires_approval, avatar_url? })` — `lib/actions/groups.ts`
- **Database changes:**
  - Insert into `groups { name, description, is_private, requires_approval, created_by, avatar_url, created_at }`
  - Insert into `group_members { group_id, user_id, role: "admin", status: "active" }` (creator becomes admin)
- **Success state:** Navigate to `/groups/[newId]`; toast "Group created"
- **Failure states:** Duplicate name → error; server error → toast

### Action: Upload Avatar
- **Location:** Avatar upload section
- **Trigger:** File picker
- **Request:** `POST /api/upload` → Vercel Blob → URL stored in form state
- **Success state:** Avatar preview shown

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Default | Empty form |
| Submitting | Request in flight |
| Success | Redirect to group detail |
| Error | Validation or server error |

---

## 7) Audit & Logging
- `groups` row created with `created_by` = `auth.uid()` and `created_at`.

---

## 8) Test Checklist (UAT)
- Given filled form → When create clicked → Then group created, navigate to group detail
- Given missing name → Then validation error
- Given avatar uploaded → Then preview shown, URL attached on submit
- Given private toggle on → Then `is_private = true` in DB
