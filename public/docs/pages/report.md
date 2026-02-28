# Page: /report

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/report/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- 3-step wizard for users to submit a new incident report.
- Step 1: Category + type selection.
- Step 2: Location (GPS or manual address) + description.
- Step 3: Media upload (optional images/video) + review + submit.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Subscription required:** No — all authenticated users can report incidents.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `createIncident(formData)` — `lib/actions/incidents.ts` |
| Tables written | `incidents`, `incident_media` |
| API Route | `POST /api/upload` — Vercel Blob file upload |
| Storage | Vercel Blob bucket for media |
| Browser API | `navigator.geolocation` for GPS coordinates |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| Progress indicator | Step 1 / 2 / 3 visual stepper |
| Step 1 — Category | Grid of category cards (theft, assault, vandalism, fraud, missing person, etc.) |
| Step 1 — Type | Sub-type selection within category |
| Step 2 — Location | GPS button + manual address fields (street, suburb, town, province) |
| Step 2 — Description | Textarea for incident description |
| Step 2 — Date/Time | Date and time pickers for when incident occurred |
| Step 3 — Media | Multi-file image/video upload with preview |
| Step 3 — Review | Summary of all entered data before submit |
| Submit button | Final submission on step 3 |
| Back/Next buttons | Step navigation |

---

## 5) Actions

### Action: Select Category
- **Location:** Step 1 category grid
- **Trigger:** Tap category card
- **Preconditions:** None
- **Client-side:** Updates local form state; advances to type selection
- **Database changes:** None yet

### Action: Use My Location (GPS)
- **Location:** Step 2 location section — "Use My Location" button
- **Trigger:** Click
- **Preconditions:** Browser geolocation permission granted
- **Client-side:** Calls `navigator.geolocation.getCurrentPosition()` → populates `latitude`, `longitude`; reverse geocode to get address **TODO (unconfirmed — check if reverse geocode is implemented)**
- **Database changes:** None yet
- **Failure states:** Permission denied → prompt to enter manually; GPS timeout → error shown

### Action: Enter Location Manually
- **Location:** Step 2 address fields
- **Trigger:** Text input
- **Client-side:** Fills `street_address`, `suburb`, `town`, `province` form fields

### Action: Upload Media
- **Location:** Step 3 media uploader
- **Trigger:** File picker or drag-drop
- **Preconditions:** File must be image (JPEG/PNG/WebP) or video (MP4); enforced client-side
- **Client-side:** `lib/utils/image-compression.ts` compresses images before upload; `lib/utils/video-compression.ts` for video
- **Request:** `POST /api/upload` with multipart form data → `app/api/upload/route.ts` → Vercel Blob `put()`
- **Database changes:** None until incident submitted; URLs stored in form state
- **Success state:** Preview shown in upload area
- **Failure states:** File too large → error; unsupported format → error; upload failure → error toast

### Action: Submit Incident
- **Location:** "Submit Report" button on step 3
- **Trigger:** Click
- **Preconditions:** Category, type, description, location all filled; user authenticated
- **Client-side validation:** All required fields non-empty
- **Request:** `createIncident(formData)` — `lib/actions/incidents.ts`
- **Database changes:**
  - Insert into `incidents { user_id, category, type, title, description, latitude, longitude, street_address, suburb, town, province, status: "active", verification_level: 0, created_at }`
  - Insert into `incident_media { incident_id, url, type (image|video) }` for each uploaded file
- **Side effects:**
  - `incidents.geohash` computed from lat/lng (`lib/utils/geohash.ts`) for map queries
  - Incident becomes visible in feed immediately (RLS: all authenticated users can read active incidents)
- **Success state:** Navigate to `/feed` (or incident detail); toast "Report submitted successfully"
- **Failure states:**
  - Missing required fields → validation error per field
  - Upload failure → media not attached, can still submit without media
  - Server error → error toast; form state preserved

### Action: Navigate Steps (Next / Back)
- **Location:** Next/Back buttons at bottom of each step
- **Trigger:** Click
- **Client-side:** Updates `currentStep` state (1 → 2 → 3); validates current step before advancing
- **Database changes:** None

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Step 1 | Category/type selection |
| Step 2 | Location + description |
| Step 3 | Media upload + review |
| Uploading | Media upload in progress |
| Submitting | Final form submission in flight |
| Success | Redirect to feed/incident |
| Error | Submission failed |

---

## 7) Audit & Logging
- Submitted incident written to `incidents` with `user_id` and `created_at`.
- Media files stored in Vercel Blob with URL persisted in `incident_media`.

---

## 8) Test Checklist (UAT)
- Given authenticated user → When visiting `/report` → Then step 1 shown
- Given category selected → When Next clicked → Then step 2 shown
- Given GPS button clicked + permission granted → Then lat/lng populated
- Given GPS permission denied → Then manual entry fields prompted
- Given all fields filled → When Submit clicked → Then incident created, redirected to feed
- Given missing description → When Next attempted from step 2 → Then validation error shown
- Given image file selected → When uploaded → Then preview shown in step 3
- Given video file selected → Then video preview shown
- Given oversized file → Then error shown, file not added
- Given unauthenticated user → When visiting → Then redirect to login
