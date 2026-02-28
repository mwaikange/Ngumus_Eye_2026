# Page: /case-deck/support

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/case-deck/support/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** Yes

---

## 1) Purpose
- Counseling and support request interface for users who have been victims of crime.
- Allows users to submit a support request with category and description.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Subscription required:** Yes.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `createSupportRequest(formData)` — **TODO (unconfirmed — not found in `lib/actions/cases.ts`; check page directly)** |
| Tables written | **TODO (unconfirmed — check `app/(app)/case-deck/support/page.tsx`)** |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Back + "Counseling & Support" |
| Support type select | Category of support needed (trauma, legal, financial, etc.) |
| Description textarea | Description of what the user needs |
| Submit button | Submits support request |
| Confirmation state | Shown after submission |

---

## 5) Actions

### Action: Submit Support Request
- **Location:** Submit button
- **Trigger:** Click
- **Preconditions:** Authenticated + subscribed; description non-empty
- **Request:** **TODO (unconfirmed — inspect `app/(app)/case-deck/support/page.tsx`)**
- **Database changes:** **TODO (unconfirmed)**
- **Success state:** Confirmation message shown
- **Failure states:** Error toast on failure

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Default | Form shown |
| Submitting | Request in flight |
| Success | Confirmation shown |
| Error | Error toast |

---

## 7) Audit & Logging
- **TODO (unconfirmed)** — check support table and any notifications triggered.

---

## 8) Test Checklist (UAT)
- Given subscriber + filled form → When submitted → Then confirmation shown
- Given non-subscriber → Then redirect to `/subscribe`
- Given empty description → Then validation error
