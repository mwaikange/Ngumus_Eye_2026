# Ngumus Eye Mobile App — Complete API Documentation for Replit Developer

**Version:** 1.0.0  
**Last Updated:** 2026-02-25  
**Base URL:** `https://app.ngumus-eye.site`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [Registration / Onboarding Flow](#3-registration--onboarding-flow)
4. [Forgot Password / Reset Flow](#4-forgot-password--reset-flow)
5. [Feed / Dashboard Screen](#5-feed--dashboard-screen)
6. [Incident Reporting](#6-incident-reporting)
7. [Incident Detail Screen](#7-incident-detail-screen)
8. [Reactions & Comments](#8-reactions--comments)
9. [Map Screen](#9-map-screen)
10. [File Deck (Case Management)](#10-file-deck-case-management)
11. [File Detail Screen](#11-file-detail-screen)
12. [File Evidence & Document Upload](#12-file-evidence--document-upload)
13. [Device Tracking](#13-device-tracking)
14. [Groups](#14-groups)
15. [Group Chat / Messaging](#15-group-chat--messaging)
16. [User Profile](#16-user-profile)
17. [Public Profile View](#17-public-profile-view)
18. [Follow / Unfollow](#18-follow--unfollow)
19. [Notifications](#19-notifications)
20. [Search](#20-search)
21. [Subscription & Voucher System](#21-subscription--voucher-system)
22. [File Upload API](#22-file-upload-api)
23. [Admin Screens](#23-admin-screens)
24. [Real-Time Subscriptions](#24-real-time-subscriptions)
25. [Status Codes & Enums Reference](#25-status-codes--enums-reference)
26. [Subscription Plans Reference](#26-subscription-plans-reference)
27. [Error Handling](#27-error-handling)
28. [Environment Variables](#28-environment-variables)
29. [Testing Checklist](#29-testing-checklist)
30. [Final Notes — Backend vs Frontend Responsibility](#30-final-notes--backend-vs-frontend-responsibility)

---

## 1. Architecture Overview

The Ngumus Eye backend runs on **Next.js (App Router)** deployed on **Vercel**. There is NO traditional REST API — all data operations use one of two methods:

| Method | When Used | Mobile Approach |
|---|---|---|
| **Next.js Server Actions** | All mutations (create, update, delete) | Call as `POST /api/*` wrapper endpoints you build |
| **Direct Supabase Client** | All reads (queries) | Use Supabase JS SDK or REST API directly |

**For mobile (React Native / Expo), you should:**
1. Use the **Supabase JS SDK** (`@supabase/supabase-js`) directly for all database reads.
2. Create a thin API layer in your Replit backend (or call Supabase directly) for all write operations.
3. Maintain the Supabase session token in **SecureStore** (Expo) or **AsyncStorage**.

### Required Headers for All API Calls

```
Content-Type: application/json
Authorization: Bearer <supabase_access_token>
apikey: <SUPABASE_ANON_KEY>
```

---

## 2. Authentication & Session Management

### 2.1 Login

**Screen:** Login  
**Trigger:** User taps "Sign In" button  
**Supabase Method:** `supabase.auth.signInWithPassword()`

**User Input:**
- `email` (text, required, valid email format)
- `password` (password, required, min 6 chars)

**Request (Supabase SDK):**
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123"
})
```

**Direct REST alternative:**
```
POST https://<SUPABASE_PROJECT_URL>/auth/v1/token?grant_type=password
```
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "expires_at": 1234567890,
  "refresh_token": "v1:abcdef...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "email_confirmed_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "user_metadata": {
      "display_name": "John Doe",
      "phone": "+264811234567"
    }
  }
}
```

**After success:**
- Store `access_token` and `refresh_token` securely (SecureStore)
- Store `user.id` for reference
- Check if user has active subscription (see Section 21)
- Navigate to `/feed` if subscription active, otherwise `/subscribe`

**Error Responses:**
- `400`: Invalid credentials
```json
{ "error": "Invalid login credentials" }
```
- `400`: Email not confirmed
```json
{ "error": "Email not confirmed" }
```

**UI Requirements:**
- Disable Sign In button while loading
- Show error message inline below form
- Show/hide password toggle button
- "Forgot password?" link navigates to forgot password screen

---

### 2.2 Session Persistence

**Trigger:** App launch / cold start

**Action:** Restore session from SecureStore, then verify it's still valid.

```javascript
const { data: { session } } = await supabase.auth.getSession()
```

**If session exists and not expired:** Navigate to `/feed`  
**If session expired:** Use refresh token:

```javascript
const { data, error } = await supabase.auth.refreshSession({
  refresh_token: storedRefreshToken
})
```

**Success Response (200):**
```json
{
  "session": {
    "access_token": "new_token_here",
    "refresh_token": "new_refresh_token",
    "expires_at": 1234567890
  }
}
```

**If refresh fails:** Clear stored tokens, navigate to login screen.

---

### 2.3 Logout

**Screen:** Profile / Settings  
**Trigger:** User taps "Sign Out"

**Supabase Method:**
```javascript
const { error } = await supabase.auth.signOut()
```

**After success:**
- Clear all stored tokens from SecureStore
- Clear any cached user data
- Navigate to login screen

---

### 2.4 Session Expiry Mid-Use

**Trigger:** API call returns `401 Unauthorized`

**Action:**
1. Attempt token refresh using stored `refresh_token`
2. If refresh succeeds: retry original request with new token
3. If refresh fails: clear session, navigate to login with message "Session expired. Please sign in again."

---

## 3. Registration / Onboarding Flow

### 3.1 Create Account

**Screen:** Sign Up  
**Trigger:** User taps "Sign Up" button  
**Supabase Method:** `supabase.auth.signUp()`

**User Input:**
- `displayName` (text, required, full name)
- `email` (email, required, valid format)
- `phone` (tel, optional, format: `+264 81 234 5678`)
- `password` (password, required, min 6 chars)
- `confirmPassword` (password, required, must match password)

**Client-side validation:**
- Passwords must match before submitting
- Email must be valid format

**Request (Supabase SDK):**
```javascript
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password123",
  options: {
    emailRedirectTo: "https://app.ngumus-eye.site/feed",
    data: {
      display_name: "John Doe",
      phone: "+264811234567"
    }
  }
})
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "user_metadata": {
      "display_name": "John Doe",
      "phone": "+264811234567"
    },
    "confirmation_sent_at": "2024-01-01T00:00:00Z"
  }
}
```

**After success:** Navigate to sign-up-success screen showing "Check your email to confirm your account."

**Error Responses:**
- `422`: Email already registered
```json
{ "error": "User already registered" }
```
- `422`: Weak password
```json
{ "error": "Password should be at least 6 characters" }
```

**UI Requirements:**
- Disable Sign Up button while loading
- Show inline error message
- Show/hide password toggles
- Client-side: validate passwords match before API call

---

### 3.2 Email Confirmation

**Trigger:** User clicks confirmation link in email

**Flow:** Supabase redirects to `https://app.ngumus-eye.site/auth/callback?code=xxx`  
The callback exchanges the code for a session and redirects to `/feed`.

**Mobile handling:** If using deep links, handle `ngumuseye://auth/callback?code=xxx` and call:
```javascript
const { data, error } = await supabase.auth.exchangeCodeForSession(code)
```

---

## 4. Forgot Password / Reset Flow

### 4.1 Request Password Reset

**Screen:** Forgot Password  
**Trigger:** User taps "Send Reset Email" button

**User Input:**
- `email` (email, required)

**Request (Supabase SDK):**
```javascript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "https://app.ngumus-eye.site/auth/reset-password"
})
```

**Success:** No data returned. Show message: "Check your email for password reset instructions."

**Error Responses:**
- `422`: Invalid email
```json
{ "error": "Unable to validate email address: invalid format" }
```

**UI Requirements:**
- Show success message after submission (do not navigate away)
- Disable button while loading

---

### 4.2 Reset Password

**Screen:** Reset Password  
**Trigger:** User clicks link in email → deep link opens app → `PASSWORD_RECOVERY` event fires

**Mobile deep link handling:**
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    // User is now authenticated, show the new password form
    setShowPasswordForm(true)
  }
})
```

**User Input:**
- `newPassword` (password, required, min 6 chars)
- `confirmNewPassword` (password, required, must match)

**Request (Supabase SDK):**
```javascript
const { error } = await supabase.auth.updateUser({
  password: "newPassword123"
})
```

**Success:** Navigate to login screen with message: "Password updated successfully."

**Error Responses:**
- `422`: Password too short
```json
{ "error": "Password should be at least 6 characters" }
```

---

## 5. Feed / Dashboard Screen

### 5.1 Load Feed Incidents

**Screen:** Feed  
**Trigger:** Screen loads, pull-to-refresh

**Direct Supabase Query:**
```javascript
const { data, error } = await supabase
  .from("incidents")
  .select(`
    id, type_id, title, description, town, lat, lng,
    status, verification_level, created_at, created_by,
    incident_types(id, code, label, severity),
    profiles:created_by(id, display_name, avatar_url, trust_score),
    incident_media(id, path, mime)
  `)
  .order("created_at", { ascending: false })
  .limit(20)
```

**Success Response structure per item:**
```json
{
  "id": "uuid",
  "type_id": 1,
  "title": "Vehicle theft on Independence Ave",
  "description": "Blue Toyota Hilux stolen...",
  "town": "Windhoek",
  "lat": -22.5609,
  "lng": 17.0658,
  "status": "new",
  "verification_level": 0,
  "created_at": "2024-01-01T10:00:00Z",
  "created_by": "user-uuid",
  "incident_types": {
    "id": 1,
    "code": "vehicle_theft",
    "label": "Vehicle Theft",
    "severity": 3
  },
  "profiles": {
    "id": "user-uuid",
    "display_name": "John D.",
    "avatar_url": "https://...",
    "trust_score": 75
  },
  "incident_media": [
    { "id": "media-uuid", "path": "userId/incidentId/photo.jpg", "mime": "image/jpeg" }
  ]
}
```

**Pagination:**
- Page size: 20 items
- Use `.range(offset, offset + 19)` for pagination
- Pull-to-refresh: reset offset to 0 and re-fetch

**UI Requirements:**
- Show incident type badge with color (see Section 25)
- Show status badge
- Show verification level indicator
- Tapping card navigates to incident detail: `/incident/{id}`
- Show empty state if no incidents

---

### 5.2 Load Active Ads (Feed Interstitials)

**Screen:** Feed (between incident cards)  
**Trigger:** Feed loads

**Direct Supabase Query:**
```javascript
const now = new Date().toISOString()
const { data: ads } = await supabase
  .from("ad_inventory")
  .select("id, title, description, media_url, media_type, target_url, display_priority")
  .eq("is_active", true)
  .lte("start_date", now)
  .gte("end_date", now)
  .order("display_priority", { ascending: false })
  .limit(10)
```

**Ad Response structure:**
```json
{
  "id": "ad-uuid",
  "title": "Stay Safe with Ngumus Eye",
  "description": "Join our community...",
  "media_url": "https://...",
  "media_type": "image",
  "target_url": "https://...",
  "display_priority": 1
}
```

**Track ad view when displayed:**
```javascript
await supabase.from("ad_views").insert({
  ad_id: adId,
  user_id: currentUserId
})
```

---

### 5.3 Feed Filters

**Trigger:** User selects filter options  
**Parameters:** `type_id`, `status`, `town`, date range

Apply as additional `.eq()`, `.in()`, or `.gte()/.lte()` clauses to the base feed query.

---

## 6. Incident Reporting

### 6.1 Load Incident Types

**Screen:** Report  
**Trigger:** Screen loads

**Direct Supabase Query:**
```javascript
const { data: types } = await supabase
  .from("incident_types")
  .select("id, code, label, severity")
  .order("label")
```

**Response structure:**
```json
[
  { "id": 1, "code": "vehicle_theft", "label": "Vehicle Theft", "severity": 3 },
  { "id": 2, "code": "house_break", "label": "House Break-in", "severity": 4 },
  { "id": 3, "code": "assault", "label": "Assault", "severity": 5 }
]
```

---

### 6.2 Create Incident

**Screen:** Report  
**Trigger:** User taps "Submit Report" button  
**Requires:** Active subscription

**User Input:**
- `type_id` (number, required — select from incident types)
- `title` (text, required, max 200 chars)
- `description` (textarea, optional)
- `town` (text, optional)
- `lat` (number, required — from device GPS)
- `lng` (number, required — from device GPS)
- `area_radius_m` (number, optional, default 200)

**Supabase Insert:**
```javascript
const { data: incident, error } = await supabase
  .from("incidents")
  .insert({
    type_id: 1,
    title: "Vehicle theft on Independence Ave",
    description: "Blue Toyota Hilux stolen...",
    town: "Windhoek",
    lat: -22.5609,
    lng: 17.0658,
    geohash: computedGeohash,  // Compute from lat/lng (precision 7)
    area_radius_m: 200,
    created_by: currentUserId
  })
  .select()
  .single()
```

**Geohash computation:** Use a geohash library (e.g. `ngeohash` for React Native) with precision 7.

**Success Response (201):**
```json
{
  "id": "incident-uuid",
  "type_id": 1,
  "title": "Vehicle theft on Independence Ave",
  "description": "Blue Toyota Hilux stolen...",
  "town": "Windhoek",
  "lat": -22.5609,
  "lng": 17.0658,
  "geohash": "k7fqk7b",
  "area_radius_m": 200,
  "status": "new",
  "verification_level": 0,
  "created_by": "user-uuid",
  "created_at": "2024-01-01T10:00:00Z"
}
```

**After success:**
1. Upload media files if any (see Section 6.3)
2. Navigate to incident detail screen

**Error Responses:**
- `401`: Not authenticated
- `403`: No active subscription

---

### 6.3 Upload Incident Media

**Screen:** Report (after incident created)  
**Trigger:** User attaches photos/videos, called after incident creation

**Upload to Supabase Storage:**
```javascript
const filePath = `${userId}/${incidentId}/${Date.now()}-${randomString}.${ext}`
const { error: uploadError } = await supabase.storage
  .from("incident-media")
  .upload(filePath, file, { cacheControl: "3600", upsert: false })

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from("incident-media")
  .getPublicUrl(filePath)

// Save media record
await supabase.from("incident_media").insert({
  incident_id: incidentId,
  path: filePath,
  mime: file.type
})
```

**File constraints:**
- Images: max 10MB, types: `image/jpeg`, `image/png`, `image/webp`
- Videos: max 50MB, types: `video/mp4`, `video/quicktime`

**Alternative — Use the Upload API endpoint:**
```
POST https://app.ngumus-eye.site/api/upload
Content-Type: multipart/form-data
```
Form fields:
- `file` — the file blob

**Success Response (200):**
```json
{ "url": "https://public.blob.vercel-storage.com/..." }
```

**Error Responses:**
- `400`: No file provided
- `400`: File too large (`{ "error": "File too large. Maximum size is 50MB" }`)
- `400`: Invalid file type (`{ "error": "Invalid file type. Only images and videos are allowed" }`)

---

## 7. Incident Detail Screen

### 7.1 Load Incident Details

**Screen:** Incident Detail  
**Trigger:** Screen loads with `incident_id`

**Direct Supabase Query:**
```javascript
const { data: incident } = await supabase
  .from("incidents")
  .select(`
    *,
    incident_types(id, code, label, severity),
    profiles:created_by(id, display_name, avatar_url, trust_score),
    incident_media(id, path, mime, created_at)
  `)
  .eq("id", incidentId)
  .single()
```

**Success Response:**
```json
{
  "id": "incident-uuid",
  "type_id": 1,
  "title": "Vehicle theft on Independence Ave",
  "description": "Blue Toyota Hilux stolen...",
  "town": "Windhoek",
  "lat": -22.5609,
  "lng": 17.0658,
  "geohash": "k7fqk7b",
  "area_radius_m": 200,
  "status": "new",
  "verification_level": 0,
  "created_by": "user-uuid",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z",
  "incident_types": { "id": 1, "code": "vehicle_theft", "label": "Vehicle Theft", "severity": 3 },
  "profiles": { "id": "user-uuid", "display_name": "John D.", "avatar_url": "https://...", "trust_score": 75 },
  "incident_media": [
    { "id": "media-uuid", "path": "userId/incidentId/photo.jpg", "mime": "image/jpeg", "created_at": "..." }
  ]
}
```

**Media URL construction:**
```
https://<SUPABASE_PROJECT_URL>/storage/v1/object/public/incident-media/{path}
```

---

### 7.2 Load Incident Reactions Count

**Direct Supabase Query:**
```javascript
const { data: reactions } = await supabase
  .from("incident_reactions")
  .select("reaction_type")
  .eq("incident_id", incidentId)
```

Count each `reaction_type`: `upvote`, `downvote`, `love`, `confirm`

**Check user's own reaction:**
```javascript
const { data: myReaction } = await supabase
  .from("incident_reactions")
  .select("id, reaction_type")
  .eq("incident_id", incidentId)
  .eq("user_id", currentUserId)
  .maybeSingle()
```

---

## 8. Reactions & Comments

### 8.1 Toggle Reaction

**Screen:** Incident Detail / Feed Card  
**Trigger:** User taps reaction button (upvote, downvote, love, confirm)

**Check for existing reaction:**
```javascript
const { data: existing } = await supabase
  .from("incident_reactions")
  .select("id")
  .eq("incident_id", incidentId)
  .eq("user_id", userId)
  .eq("reaction_type", kind)
  .maybeSingle()
```

**If exists — Remove reaction:**
```javascript
await supabase.from("incident_reactions").delete().eq("id", existing.id)
```

**If not exists — Add reaction:**
```javascript
await supabase.from("incident_reactions").insert({
  incident_id: incidentId,
  user_id: userId,
  reaction_type: kind  // "upvote" | "downvote" | "love" | "confirm"
})
```

**UI Requirements:**
- Toggle active state on the tapped button
- Update reaction counts optimistically, then sync

---

### 8.2 Load Comments

**Screen:** Incident Detail  
**Trigger:** Screen loads / comment section expanded

**Direct Supabase Query:**
```javascript
const { data: comments } = await supabase
  .from("comments")
  .select(`
    id, body, created_at, author, image_url,
    profiles:author(display_name, avatar_url)
  `)
  .eq("incident_id", incidentId)
  .order("created_at", { ascending: true })
```

**Success Response per comment:**
```json
{
  "id": "comment-uuid",
  "body": "This happened near my house too.",
  "created_at": "2024-01-01T10:05:00Z",
  "author": "user-uuid",
  "image_url": null,
  "profiles": {
    "display_name": "Jane S.",
    "avatar_url": "https://..."
  }
}
```

---

### 8.3 Add Comment

**Screen:** Incident Detail  
**Trigger:** User taps "Send" on comment input

**User Input:**
- `body` (text, required, max 1000 chars)
- `image_url` (optional — URL from upload API)

**Supabase Insert:**
```javascript
const { data: comment, error } = await supabase
  .from("comments")
  .insert({
    incident_id: incidentId,
    author: userId,
    body: commentText,
    image_url: imageUrl || null
  })
  .select("id, body, created_at, author, image_url")
  .single()
```

**Success:** Append comment to list, clear input.

**To upload comment image:** Use `/api/upload` endpoint first, then pass the URL as `image_url`.

---

## 9. Map Screen

### 9.1 Load Incidents for Map

**Screen:** Map  
**Trigger:** Map loads, map region changes

**Direct Supabase Query (bounding box):**
```javascript
const { data: incidents } = await supabase
  .from("incidents")
  .select("id, type_id, title, lat, lng, status, incident_types(label, severity)")
  .gte("lat", southLat)
  .lte("lat", northLat)
  .gte("lng", westLng)
  .lte("lng", eastLng)
  .neq("status", "archived")
  .limit(200)
```

**Response per pin:**
```json
{
  "id": "incident-uuid",
  "type_id": 1,
  "title": "Vehicle Theft",
  "lat": -22.5609,
  "lng": 17.0658,
  "status": "new",
  "incident_types": { "label": "Vehicle Theft", "severity": 3 }
}
```

**UI Requirements:**
- Color map pins by incident type severity
- Tapping pin shows mini card
- Tapping mini card navigates to incident detail

---

## 10. File Deck (Case Management)

**Requires:** Active subscription

### 10.1 Load User Files

**Screen:** File Deck  
**Trigger:** Screen loads

**Direct Supabase Query:**
```javascript
const { data: files } = await supabase
  .from("cases")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
```

**Success Response per file:**
```json
{
  "id": "case-uuid",
  "user_id": "user-uuid",
  "serial_number": "CASE-2024-001234",
  "case_number": "CASE-2024-001234",
  "category": "vehicle_theft",
  "title": "Toyota Hilux Theft",
  "description": "My vehicle was stolen from...",
  "status": "open",
  "priority": "high",
  "police_cr_number": "CR/2024/001",
  "vehicle_number_plate": "N 12345 W",
  "serial_numbers": ["SN001", "SN002"],
  "stolen_item_reference": "REF001",
  "reporter_name": "John Doe",
  "reporter_phone": "+264811234567",
  "reporter_email": "john@example.com",
  "location_address": "123 Independence Ave",
  "town": "Windhoek",
  "evidence": [],
  "documents": [],
  "files": [],
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

**UI Requirements:**
- Split into "Active Files" (status not closed/archived) and "Closed Files"
- Show stats: total active, new, in-progress counts
- Tapping file navigates to file detail

---

### 10.2 Create New File

**Screen:** New File  
**Trigger:** User taps "Submit" on create form

**User Input:**
- `category` (select, required) — `vehicle_theft`, `house_break`, `assault`, `fraud`, `missing_person`, `cybercrime`, `other`
- `title` (text, required)
- `description` (textarea, optional)
- `priority` (select, optional, default `medium`) — `low`, `medium`, `high`, `critical`
- `cr_number` (text, optional — police case reference)
- `vehicle_plate` (text, optional)
- `serial_numbers` (textarea, optional — one per line)
- `stolen_item_ref` (text, optional)
- `location_address` (text, optional)
- `town` (text, optional)
- `images` (file array, optional)
- `documents` (file array, optional)

**Supabase Insert:**
```javascript
const caseNumber = `CASE-${year}-${randomSixDigits}`

const { data: newCase, error } = await supabase
  .from("cases")
  .insert({
    user_id: userId,
    serial_number: caseNumber,
    case_number: caseNumber,
    category: "vehicle_theft",
    title: "Toyota Hilux Theft",
    description: "...",
    status: "open",
    priority: "high",
    police_cr_number: "CR/2024/001",
    vehicle_number_plate: "N 12345 W",
    serial_numbers: ["SN001"],
    stolen_item_reference: null,
    reporter_name: profile.full_name,
    reporter_phone: profile.phone,
    reporter_email: profile.email,
    location_address: "123 Independence Ave",
    town: "Windhoek",
    evidence: [],
    documents: [],
    files: []
  })
  .select()
  .single()
```

**Success Response (201):**
```json
{
  "success": true,
  "case": { /* full case object */ },
  "case_number": "CASE-2024-001234",
  "message": "Case created successfully!"
}
```

**After success:**
1. Upload attached images/documents (see Section 12)
2. Navigate to file detail screen

---

### 10.3 Load File Statistics (Dashboard Stats)

**Compute from loaded files array:**
- `activeFiles` = files where status NOT IN (`closed`, `archived`)
- `newFiles` = files where status = `new` (or `open`)
- `inProgressFiles` = files where status = `in_progress`
- `closedFiles` = files where status IN (`closed`, `archived`)

---

## 11. File Detail Screen

### 11.1 Load File Details

**Screen:** File Detail  
**Trigger:** Screen loads with `fileId`

**Direct Supabase Query:**
```javascript
const { data: caseData } = await supabase
  .from("cases")
  .select("*")
  .eq("id", fileId)
  .eq("user_id", userId)  // RLS enforces this but add for safety
  .single()
```

**Response:** Full case object (see Section 10.1 for structure).

The `evidence`, `documents`, and `files` fields are JSON arrays embedded in the case record:

**Evidence item structure:**
```json
{
  "id": "uuid",
  "file_url": "https://public.blob.vercel-storage.com/...",
  "file_name": "photo.jpg",
  "file_type": "image/jpeg",
  "file_size": 1024000,
  "description": "Incident evidence photo",
  "uploaded_at": "2024-01-01T10:00:00Z"
}
```

**Document item structure:**
```json
{
  "id": "uuid",
  "file_url": "https://public.blob.vercel-storage.com/...",
  "file_name": "police_report.pdf",
  "file_type": "application/pdf",
  "file_size_bytes": 512000,
  "uploaded_at": "2024-01-01T10:00:00Z"
}
```

---

## 12. File Evidence & Document Upload

### 12.1 Upload to Vercel Blob via API

**Screen:** File Detail (upload buttons)  
**Trigger:** User selects file and taps upload

**Step 1 — Upload file:**
```
POST https://app.ngumus-eye.site/api/upload
Content-Type: multipart/form-data
```
Form fields: `file` (binary)

**Success Response:**
```json
{ "url": "https://public.blob.vercel-storage.com/..." }
```

**Step 2 — Save evidence record to case:**
```javascript
// Get current case
const { data: currentCase } = await supabase
  .from("cases")
  .select("evidence")
  .eq("id", caseId)
  .single()

// Append new evidence
const updatedEvidence = [
  ...(currentCase.evidence || []),
  {
    id: generateUUID(),
    file_url: uploadedUrl,
    file_name: fileName,
    file_type: mimeType,
    file_size: fileSize,
    description: "Evidence photo/video",
    uploaded_at: new Date().toISOString()
  }
]

await supabase.from("cases").update({ evidence: updatedEvidence }).eq("id", caseId)
```

For documents, update the `documents` array. For generic files, update the `files` array.

---

## 13. Device Tracking

### 13.1 Load Registered Devices

**Screen:** Device Tracking  
**Trigger:** Screen loads

**Direct Supabase Query:**
```javascript
const { data: devices } = await supabase
  .from("tracked_devices")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
```

**Response per device:**
```json
{
  "id": "device-uuid",
  "user_id": "user-uuid",
  "device_name": "My iPhone 15",
  "device_type": "smartphone",
  "imei": "123456789012345",
  "serial_number": "DNXXX123",
  "status": "active",
  "reported_stolen_at": null,
  "created_at": "2024-01-01T10:00:00Z"
}
```

---

### 13.2 Register Device

**Screen:** Device Tracking  
**Trigger:** User submits register device form

**User Input:**
- `deviceName` (text, required)
- `deviceType` (select, required) — `smartphone`, `laptop`, `tablet`, `camera`, `other`
- `imei` (text, optional — 15-digit IMEI)
- `serialNumber` (text, optional)

**Supabase Insert:**
```javascript
await supabase.from("tracked_devices").insert({
  user_id: userId,
  device_name: "My iPhone 15",
  device_type: "smartphone",
  imei: "123456789012345",
  serial_number: "DNXXX123",
  status: "active"
})
```

**Success:** Refresh device list.

---

### 13.3 Report Device Stolen

**Screen:** Device Tracking  
**Trigger:** User taps "Report Stolen" on a device

**Supabase Update:**
```javascript
await supabase
  .from("tracked_devices")
  .update({
    status: "stolen",
    reported_stolen_at: new Date().toISOString()
  })
  .eq("id", deviceId)
  .eq("user_id", userId)
```

**Device Status Values:**
- `active` — registered and monitored
- `stolen` — reported as stolen

---

## 14. Groups

### 14.1 Load Groups List

**Screen:** Groups  
**Trigger:** Screen loads

**Direct Supabase Query (all public groups + user's groups):**
```javascript
const { data: groups } = await supabase
  .from("groups")
  .select(`
    id, name, geohash_prefix, visibility, created_by, created_at,
    negative_reports,
    group_members(user_id, role)
  `)
  .order("created_at", { ascending: false })
```

**Check membership for each group:**
```javascript
const isMember = group.group_members.some(m => m.user_id === currentUserId)
const userRole = group.group_members.find(m => m.user_id === currentUserId)?.role
```

---

### 14.2 Create Group

**Screen:** Create Group  
**Trigger:** User submits create group form

**User Input:**
- `name` (text, required, unique)
- `geohash_prefix` (text, required — computed from selected area)
- `visibility` (select, required) — `public` or `private`

**Supabase RPC Call:**
```javascript
const { data: groupId, error } = await supabase
  .rpc("create_group_with_creator", {
    p_name: "Windhoek West Neighborhood Watch",
    p_geohash_prefix: "k7fqk",
    p_visibility: "public"
  })
```

**Success Response:**
```json
"new-group-uuid"
```

**Error Responses:**
- Group name already exists: `{ "error": "A group with this name already exists" }`

**After success:** Navigate to group detail.

---

### 14.3 Join Group

**Screen:** Group Detail / Groups List  
**Trigger:** User taps "Join Group"

**Supabase RPC Call:**
```javascript
const { data, error } = await supabase.rpc("request_join_group", {
  p_group_id: groupId
})
```

**Success Response (public group):**
```json
{ "success": true, "message": "Joined group successfully", "is_member": true }
```

**Success Response (private group):**
```json
{ "success": true, "message": "Join request sent", "request_pending": true }
```

---

### 14.4 Leave Group

**Trigger:** User taps "Leave Group"

```javascript
await supabase
  .from("group_members")
  .delete()
  .eq("group_id", groupId)
  .eq("user_id", userId)
```

---

### 14.5 Load Group Members

**Direct Supabase Query:**
```javascript
const { data: members } = await supabase
  .from("group_members")
  .select("user_id, role, joined_at, profiles:user_id(display_name, avatar_url, trust_score)")
  .eq("group_id", groupId)
```

---

### 14.6 Get Pending Join Requests (Group Creator Only)

**Direct Supabase Query:**
```javascript
const { data: requests } = await supabase
  .from("group_requests")
  .select("id, user_id, created_at")
  .eq("group_id", groupId)
  .eq("status", "pending")
  .order("created_at", { ascending: true })
```

---

### 14.7 Approve Join Request

**Trigger:** Group creator taps "Approve"

```javascript
const { data, error } = await supabase.rpc("approve_group_request", {
  p_request_id: requestId
})
```

**Success:**
```json
{ "success": true, "message": "Request approved", "user_name": "Jane D.", "group_name": "....." }
```

---

### 14.8 Reject Join Request

**Trigger:** Group creator taps "Reject"

```javascript
await supabase
  .from("group_requests")
  .update({ status: "rejected", updated_at: new Date().toISOString() })
  .eq("id", requestId)
```

---

### 14.9 Remove Group Member (Creator Only)

```javascript
const { data } = await supabase.rpc("remove_group_member", {
  p_group_id: groupId,
  p_user_id_to_remove: targetUserId
})
```

---

### 14.10 Report Group (Members Only)

```javascript
await supabase.from("group_reports").insert({
  group_id: groupId,
  user_id: userId
})
await supabase.rpc("increment_group_reports", { p_group_id: groupId })
```

**Check if already reported:**
```javascript
const { data } = await supabase
  .from("group_reports")
  .select("id")
  .eq("group_id", groupId)
  .eq("user_id", userId)
  .maybeSingle()
// If data exists, user already reported
```

---

## 15. Group Chat / Messaging

### 15.1 Load Group Messages

**Screen:** Group Detail / Chat Tab  
**Trigger:** Screen loads, real-time subscription

**Direct Supabase Query:**
```javascript
const { data: messages } = await supabase
  .from("group_messages")
  .select(`
    id, message, image_url, video_url, created_at, user_id,
    profiles:user_id(display_name, avatar_url)
  `)
  .eq("group_id", groupId)
  .order("created_at", { ascending: true })
  .limit(50)
```

**Message structure:**
```json
{
  "id": "message-uuid",
  "message": "Hello everyone!",
  "image_url": null,
  "video_url": null,
  "created_at": "2024-01-01T10:00:00Z",
  "user_id": "user-uuid",
  "profiles": {
    "display_name": "John D.",
    "avatar_url": "https://..."
  }
}
```

---

### 15.2 Send Group Message

**Trigger:** User taps Send in chat

**User Input:**
- `message` (text, optional if media attached)
- `imageUrl` (string, optional — from upload API)
- `videoUrl` (string, optional — from upload API)

**Requires:** User must be a group member.

**Supabase Insert:**
```javascript
// First verify membership
const { data: membership } = await supabase
  .from("group_members")
  .select("role")
  .eq("group_id", groupId)
  .eq("user_id", userId)
  .maybeSingle()

if (!membership) return { error: "You must be a member to post" }

await supabase.from("group_messages").insert({
  group_id: groupId,
  user_id: userId,
  message: "Hello everyone!",
  image_url: null,
  video_url: null
})
```

---

### 15.3 Delete Own Message

**Trigger:** User long-presses their own message and taps "Delete"

```javascript
await supabase
  .from("group_messages")
  .delete()
  .eq("id", messageId)
  .eq("user_id", userId)  // Can only delete own messages
```

---

## 16. User Profile

### 16.1 Load Own Profile

**Screen:** Profile  
**Trigger:** Screen loads

**Direct Supabase Query:**
```javascript
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single()
```

**Profile Response:**
```json
{
  "id": "user-uuid",
  "display_name": "John Doe",
  "full_name": "John Doe",
  "phone": "+264811234567",
  "email": "john@example.com",
  "avatar_url": "https://public.blob.vercel-storage.com/avatars/...",
  "trust_score": 75,
  "level": 1,
  "home_geohash": "k7fqk7b",
  "work_geohash": null,
  "is_banned": false,
  "bio": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 16.2 Load Profile Incident History

```javascript
const { data: incidents } = await supabase
  .from("incidents")
  .select("id, title, status, created_at, incident_types(label)")
  .eq("created_by", userId)
  .order("created_at", { ascending: false })
  .limit(20)
```

---

### 16.3 Load Follow Counts

```javascript
const [followersRes, followingRes] = await Promise.all([
  supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", userId),
  supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", userId)
])
const followers = followersRes.count
const following = followingRes.count
```

---

### 16.4 Update Display Name

```javascript
await supabase
  .from("profiles")
  .update({ display_name: "New Name" })
  .eq("id", userId)
```

---

### 16.5 Upload Avatar

**Step 1:** Upload file to Vercel Blob via `/api/upload` endpoint.  
**Step 2:** Update profile with returned URL:
```javascript
await supabase
  .from("profiles")
  .update({ avatar_url: blobUrl })
  .eq("id", userId)
```

---

### 16.6 Load Active Subscription on Profile

```javascript
const { data: subscription } = await supabase
  .from("user_subscriptions")
  .select("*, plans(*)")
  .eq("user_id", userId)
  .eq("status", "active")
  .gte("expires_at", new Date().toISOString())
  .order("expires_at", { ascending: false })
  .maybeSingle()
```

---

## 17. Public Profile View

### 17.1 Load Other User's Profile

**Screen:** Public Profile (navigated from incident card, group member, etc.)

```javascript
const { data: profile } = await supabase
  .from("profiles")
  .select("id, display_name, avatar_url, trust_score, level, created_at, bio")
  .eq("id", targetUserId)
  .single()
```

**Check if current user follows target:**
```javascript
const { data: followRecord } = await supabase
  .from("user_follows")
  .select("id")
  .eq("follower_id", currentUserId)
  .eq("following_id", targetUserId)
  .maybeSingle()
const isFollowing = !!followRecord
```

---

## 18. Follow / Unfollow

### 18.1 Follow User

**Trigger:** User taps "Follow" on public profile

```javascript
await supabase.from("user_follows").insert({
  follower_id: currentUserId,
  following_id: targetUserId
})

// Create notification for target user
await supabase.from("notifications").insert({
  user_id: targetUserId,
  type: "new_follower",
  metadata: { follower_id: currentUserId },
  is_read: false
})
```

**Error:** Duplicate (already following):
```json
{ "error": "Already following this user" }
```

---

### 18.2 Unfollow User

**Trigger:** User taps "Unfollow" on public profile

```javascript
await supabase
  .from("user_follows")
  .delete()
  .eq("follower_id", currentUserId)
  .eq("following_id", targetUserId)
```

---

### 18.3 Load Followers / Following Lists

```javascript
// Followers
const { data: followerLinks } = await supabase
  .from("user_follows")
  .select("follower_id")
  .eq("following_id", userId)
const followerIds = followerLinks.map(f => f.follower_id)
const { data: followerProfiles } = await supabase
  .from("profiles")
  .select("id, display_name, avatar_url, trust_score")
  .in("id", followerIds)

// Following
const { data: followingLinks } = await supabase
  .from("user_follows")
  .select("following_id")
  .eq("follower_id", userId)
const followingIds = followingLinks.map(f => f.following_id)
const { data: followingProfiles } = await supabase
  .from("profiles")
  .select("id, display_name, avatar_url, trust_score")
  .in("id", followingIds)
```

---

## 19. Notifications

### 19.1 Load Notifications

**Screen:** Notifications  
**Trigger:** Screen loads

```javascript
const { data: notifications } = await supabase
  .from("user_notifications")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(50)
```

**Notification structure:**
```json
{
  "id": "notif-uuid",
  "user_id": "user-uuid",
  "type": "follow",
  "title": "New Follower",
  "message": "John D. started following you",
  "entity_id": "follower-user-uuid",
  "read_at": null,
  "created_at": "2024-01-01T10:00:00Z"
}
```

**Notification types and navigation:**
| type | navigate to |
|---|---|
| `follow` | `/profile/{entity_id}` |
| `group_request` | `/groups/{entity_id}` |
| `group_joined` | `/groups/{entity_id}` |
| `subscription` | `/subscribe` |

---

### 19.2 Mark Notification as Read

**Trigger:** User taps a notification

```javascript
await supabase
  .from("user_notifications")
  .update({ read_at: new Date().toISOString() })
  .eq("id", notificationId)
```

---

### 19.3 Unread Notification Count Badge

```javascript
const { count } = await supabase
  .from("user_notifications")
  .select("id", { count: "exact" })
  .eq("user_id", userId)
  .is("read_at", null)
```

Display badge on navigation bell icon when `count > 0`.

---

## 20. Search

### 20.1 Search Incidents

**Screen:** Search  
**Trigger:** User types in search input (debounce 300ms)

```javascript
const { data: results } = await supabase
  .from("incidents")
  .select("id, title, description, town, status, created_at, incident_types(label)")
  .or(`title.ilike.%${query}%,description.ilike.%${query}%,town.ilike.%${query}%`)
  .order("created_at", { ascending: false })
  .limit(20)
```

---

### 20.2 Search Users

```javascript
const { data: users } = await supabase
  .from("profiles")
  .select("id, display_name, avatar_url, trust_score")
  .ilike("display_name", `%${query}%`)
  .limit(10)
```

---

## 21. Subscription & Voucher System

### 21.1 Check Active Subscription

**Trigger:** App load, before accessing premium features (File Deck, etc.)

```javascript
const { data: subscription } = await supabase
  .from("user_subscriptions")
  .select("*, plans(*)")
  .eq("user_id", userId)
  .eq("status", "active")
  .gte("expires_at", new Date().toISOString())
  .order("expires_at", { ascending: false })
  .maybeSingle()

const hasActiveSubscription = !!subscription
```

**If no subscription:** Redirect to `/subscribe` screen.

---

### 21.2 Load Subscription Plans

**Screen:** Subscribe  
**Trigger:** Screen loads

```javascript
const { data: plans } = await supabase
  .from("plans")
  .select("*")
  .order("price_cents", { ascending: true })
```

**Plan structure:**
```json
{
  "id": 1,
  "code": "individual_monthly",
  "label": "Individual 1 Month",
  "period_days": 30,
  "price_cents": 7000
}
```

**Pricing is in cents (Namibian Dollar):** `7000` = N$70.00

---

### 21.3 Purchase Flow (WhatsApp Payment)

**Trigger:** User taps "Pay Now" on a plan

**Action:** Open WhatsApp with pre-filled message:
```
https://wa.me/264816802064?text=Hi%20Ngumu's%20Eye%20Support%2C%20I%20would%20like%20to%20subscribe%20to%20the%20Individual%201%20Month%20of%20N%2470.%20Please%20advise%20how%20I%20can%20make%20payment%3F
```

Payment is handled manually by admin who then generates a voucher code.

---

### 21.4 Redeem Voucher Code

**Screen:** Subscribe  
**Trigger:** User enters voucher code and taps "Redeem"

**User Input:**
- `voucherCode` (text, required, uppercase)

**Step 1 — Validate voucher:**
```javascript
const { data: voucher } = await supabase
  .from("vouchers")
  .select("*, plans(*)")
  .eq("code", voucherCode.trim().toUpperCase())
  .is("redeemed_by", null)
  .maybeSingle()
```

If `voucher` is null: Show "Invalid or already used voucher code"

**Step 2 — Mark voucher as redeemed:**
```javascript
await supabase.from("vouchers").update({
  redeemed_by: userId,
  redeemed_by_email: userEmail,
  redeemed_at: new Date().toISOString()
}).eq("code", voucherCode.trim().toUpperCase())
```

**Step 3 — Create subscription:**
```javascript
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + (voucher.days || voucher.plans.period_days || 30))

await supabase.from("user_subscriptions").insert({
  user_id: userId,
  plan_id: voucher.plan_id,
  started_at: new Date().toISOString(),
  expires_at: expiresAt.toISOString(),
  status: "active",
  payment_reference: `VOUCHER-${voucherCode}`
})
```

**Success:** Show "Voucher redeemed! Your subscription is now active." Refresh subscription status.

**Error Responses:**
- `"Invalid or already used voucher code"` — voucher not found or already redeemed
- `"Failed to redeem voucher. It may have already been used."` — race condition on redemption

---

### 21.5 Cancel Subscription

```javascript
await supabase
  .from("user_subscriptions")
  .update({ status: "cancelled", auto_renew: false })
  .eq("user_id", userId)
  .eq("status", "active")
```

---

## 22. File Upload API

**Endpoint:** `POST https://app.ngumus-eye.site/api/upload`  
**Content-Type:** `multipart/form-data`  
**Authentication:** Supabase session cookie (handled automatically when using same domain)  
**For mobile:** Include `Authorization: Bearer <access_token>` header

**Form Fields:**
- `file` (binary, required)

**File Constraints:**
- Images: max `10MB`, allowed types: `image/*`
- Videos: max `50MB`, allowed types: `video/*`

**Success Response (200):**
```json
{ "url": "https://public.blob.vercel-storage.com/filename-abc123.jpg" }
```

**Error Responses:**
- `400`: `{ "error": "No file provided" }`
- `400`: `{ "error": "File too large. Maximum size is 10MB" }`
- `400`: `{ "error": "Invalid file type. Only images and videos are allowed" }`
- `500`: `{ "error": "Upload failed" }`

---

## 23. Admin Screens

> Admin screens are restricted to users with `profile.level >= 4`. Mobile app should check this before showing admin navigation.

### 23.1 Admin Dashboard Stats

```javascript
const [incidentsRes, usersRes, groupsRes] = await Promise.all([
  supabase.from("incidents").select("id", { count: "exact" }),
  supabase.from("profiles").select("id", { count: "exact" }),
  supabase.from("groups").select("id", { count: "exact" })
])
```

---

### 23.2 Admin — Manage Users

```javascript
const { data: users } = await supabase
  .from("profiles")
  .select("id, display_name, email, phone, level, trust_score, is_banned, created_at")
  .order("created_at", { ascending: false })
```

**Ban / Unban user:**
```javascript
await supabase.from("profiles").update({ is_banned: true }).eq("id", targetUserId)
```

**Update user level:**
```javascript
await supabase.from("profiles").update({ level: newLevel }).eq("id", targetUserId)
```

---

### 23.3 Admin — Incident Triage

```javascript
const { data: incidents } = await supabase
  .from("incidents")
  .select("*, incident_types(*), profiles:created_by(display_name)")
  .eq("status", "new")
  .order("created_at", { ascending: true })
```

**Update incident status:**
```javascript
await supabase
  .from("incidents")
  .update({ status: newStatus })
  .eq("id", incidentId)
```

---

### 23.4 Admin — Generate Voucher

**Requires:** `profile.level >= 4`

```javascript
const codeString = `${planCode.substring(0,3)}-${Date.now().toString().slice(-5)}-${randomAlphaNum.toUpperCase()}`

await supabase.from("vouchers").insert({
  code: codeString,
  plan_id: planId,
  days: customDays || null,
  issued_to_email: recipientEmail
})
```

---

### 23.5 Admin — Groups Moderation

```javascript
const { data: groups } = await supabase
  .from("groups")
  .select("*, group_members(count)")
  .order("negative_reports", { ascending: false })
```

---

## 24. Real-Time Subscriptions

### 24.1 Live Group Chat Messages

```javascript
const channel = supabase
  .channel(`group-messages-${groupId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "group_messages",
      filter: `group_id=eq.${groupId}`
    },
    (payload) => {
      // Append payload.new to messages list
      setMessages(prev => [...prev, payload.new])
    }
  )
  .subscribe()

// Cleanup on unmount
return () => supabase.removeChannel(channel)
```

---

### 24.2 Live Incident Feed Updates

```javascript
const channel = supabase
  .channel("incidents-feed")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "incidents" },
    (payload) => {
      // Prepend new incident to feed
    }
  )
  .subscribe()
```

---

### 24.3 Live Notifications

```javascript
const channel = supabase
  .channel(`notifications-${userId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "user_notifications",
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Increment badge count, add to notifications list
    }
  )
  .subscribe()
```

---

## 25. Status Codes & Enums Reference

### Incident Status

| Value | Label | Color |
|---|---|---|
| `new` | New | Yellow `#F59E0B` |
| `verifying` | Verifying | Blue `#3B82F6` |
| `assigned` | Assigned | Purple `#8B5CF6` |
| `resolved` | Resolved | Green `#10B981` |
| `archived` | Archived | Gray `#6B7280` |

### File/Case Status

| Value | Label | Color |
|---|---|---|
| `open` | Open | Yellow `#F59E0B` |
| `new` | New | Yellow `#F59E0B` |
| `assigned` | Assigned | Blue `#3B82F6` |
| `in_progress` | In Progress | Purple `#8B5CF6` |
| `closed` | Closed | Green `#10B981` |
| `archived` | Archived | Gray `#6B7280` |

### User Level

| Value | Label |
|---|---|
| `0` | Unverified |
| `1` | Basic User |
| `2` | Trusted User |
| `3` | Moderator |
| `4` | Admin |
| `5` | Super Admin |

### Group Visibility

| Value | Description |
|---|---|
| `public` | Anyone can join |
| `private` | Requires creator approval |

### Group Member Roles

| Value | Description |
|---|---|
| `member` | Regular member |
| `moderator` | Can manage messages |
| `responder` | Emergency responder |
| `owner` | Group creator |

### Reaction Types

| Value | Label | Icon |
|---|---|---|
| `upvote` | Upvote | Thumbs Up |
| `downvote` | Downvote | Thumbs Down |
| `love` | Love | Heart |
| `confirm` | Confirm | Check |

### File/Case Priority

| Value | Color |
|---|---|
| `low` | Gray |
| `medium` | Yellow |
| `high` | Orange |
| `critical` | Red |

### Subscription Status

| Value | Meaning |
|---|---|
| `active` | Currently active |
| `expired` | Past expiry date |
| `cancelled` | Manually cancelled |

### Phone Number Format

Expected format: `+264 81 234 5678` (Namibia country code)  
Store as-is, display with spaces.

### Date Formatting

- Timezone: Africa/Windhoek (WAT, UTC+2)
- Display format: `DD MMM YYYY` (e.g., `01 Jan 2024`)
- Time format: `HH:mm` (24-hour)
- ISO 8601 for all API values: `2024-01-01T10:00:00Z`

### Currency Formatting

- Currency: Namibian Dollar (N$)
- Stored in cents: `7000` = `N$70.00`
- Display: `N$70` (no decimals for round numbers)

---

## 26. Subscription Plans Reference

### Individual Plans

| id | code | Label | Days | Price (N$) |
|---|---|---|---|---|
| 1 | `individual_monthly` | Individual 1 Month | 30 | N$70 |
| 2 | `individual_3months` | Individual 3 Months | 90 | N$180 |
| 3 | `individual_6months` | Individual 6 Months | 180 | N$360 |
| 4 | `individual_12months` | Individual 12 Months | 365 | N$660 |

### Family Plans

| id | code | Label | Days | Price (N$) |
|---|---|---|---|---|
| 5 | `family_monthly` | Family 1 Month | 30 | N$150 |
| 6 | `family_3months` | Family 3 Months | 90 | N$360 |
| 7 | `family_6months` | Family 6 Months | 180 | N$720 |
| 8 | `family_12months` | Family 12 Months | 365 | N$1440 |

### Tourist Plans

| id | code | Label | Days | Price (N$) |
|---|---|---|---|---|
| 9 | `tourist_5days` | Tourist 5 Days | 5 | N$399 |
| 10 | `tourist_10days` | Tourist 10 Days | 10 | N$700 |
| 11 | `tourist_14days` | Tourist 14 Days | 14 | N$900 |
| 12 | `tourist_30days` | Tourist 30 Days | 30 | N$1800 |

---

## 27. Error Handling

### Standard Error Response Format

```json
{ "error": "Human-readable error message" }
```

### Common HTTP Codes

| Code | Meaning | Mobile Action |
|---|---|---|
| `200` / `201` | Success | Process response |
| `400` | Bad Request (validation) | Show field error |
| `401` | Unauthorized | Redirect to login |
| `403` | Forbidden (no subscription/permission) | Redirect to subscribe page |
| `404` | Not Found | Show "not found" state |
| `409` | Conflict (duplicate) | Show "already exists" message |
| `422` | Unprocessable (validation) | Show validation error |
| `429` | Rate Limited | Show "try again later" |
| `500` | Server Error | Show generic error, offer retry |

### Supabase Error Codes

| Code | Meaning |
|---|---|
| `23505` | Duplicate — unique constraint violation |
| `42501` | Permission denied (RLS) |
| `PGRST116` | Row not found |

### Network Error Handling

- Show "No internet connection. Please check your network." toast
- Retry button on failed screens
- Cache last successful feed response for offline viewing

### Authentication Errors Mid-Session

- On `401` from Supabase: attempt token refresh
- If refresh fails: clear session, show "Session expired" alert, navigate to login

---

## 28. Environment Variables

The following PUBLIC keys are needed in the mobile app:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EXPO_PUBLIC_SITE_URL=https://app.ngumus-eye.site
```

> Never include `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET` in the mobile app.

**WhatsApp Contact Number:** `264816802064`

---

## 29. Testing Checklist

### Authentication
- [ ] Login with valid credentials navigates to feed
- [ ] Login with wrong password shows error message
- [ ] Login button disabled during loading
- [ ] Register with all fields creates account
- [ ] Register with mismatched passwords shows error
- [ ] Register with existing email shows error
- [ ] Confirmation email received after signup
- [ ] Forgot password email received
- [ ] Password reset link opens reset form
- [ ] Password reset saves new password and redirects to login
- [ ] Session persists after app restart
- [ ] Session refresh works when token expired
- [ ] Logout clears session and returns to login

### Feed
- [ ] Feed loads list of incidents
- [ ] Pull-to-refresh reloads feed
- [ ] Pagination loads more on scroll
- [ ] Tapping incident card opens detail screen
- [ ] Ads display between incident cards

### Incident Reporting
- [ ] Incident types load in dropdown
- [ ] GPS location auto-populates
- [ ] Submitting form creates incident
- [ ] Media upload attaches to incident
- [ ] Unsupported file type shows error
- [ ] File over size limit shows error

### Incident Detail
- [ ] All incident data loads correctly
- [ ] Media gallery displays images/videos
- [ ] Reactions toggle on/off
- [ ] Reaction counts update
- [ ] Comments load in order
- [ ] Adding comment appends to list
- [ ] Comment with image works

### File Deck
- [ ] Subscription gate redirects to subscribe if no active subscription
- [ ] File list loads and splits active/closed
- [ ] Stats show correct counts
- [ ] Create file form submits and navigates to detail
- [ ] File detail loads all fields
- [ ] Evidence upload works
- [ ] Document upload works

### Device Tracking
- [ ] Device list loads
- [ ] Register device form saves
- [ ] "Report Stolen" updates status to stolen

### Groups
- [ ] Groups list loads
- [ ] Public group join works immediately
- [ ] Private group join shows "request sent"
- [ ] Group creator sees pending requests
- [ ] Approve request adds member
- [ ] Reject request removes from list
- [ ] Leave group removes user
- [ ] Chat messages load
- [ ] Sending message appears in chat
- [ ] Real-time new messages appear without refresh
- [ ] Deleting own message removes it

### Profile
- [ ] Profile data loads correctly
- [ ] Follower/following counts correct
- [ ] Update display name saves
- [ ] Avatar upload works
- [ ] Subscription details shown
- [ ] Tapping followers/following opens list

### Notifications
- [ ] Notification list loads
- [ ] Unread badge shows on navigation
- [ ] Tapping notification marks as read
- [ ] Tapping follow notification navigates to profile
- [ ] Tapping group notification navigates to group

### Subscriptions
- [ ] Plans list loads with correct prices
- [ ] "Pay Now" opens WhatsApp with correct message
- [ ] Voucher redemption with valid code activates subscription
- [ ] Invalid voucher code shows error
- [ ] Already-used voucher shows error
- [ ] Active subscription shows expiry date

---

## 30. Final Notes — Backend vs Frontend Responsibility

### Mobile App MUST do:
- Validate all form inputs before API calls
- Handle loading states (disable buttons while submitting)
- Display all error messages clearly to user
- Store auth tokens securely (SecureStore, not AsyncStorage for tokens)
- Request GPS permissions before map/report screens
- Request camera/media permissions before upload
- Compute geohash from lat/lng using `ngeohash` library (precision 7)
- Format prices from cents to N$ (divide by 100)
- Format all dates to user's local time (Africa/Windhoek, UTC+2)
- Implement real-time subscriptions for chat and notifications
- Implement pull-to-refresh on all list screens
- Implement infinite scroll pagination on feed and other lists
- Check subscription status before allowing access to File Deck

### Mobile App MUST NOT do:
- Store `SUPABASE_SERVICE_ROLE_KEY` in the app
- Perform direct admin operations without level check
- Bypass RLS by using service role key
- Calculate subscription expiry dates on client (do it server-side or from plan data)
- Write directly to tables that have triggers (always go through proper insert/update flow)

### Session Management in Mobile Context

Since Next.js Server Actions use HTTP-only cookies (not available in React Native), use the **Supabase JS SDK directly** for all operations. The Supabase SDK handles token storage — configure it to use `AsyncStorage` or `SecureStore`:

```javascript
import * as SecureStore from "expo-secure-store"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
)
```

### Required Headers for All Supabase Requests

The Supabase JS SDK handles these automatically when initialized with your URL and anon key:
- `Authorization: Bearer <access_token>`
- `apikey: <anon_key>`
- `Content-Type: application/json`

---

*End of documentation. Version 1.0.0 — 2026-02-25*
