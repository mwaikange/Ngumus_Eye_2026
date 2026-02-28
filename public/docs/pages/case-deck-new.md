# Page: /case-deck/new

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/case-deck/new/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** Yes

---

## 1) Purpose
- Form to create a new investigation file (case).
- Collects title, category, priority, description, suspect information, and location.
- Generates a unique case number on creation.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Subscription required:** Yes — enforced in `app/(app)/case-deck/page.tsx` parent layout check and in `createCase` server action.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `createCase(formData)` — `lib/actions/cases.ts` |
| Tables written | `cases` |
| Realtime | None |
| Storage | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Back button + "New File" |
| Title field | Text input for file title |
| Category select | Dropdown: theft, assault, fraud, missing_person, vandalism, cybercrime, other |
| Priority select | Dropdown: low, medium, high, critical |
| Description textarea | Detailed description of the investigation |
| Suspect info textarea | Optional — suspect description/details |
| Location fields | Optional — address details |
| Submit button | "Open File" / "Create File" |
| Cancel/Back | Returns to `/case-deck` |

---

## 5) Actions

### Action: Create File
- **Location:** "Open File" submit button
- **Trigger:** Click or form submit
- **Preconditions:** User authenticated + active subscription
- **Client-side validation:**
  - Title: required, non-empty
  - Category: required
  - Description: required, non-empty
- **Server-side validation:** Checks auth + subscription in server action
- **Request:** `createCase(formData)` — `lib/actions/cases.ts`
- **Database changes:**
  - Insert into `cases { user_id, title, category, priority, description, suspect_info, location, status: "new", created_at }`
  - `case_number` auto-generated (e.g. `CASE-2026-XXXX`) via DB default or trigger (`scripts/034_fix_case_number_unique_constraint.sql`)
- **Side effects:** None
- **Success state:** Navigate to `/case-deck/[newId]`; toast "File created"
- **Failure states:**
  - Missing required fields → validation error
  - Not subscribed → error toast
  - DB error → error toast

### Action: Cancel
- **Location:** Back button or Cancel link
- **Trigger:** Click
- **Request:** Navigate back to `/case-deck`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Default | Empty form |
| Submitting | Request in flight, button disabled |
| Success | Redirect to new file detail |
| Error | Validation or server error |

---

## 7) Audit & Logging
- New `cases` row with `user_id` and `created_at` timestamp.

---

## 8) Test Checklist (UAT)
- Given subscriber → When filling all required fields → Then file created, navigate to detail
- Given missing title → When submit clicked → Then validation error shown
- Given non-subscriber → When submit attempted → Then error shown
- Given valid form → Then `case_number` auto-assigned and unique
