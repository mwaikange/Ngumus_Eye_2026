# Page: /incident/[id]

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/incident/[id]/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Full detail view of a single incident report.
- Shows media (images/video), location, reporter info, verification status.
- Allows reactions (helpful/not helpful/verified) and comments.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Ownership:** Any authenticated user can view any incident; edit/delete restricted to owner or admin.
- **Enforcement:** Server-side query with RLS on `incidents` table.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getIncident(id)` — `lib/actions/incidents.ts` |
| Tables read | `incidents`, `profiles` (reporter), `incident_media` |
| Server Action | `getComments(incidentId)` — `lib/actions/comments.ts` |
| Tables read | `comments`, `profiles` (commenter) |
| Server Action | `getUserReaction(incidentId)` — `lib/actions/incidents.ts` |
| Tables read | `incident_reactions` |
| Realtime | None (static render; comments reload on submit) |
| Storage | Vercel Blob — media URLs stored in `incident_media.url` |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Back button + incident title |
| Media gallery | Images/video from `incident_media` (`components/media-gallery.tsx`) |
| Incident details | Category, type, date, location (address/town), description |
| Reporter info | Reporter avatar, display name, verification level badge |
| Verification badge | Shows incident verification level 0–3 |
| ReactionButtons | Helpful / Not Helpful / Verified buttons (`components/reaction-buttons.tsx`) |
| CommentSection | Comment list + add comment form (`components/comment-section.tsx`) |
| Delete button | Shown only to incident owner or admin |

---

## 5) Actions

### Action: React to Incident
- **Location:** ReactionButtons row below incident details
- **Trigger:** Tap reaction button (Helpful / Not Helpful / Verified)
- **Preconditions:** User must be authenticated; cannot react to own incident (**TODO: unconfirmed — check `reaction-buttons.tsx`**)
- **Client-side validation:** Button highlights current user's reaction
- **Request:** `toggleReaction(incidentId, reactionType)` — `lib/actions/incidents.ts`
- **Database changes:**
  - If no existing reaction → insert into `incident_reactions { incident_id, user_id, type }`
  - If same reaction → delete row (toggle off)
  - If different reaction → update `type`
  - `incidents.helpful_count` / `not_helpful_count` / `verified_count` updated via DB trigger
- **Side effects:** Incident verification level may change if `verified_count` reaches threshold (DB function)
- **Success state:** Button count updates immediately (optimistic UI)
- **Failure states:** Error toast shown; count reverts

### Action: Post Comment
- **Location:** CommentSection — text input at bottom
- **Trigger:** Submit button or Enter
- **Preconditions:** Authenticated; comment text non-empty (max 500 chars)
- **Client-side validation:** Non-empty, length check
- **Request:** `addComment({ incidentId, content, imageUrl? })` — `lib/actions/comments.ts`
- **Database changes:** Insert into `comments { incident_id, user_id, content, image_url, created_at }`
- **Side effects:** `incidents.comment_count` incremented; notification created for incident owner
- **Success state:** Comment appears in list; input cleared
- **Failure states:** Error toast; comment not added

### Action: Upload Comment Image
- **Location:** Camera/image icon in comment input
- **Trigger:** File picker select
- **Preconditions:** Authenticated; file must be image type; max size enforced
- **Request:** POST `/api/upload` with image file → returns Vercel Blob URL
- **Database changes:** URL stored with comment on submit
- **Success state:** Image preview shown in comment input
- **Failure states:** Upload failed → error toast; image removed from preview

### Action: Delete Incident
- **Location:** Overflow menu or delete button (owner/admin only)
- **Trigger:** Click → confirmation dialog → confirm
- **Preconditions:** Must be incident owner OR admin (`profiles.is_admin = true`)
- **Request:** `deleteIncident(id)` — `lib/actions/incidents.ts`
- **Database changes:** `incidents` row deleted (cascades to `incident_media`, `comments`, `incident_reactions`)
- **Success state:** Navigate back to `/feed`; toast "Incident deleted"
- **Failure states:** Permission denied → error toast

### Action: Delete Comment
- **Location:** Comment item — shown to comment owner or admin
- **Trigger:** Click delete icon → confirm
- **Preconditions:** Must own comment or be admin
- **Request:** `deleteComment(commentId)` — `lib/actions/comments.ts`
- **Database changes:** `comments` row deleted; `incidents.comment_count` decremented
- **Success state:** Comment removed from list
- **Failure states:** Error toast

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Server render / skeleton shown |
| Populated | Incident data loaded |
| Not found | Incident ID invalid or deleted → 404 or redirect |
| Error | Server action failed |

---

## 7) Audit & Logging
- Reactions written to `incident_reactions` table (full history).
- Comments written to `comments` table with `created_at` timestamp.
- Verification level changes logged **TODO (unconfirmed)** — check `scripts/009_fix_rls_and_add_verification_system.sql`.

---

## 8) Test Checklist (UAT)
- Given valid incident ID → When visiting page → Then full incident detail rendered
- Given invalid ID → Then 404/error state shown
- Given authenticated user → When clicking Helpful → Then count increments
- Given user already reacted Helpful → When clicking Helpful again → Then reaction removed (toggle)
- Given user clicks different reaction → Then reaction type changes
- Given comment text entered → When submitted → Then comment appears in list
- Given incident owner → When delete clicked → Then incident deleted, redirected to feed
- Given non-owner → Then delete button not visible
