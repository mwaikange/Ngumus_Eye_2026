# Page: /case-deck/[id]

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/case-deck/[id]/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** Yes

---

## 1) Purpose
- Full detail view for a single investigation file.
- Shows case metadata, status, timeline of events, and uploaded evidence.
- Allows updating status, adding timeline notes, uploading evidence media.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Ownership required:** Only the file owner can view it (RLS on `cases` table: `user_id = auth.uid()`).
- **Subscription required:** Yes.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getCase(id)` — `lib/actions/cases.ts` |
| Tables read | `cases`, `case_evidence`, `case_timeline` |
| Server Action | `updateCaseStatus(id, status)` — `lib/actions/cases.ts` |
| Server Action | `addTimelineEntry(caseId, note)` — `lib/actions/cases.ts` |
| API Route | `POST /api/upload` — Vercel Blob for evidence |
| Tables written | `cases`, `case_evidence`, `case_timeline` |
| Realtime | None |
| Storage | Vercel Blob for evidence files |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Back button + case number |
| File header | Title, category badge, priority badge, status badge |
| Status selector | Dropdown to change file status |
| Description | Full description text |
| Suspect info | If present |
| Location | If present |
| CaseTimeline | Chronological event log (`components/case-timeline.tsx`) |
| Add Note form | Textarea + button to add timeline entry |
| CaseEvidenceUpload | Evidence media uploader (`components/case-evidence-upload.tsx`) |
| Evidence gallery | Grid of uploaded evidence images/videos |

---

## 5) Actions

### Action: Update Status
- **Location:** Status dropdown in file header
- **Trigger:** Select new status
- **Preconditions:** Must be file owner
- **Client-side:** Optimistic update of badge
- **Request:** `updateCaseStatus(id, status)` — `lib/actions/cases.ts`
- **Database changes:** `cases.status` updated; `cases.updated_at` refreshed
- **Valid status values:** `new` → `assigned` → `in_progress` → `closed` → `archived`
- **Success state:** Status badge updates
- **Failure states:** Error toast; status reverts

### Action: Add Timeline Note
- **Location:** "Add Note" form in CaseTimeline section
- **Trigger:** Submit button
- **Preconditions:** Non-empty note text; file owner
- **Request:** `addTimelineEntry(caseId, { note, type: "note" })` — `lib/actions/cases.ts`
- **Database changes:** Insert into `case_timeline { case_id, user_id, note, type, created_at }`
- **Success state:** Note appears in timeline
- **Failure states:** Error toast

### Action: Upload Evidence
- **Location:** CaseEvidenceUpload component
- **Trigger:** File picker
- **Preconditions:** File owner; image or video file
- **Request:** `POST /api/upload` → Vercel Blob → `addEvidence(caseId, url, type)` — `lib/actions/cases.ts`
- **Database changes:** Insert into `case_evidence { case_id, url, type, uploaded_at }`
- **Success state:** Evidence appears in gallery
- **Failure states:** Upload error → toast; file not added

### Action: Delete Evidence
- **Location:** Evidence gallery item — delete icon
- **Trigger:** Click → confirm
- **Preconditions:** File owner
- **Request:** `deleteEvidence(evidenceId)` — `lib/actions/cases.ts`
- **Database changes:** `case_evidence` row deleted; Vercel Blob file deleted **TODO (unconfirmed — check if blob deletion is implemented)**
- **Success state:** Evidence removed from gallery

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Data fetch in progress |
| Populated | File data shown |
| Not found / No access | Invalid ID or not owner → redirect to `/case-deck` |
| Error | Server error |

---

## 7) Audit & Logging
- All status changes create a `case_timeline` entry automatically **TODO (unconfirmed — verify trigger or explicit call in `updateCaseStatus`)**.
- Evidence uploads timestamped in `case_evidence.uploaded_at`.

---

## 8) Test Checklist (UAT)
- Given file owner → When visiting `/case-deck/[id]` → Then full file detail shown
- Given non-owner → Then redirect to `/case-deck`
- Given status changed → Then badge updates + DB row updated
- Given timeline note added → Then note appears in timeline with timestamp
- Given evidence uploaded → Then shown in evidence gallery
- Given evidence deleted → Then removed from gallery
