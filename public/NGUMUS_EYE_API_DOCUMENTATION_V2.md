# Ngumus Eye - Complete API Documentation for Mobile Developer

**Version:** 2.0.0
**Last Updated:** February 25, 2026
**Base URL:** `https://app.ngumus-eye.site`

---

## IMPORTANT NOTICE FOR MOBILE DEVELOPERS

This documentation covers **EVERY** API endpoint, page flow, button action, Supabase query, and process required to build the complete Ngumus Eye mobile app. Nothing has been omitted.

### Core Principles:
1. **Backend handles ALL business logic** - No trust score calculations, subscription checks, or access control in mobile app
2. **Mobile app is UI only** - Fetch data, display it, capture input, submit to Supabase or API
3. **Authentication via Supabase session** - Managed automatically by Supabase JS SDK
4. **Use Supabase ANON key only** - NEVER use service role key in mobile app
5. **Real-time features via Supabase Realtime subscriptions** - Group chat, notifications
6. **File uploads via `/api/upload` route** - All media (images, videos) goes through this endpoint

---

## TABLE OF CONTENTS

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Registration Process (Complete Flow)](#2-registration-process-complete-flow)
3. [Password Reset Flow](#3-password-reset-flow)
4. [Feed Page](#4-feed-page)
5. [Incident Detail Page](#5-incident-detail-page)
6. [Report Incident (Create)](#6-report-incident-create)
7. [Map Page](#7-map-page)
8. [File Deck (Case Management)](#8-file-deck-case-management)
9. [Groups & Community](#9-groups--community)
10. [Profile Page](#10-profile-page)
11. [Notifications Page](#11-notifications-page)
12. [Search Page](#12-search-page)
13. [Subscription & Payments](#13-subscription--payments)
14. [Device Tracking](#14-device-tracking)
15. [File Upload API](#15-file-upload-api)
16. [Admin Functions](#16-admin-functions)
17. [Advertisements](#17-advertisements)
18. [Real-Time Subscriptions](#18-real-time-subscriptions)
19. [Common Enums & Status Codes](#19-common-enums--status-codes)
20. [Error Handling](#20-error-handling)
21. [Testing Checklist](#21-testing-checklist)
22. [Mobile App Rules](#22-mobile-app-rules)

---

## 1. AUTHENTICATION & AUTHORIZATION

### 1.1 Login Flow

**Page:** Login Screen
**Supabase Method:** `supabase.auth.signInWithPassword()`

**User Input:**
- Email address (text input)
- Password (password input)

**Request:**
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123"
})
```

**Success Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  }
}
```
- Store session using Supabase SDK's built-in SecureStore adapter
- After login, check if user has active subscription:
  ```javascript
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .maybeSingle()
  ```
- If subscription exists → navigate to `/feed`
- If no subscription → navigate to `/subscribe`

**Error Responses:**
- Invalid credentials: Show "Invalid email or password"
- Email not confirmed: Show "Please verify your email address"

**UI Requirements:**
- Show loading spinner while authenticating
- Disable button while loading
- "Forgot Password?" link navigates to forgot password flow
- "Sign Up" link navigates to registration

---

### 1.2 Sign Out

**Method:** Server Action `signOut()`

```javascript
// Server Action: lib/actions/auth.ts
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
```

**On mobile:**
```javascript
await supabase.auth.signOut()
// Clear local storage/secure store
// Navigate to Login screen
```

---

### 1.3 Session Management

```javascript
// Get current session
const { data: { session } } = await supabase.auth.getSession()

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') { /* navigate to app */ }
  if (event === 'SIGNED_OUT') { /* navigate to login */ }
  if (event === 'PASSWORD_RECOVERY') { /* show reset password form */ }
})
```

---

### 1.4 Middleware Route Protection

The app protects routes based on auth + subscription status:

| Route Pattern | Auth Required | Subscription Required |
|---|---|---|
| `/feed`, `/map`, `/report`, `/groups/*`, `/profile*`, `/notifications`, `/search`, `/incident/*` | Yes | Yes |
| `/case-deck/*` | Yes | Yes |
| `/subscribe` | Yes | No |
| `/admin/*` | Yes | Admin level 4+ |
| `/auth/*` | No | No |

---

## 2. REGISTRATION PROCESS (COMPLETE FLOW)

### 2.1 Step 1: Sign Up Page

**Page:** Sign Up Screen
**Supabase Method:** `supabase.auth.signUp()`

**User Input:**
- Full Name (text input)
- Phone Number (text input)
- Email address (text input)
- Password (password input, min 6 chars)
- Confirm Password (must match)
- Province (dropdown - Namibia provinces)
- ID Number / Passport Number (text input)
- Account Type (dropdown: citizen / business / tourist / law_enforcement)

**Request:**
```javascript
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password123",
  options: {
    data: {
      full_name: "John Doe",
      phone: "+264812345678",
      province: "Khomas",
      id_number: "12345678901",
      account_type: "citizen"
    },
    emailRedirectTo: "https://app.ngumus-eye.site/auth/callback"
  }
})
```

**Success Response:**
- Supabase sends confirmation email
- Navigate to `/auth/sign-up-success` page
- Show: "Check your email to confirm your account"

**Error Responses:**
- `User already registered`: Show "An account with this email already exists"
- Password too short: Show "Password must be at least 6 characters"

---

### 2.2 Step 2: Email Confirmation

- User clicks confirmation link in email
- Link redirects to `/auth/callback?code=...`
- Callback route exchanges code for session:

```javascript
// app/auth/callback/route.ts
const { data, error } = await supabase.auth.exchangeCodeForSession(code)
// On success → redirect to /subscribe or /feed
```

---

### 2.3 Step 3: Profile Auto-Creation

When user confirms email, Supabase trigger `handle_new_user` automatically creates a profile:

```sql
-- Auto-created profile fields:
{
  id: user.id,
  email: user.email,
  full_name: user.raw_user_meta_data.full_name,
  phone: user.raw_user_meta_data.phone,
  province: user.raw_user_meta_data.province,
  id_number: user.raw_user_meta_data.id_number,
  account_type: user.raw_user_meta_data.account_type,
  level: 1,
  trust_score: 50,
  display_name: null  -- User sets this later
}
```

---

### 2.4 Step 4: Set Display Name (Optional)

After first login, prompt user to set a display name:

**Supabase Query:**
```javascript
// lib/actions/profile.ts → updateDisplayName()
const { error } = await supabase
  .from("profiles")
  .update({ display_name: displayName })
  .eq("id", user.id)
```

---

## 3. PASSWORD RESET FLOW

### 3.1 Step 1: Forgot Password Page

**Page:** Forgot Password Screen
**URL:** `/auth/forgot-password`

**User Input:**
- Email address (text input)

**Request:**
```javascript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "https://app.ngumus-eye.site/auth/reset-password"
})
```

**Success:** Show message "Check your email for a password reset link"
**Error:** Show error message from Supabase

**CRITICAL:** The `redirectTo` URL MUST be exactly `https://app.ngumus-eye.site/auth/reset-password`. This is hardcoded and must not use dynamic URLs.

---

### 3.2 Step 2: Reset Password Page

**Page:** Reset Password Screen
**URL:** `/auth/reset-password`

**How it works:**
- User clicks email link → redirected to `/auth/reset-password`
- Page listens for `PASSWORD_RECOVERY` event via `onAuthStateChange`
- Once event fires, show the new password form

**Auth State Listener:**
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    // Show password reset form
    setHasValidSession(true)
  }
})
```

**User Input:**
- New Password (password input, min 8 chars)
- Confirm New Password (must match)

**Submit Request:**
```javascript
const { error } = await supabase.auth.updateUser({
  password: newPassword
})
```

**Success:** Navigate to `/auth/login` with message "Password updated successfully"
**Error:** Show error message

---

## 4. FEED PAGE

### 4.1 Load Feed

**Page:** Main Feed Screen
**URL:** `/feed`

**Supabase Query:**
```javascript
const { data: incidents } = await supabase
  .from("incidents")
  .select(`
    id, title, description, type_id, lat, lng, town,
    geohash, created_at, created_by, area_radius_m,
    upvotes, downvotes, love_count, confirm_count,
    incident_types(id, name, color, icon),
    profiles:created_by(id, display_name, avatar_url, trust_score),
    incident_media(id, path, mime)
  `)
  .order("created_at", { ascending: false })
  .limit(20)
```

**Data Shape per Incident:**
```json
{
  "id": "uuid",
  "title": "Robbery at Shoprite",
  "description": "Armed robbery at Shoprite Wernhil. Suspects fled in white Toyota.",
  "type_id": 3,
  "lat": -22.5597,
  "lng": 17.0832,
  "town": "Windhoek",
  "geohash": "k7fqw2m",
  "created_at": "2026-02-25T10:00:00Z",
  "created_by": "uuid",
  "upvotes": 12,
  "downvotes": 1,
  "love_count": 5,
  "confirm_count": 8,
  "incident_types": {
    "id": 3,
    "name": "Robbery",
    "color": "#EF4444",
    "icon": "shield-alert"
  },
  "profiles": {
    "id": "uuid",
    "display_name": "John D.",
    "avatar_url": "https://...",
    "trust_score": 75
  },
  "incident_media": [
    { "id": "uuid", "path": "incident-media/uuid/photo.jpg", "mime": "image/jpeg" }
  ]
}
```

**Pagination:**
```javascript
// Load more (page 2+)
const { data } = await supabase
  .from("incidents")
  .select("...", { count: "exact" })
  .order("created_at", { ascending: false })
  .range(offset, offset + 19)  // 20 per page
```

**Filters available:**
- By incident type: `.eq("type_id", typeId)`
- By town: `.eq("town", town)`
- By date range: `.gte("created_at", startDate).lte("created_at", endDate)`

---

### 4.2 Advertisements in Feed

Ads are injected between every 5 incidents.

**Supabase Query (Server Action `getActiveAds()`):**
```javascript
const { data: ads } = await supabase
  .from("ad_inventory")
  .select("id, title, description, media_url, media_type, target_url, display_priority")
  .eq("is_active", true)
  .lte("start_date", now)
  .gte("end_date", now)
  .order("display_priority", { ascending: false })
  .limit(10)
```

**Track Ad View (Server Action `trackAdView()`):**
```javascript
await supabase.from("ad_views").insert({
  ad_id: adId,
  user_id: userId || null
})
```

---

## 5. INCIDENT DETAIL PAGE

### 5.1 Load Incident Detail

**Page:** Incident Detail Screen
**URL:** `/incident/[id]`

**Supabase Query:**
```javascript
const { data: incident } = await supabase
  .from("incidents")
  .select(`
    *,
    incident_types(id, name, color, icon),
    profiles:created_by(id, display_name, avatar_url, trust_score),
    incident_media(id, path, mime),
    incident_reactions(id, user_id, reaction_type)
  `)
  .eq("id", incidentId)
  .single()
```

**Load Comments:**
```javascript
// lib/actions/comments.ts → getComments()
const { data: comments } = await supabase
  .from("comments")
  .select(`
    *,
    profiles:author(display_name, avatar_url)
  `)
  .eq("incident_id", incidentId)
  .order("created_at", { ascending: true })
```

---

### 5.2 Reactions (Upvote / Downvote / Love / Confirm)

**Server Action:** `toggleReaction()` in `lib/actions/incidents.ts`

**Toggle logic:**
1. Check if reaction exists:
   ```javascript
   const { data: existing } = await supabase
     .from("incident_reactions")
     .select("id")
     .eq("incident_id", incidentId)
     .eq("user_id", user.id)
     .eq("reaction_type", kind)  // "upvote" | "downvote" | "love" | "confirm"
     .maybeSingle()
   ```
2. If exists → DELETE it (toggle off)
3. If not exists → INSERT it (toggle on)

**Reaction Types:**
| type | Icon | Label |
|---|---|---|
| `upvote` | ThumbsUp | Upvote |
| `downvote` | ThumbsDown | Downvote |
| `love` | Heart | Love |
| `confirm` | CheckCircle | Confirm |

**Note:** Reaction counts (`upvotes`, `downvotes`, `love_count`, `confirm_count`) on the `incidents` table are updated automatically by database triggers.

---

### 5.3 Add Comment

**Server Action:** `addComment()` in `lib/actions/incidents.ts`

**User Input:**
- Comment text (text input)
- Optional image (file picker)

**Request:**
```javascript
// With image:
// 1. First upload image to /api/upload
// 2. Then create comment with imageUrl

const { data: comment } = await supabase
  .from("comments")
  .insert({
    incident_id: incidentId,
    author: user.id,
    body: text,
    image_url: imageUrl || null  // from /api/upload response
  })
  .select("id, body, created_at, author, image_url")
  .single()
```

---

## 6. REPORT INCIDENT (CREATE)

### 6.1 Report Page

**Page:** Report Incident Screen
**URL:** `/report`

**Step 1: Get incident types for dropdown:**
```javascript
const { data: types } = await supabase
  .from("incident_types")
  .select("id, name, color, icon")
  .order("name")
```

**User Input:**
- Incident Type (dropdown from incident_types)
- Title (text input, required)
- Description (textarea, optional)
- Town (text input, optional)
- Location (map picker → returns lat/lng)
- Area Radius in meters (slider, default 200m)
- Photos/Videos (file picker, multiple, optional)

---

### 6.2 Submit Incident

**Server Action:** `createIncident()` in `lib/actions/incidents.ts`

**Request:**
```javascript
const incidentData = {
  type_id: selectedTypeId,        // number
  title: "Robbery at Shoprite",
  description: "Optional details...",
  town: "Windhoek",
  lat: -22.5597,
  lng: 17.0832,
  area_radius_m: 200
}
```

**What happens server-side:**
1. Authenticates user
2. Computes geohash from lat/lng (precision 7)
3. Inserts into `incidents` table
4. Creates initial `incident_events` entry with kind: "note"
5. Returns the created incident

**Supabase Insert:**
```javascript
const { data: incident } = await supabase
  .from("incidents")
  .insert({
    type_id: data.type_id,
    title: data.title,
    description: data.description,
    town: data.town,
    lat: data.lat,
    lng: data.lng,
    geohash: geohash,  // computed server-side
    area_radius_m: data.area_radius_m || 200,
    created_by: user.id
  })
  .select()
  .single()
```

---

### 6.3 Upload Incident Media

**Server Action:** `uploadIncidentMedia()` in `lib/actions/incidents.ts`

After creating incident, upload media files:

```javascript
// For each file:
// 1. Upload to Supabase Storage bucket "incident-media"
const { error } = await supabase.storage
  .from("incident-media")
  .upload(`${user.id}/${incidentId}/${timestamp}-${random}.${ext}`, file, {
    cacheControl: "3600",
    upsert: false
  })

// 2. Get public URL
const { data } = supabase.storage
  .from("incident-media")
  .getPublicUrl(fileName)

// 3. Save media record
await supabase.from("incident_media").insert({
  incident_id: incidentId,
  path: fileName,
  mime: file.type
})
```

**File constraints:**
- Images: max 10MB
- Videos: max 50MB (via `/api/upload` route)
- Allowed types: image/*, video/*

---

## 7. MAP PAGE

### 7.1 Load Map Incidents

**Page:** Map Screen
**URL:** `/map`

**Supabase Query:**
```javascript
const { data: incidents } = await supabase
  .from("incidents")
  .select(`
    id, title, lat, lng, type_id, created_at, town,
    incident_types(id, name, color, icon)
  `)
  .not("lat", "is", null)
  .not("lng", "is", null)
  .order("created_at", { ascending: false })
  .limit(500)
```

**Map Display:**
- Use MapLibre GL or Mapbox for map rendering
- Each incident = colored pin using `incident_types.color`
- Cluster pins when zoomed out
- Tap pin → show incident card overlay
- Tap card → navigate to incident detail

---

## 8. FILE DECK (CASE MANAGEMENT)

> Note: The UI calls these "Files" / "File Deck". The database table is still called `cases`. When communicating with the API/database use `cases`. In UI only, show "Files".

### 8.1 Load User Files

**Page:** File Deck Screen
**URL:** `/case-deck`

**Server Action:** `getUserCases()` in `lib/actions/cases.ts`

**Supabase Query:**
```javascript
const { data: cases } = await supabase
  .from("cases")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
```

**Data Shape:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "case_number": "CASE-2026-123456",
  "serial_number": "CASE-2026-123456",
  "category": "theft",
  "title": "Phone stolen at mall",
  "description": "Details of the incident...",
  "status": "open",
  "priority": "high",
  "police_cr_number": "CR/123/2026",
  "vehicle_number_plate": "N 12345 W",
  "serial_numbers": ["IMEI123456789"],
  "stolen_item_reference": "iPhone 14 Pro",
  "reporter_name": "John Doe",
  "reporter_phone": "+264812345678",
  "reporter_email": "john@example.com",
  "location_address": "Wernhil Park, Windhoek",
  "town": "Windhoek",
  "evidence": [],
  "documents": [],
  "files": [],
  "created_at": "2026-02-25T10:00:00Z"
}
```

**Stats to compute from array:**
- Active Files: `cases.filter(c => !["closed","archived"].includes(c.status)).length`
- New: `cases.filter(c => c.status === "new").length`
- In Progress: `cases.filter(c => c.status === "in_progress").length`
- Closed: `cases.filter(c => ["closed","archived"].includes(c.status)).length`

---

### 8.2 Create New File

**Page:** New File Screen
**URL:** `/case-deck/new`

**Server Action:** `createCase()` in `lib/actions/cases.ts`

**User Input:**
- Category (dropdown - see categories below)
- Title (text input, required)
- Description (textarea, required)
- Priority (dropdown: low / medium / high / urgent)
- Police CR Number (text input, optional)
- Vehicle Number Plate (text input, optional)
- Serial Numbers (multiline text, one per line, optional)
- Stolen Item Reference (text input, optional)
- Location Address (text input, optional)
- Town (text input, optional)
- Evidence Images (multiple file picker, optional)
- Documents (multiple file picker, optional)

**File Categories:**
```javascript
const CATEGORIES = [
  { value: "theft", label: "Theft" },
  { value: "robbery", label: "Robbery" },
  { value: "assault", label: "Assault" },
  { value: "fraud", label: "Fraud" },
  { value: "vandalism", label: "Vandalism" },
  { value: "missing_person", label: "Missing Person" },
  { value: "vehicle_accident", label: "Vehicle Accident" },
  { value: "drug_related", label: "Drug Related" },
  { value: "cybercrime", label: "Cybercrime" },
  { value: "domestic_violence", label: "Domestic Violence" },
  { value: "other", label: "Other" }
]
```

**Server-side logic:**
1. Gets reporter name/phone/email from `profiles` table
2. Generates case_number: `CASE-${year}-${random6digits}`
3. Inserts into `cases` table
4. Uploads evidence images to Vercel Blob: `case-evidence/${caseId}/${filename}`
5. Uploads documents to Vercel Blob: `case-documents/${caseId}/${filename}`
6. Updates `evidence` and `documents` JSONB arrays on case

---

### 8.3 View File Detail

**Page:** File Detail Screen
**URL:** `/case-deck/[id]`

**Server Action:** `getCaseDetails()` in `lib/actions/cases.ts`

```javascript
const { data: caseData } = await supabase
  .from("cases")
  .select("*")
  .eq("id", caseId)
  .eq("user_id", user.id)  // User can only see their own files
  .single()

// Returns:
{
  case: { ...all case fields },
  evidence: caseData.evidence || [],    // Array of uploaded evidence
  documents: caseData.documents || [],  // Array of uploaded documents
  files: caseData.files || []           // Array of additional files
}
```

---

### 8.4 Upload Evidence to File

**Server Action:** `uploadCaseFile()` in `lib/actions/cases.ts`

```javascript
// fileType: "evidence" | "document" | "file"
const blob = await put(`case-${fileType}s/${caseId}/${file.name}`, file, {
  access: "public"
})

// For evidence:
await supabase.from("cases").update({
  evidence: [...currentEvidence, {
    id: crypto.randomUUID(),
    file_url: blob.url,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    description: "Evidence photo/video",
    uploaded_at: new Date().toISOString()
  }]
}).eq("id", caseId)
```

---

### 8.5 File Status Values

```javascript
const FILE_STATUS = {
  "open":        { label: "Open",        color: "#3B82F6" },  // blue
  "new":         { label: "New",         color: "#EAB308" },  // yellow
  "in_progress": { label: "In Progress", color: "#A855F7" },  // purple
  "assigned":    { label: "Assigned",    color: "#3B82F6" },  // blue
  "closed":      { label: "Closed",      color: "#22C55E" },  // green
  "archived":    { label: "Archived",    color: "#6B7280" }   // grey
}
```

---

### 8.6 Device Tracking (Sub-page)

**Page:** Device Tracking Screen
**URL:** `/case-deck/devices`

**Load Devices:**
```javascript
// lib/actions/devices.ts → getUserDevices()
const { data: devices } = await supabase
  .from("tracked_devices")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
```

**Register New Device:**
```javascript
// lib/actions/devices.ts → registerDevice()
await supabase.from("tracked_devices").insert({
  user_id: user.id,
  device_name: deviceName,
  device_type: deviceType,   // "phone" | "laptop" | "tablet" | "other"
  imei: imei,
  serial_number: serialNumber,
  status: "active"
})
```

**Report Device Stolen:**
```javascript
// lib/actions/devices.ts → reportDeviceStolen()
await supabase
  .from("tracked_devices")
  .update({
    status: "stolen",
    reported_stolen_at: new Date().toISOString()
  })
  .eq("id", deviceId)
  .eq("user_id", user.id)
```

**Device Status Values:**
```javascript
const DEVICE_STATUS = {
  "active":  { label: "Active",  color: "#22C55E" },
  "stolen":  { label: "Stolen",  color: "#EF4444" },
  "found":   { label: "Found",   color: "#3B82F6" },
  "inactive":{ label: "Inactive",color: "#6B7280" }
}
```

---

## 9. GROUPS & COMMUNITY

### 9.1 Load Groups List

**Page:** Groups Screen
**URL:** `/groups`

**Supabase Query:**
```javascript
const { data: groups } = await supabase
  .from("groups")
  .select(`
    id, name, geohash_prefix, visibility, created_at, created_by,
    negative_reports,
    group_members(count)
  `)
  .order("created_at", { ascending: false })

// Check which groups user has joined:
const { data: memberships } = await supabase
  .from("group_members")
  .select("group_id")
  .eq("user_id", user.id)

// Check pending requests:
const { data: pendingRequests } = await supabase
  .from("group_requests")
  .select("group_id")
  .eq("user_id", user.id)
  .eq("status", "pending")
```

---

### 9.2 Create Group

**Page:** Create Group Screen
**URL:** `/groups/create`

**Server Action:** `createGroup()` in `lib/actions/groups.ts`

**User Input:**
- Group Name (text input, required)
- Location Geohash Prefix (from map picker or auto from user location)
- Visibility (radio: public / private)

**Request:**
```javascript
// Checks if group name already exists first
// Then calls Supabase RPC:
const { data: groupId } = await supabase.rpc("create_group_with_creator", {
  p_name: data.name,
  p_geohash_prefix: data.geohash_prefix,
  p_visibility: data.visibility  // "public" | "private"
})
```

**RPC returns:** new group UUID

**On success:** Navigate to `/groups/${groupId}`

---

### 9.3 Join Group

**Server Action:** `joinGroup()` in `lib/actions/groups.ts`

```javascript
const { data } = await supabase.rpc("request_join_group", {
  p_group_id: groupId
})
// Returns: { success: true, message: "...", is_member: bool, request_pending: bool }
```

**Group Visibility Logic:**
- `public` group: User is added directly as member
- `private` group: Request goes to `group_requests` with status "pending", awaiting creator approval

---

### 9.4 Leave Group

**Server Action:** `leaveGroup()` in `lib/actions/groups.ts`

```javascript
await supabase
  .from("group_members")
  .delete()
  .eq("group_id", groupId)
  .eq("user_id", user.id)
```

---

### 9.5 Group Detail & Chat

**Page:** Group Detail Screen
**URL:** `/groups/[id]`

**Load group + messages:**
```javascript
// Get group info
const { data: group } = await supabase
  .from("groups")
  .select(`
    id, name, visibility, created_by, geohash_prefix,
    group_members(user_id, role, joined_at,
      profiles(id, display_name, avatar_url)
    )
  `)
  .eq("id", groupId)
  .single()

// Get messages (most recent 50)
const { data: messages } = await supabase
  .from("group_messages")
  .select(`
    id, message, image_url, video_url, created_at, user_id,
    profiles:user_id(id, display_name, avatar_url)
  `)
  .eq("group_id", groupId)
  .order("created_at", { ascending: false })
  .limit(50)
```

**Send Message:**
```javascript
// lib/actions/groups.ts → sendGroupMessage()
// Must be a group member

await supabase.from("group_messages").insert({
  group_id: groupId,
  user_id: user.id,
  message: text || null,
  image_url: imageUrl || null,  // from /api/upload
  video_url: videoUrl || null   // from /api/upload
})
```

**Delete Own Message:**
```javascript
// lib/actions/groups.ts → deleteGroupMessage()
await supabase
  .from("group_messages")
  .delete()
  .eq("id", messageId)
  .eq("user_id", user.id)  // Can only delete own messages
```

**Real-time chat subscription:**
```javascript
const channel = supabase
  .channel(`group-${groupId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "group_messages",
    filter: `group_id=eq.${groupId}`
  }, (payload) => {
    // Add new message to list
    setMessages(prev => [...prev, payload.new])
  })
  .subscribe()

// Cleanup:
return () => supabase.removeChannel(channel)
```

---

### 9.6 Manage Join Requests (Creator Only)

**Server Action:** `getPendingRequests()` in `lib/actions/groups.ts`

```javascript
// Get pending requests (creator only):
const { data: requests } = await supabase
  .from("group_requests")
  .select("id, user_id, created_at")
  .eq("group_id", groupId)
  .eq("status", "pending")
  .order("created_at", { ascending: true })
```

**Approve Request:**
```javascript
// lib/actions/groups.ts → approveRequest()
const { data } = await supabase.rpc("approve_group_request", {
  p_request_id: requestId
})
// Returns: { success: true, message: "...", user_name: "...", group_name: "..." }
```

**Reject Request:**
```javascript
// lib/actions/groups.ts → rejectRequest()
await supabase
  .from("group_requests")
  .update({ status: "rejected", updated_at: new Date().toISOString() })
  .eq("id", requestId)
```

---

### 9.7 Remove Member (Creator Only)

```javascript
// lib/actions/groups.ts → removeMember()
const { data } = await supabase.rpc("remove_group_member", {
  p_group_id: groupId,
  p_user_id_to_remove: userId
})
```

---

### 9.8 Report Group

```javascript
// lib/actions/groups.ts → reportGroup()
// User must be a member to report
// User can only report once per group

await supabase.from("group_reports").insert({
  group_id: groupId,
  user_id: user.id
})
// Also increments groups.negative_reports via RPC
```

---

## 10. PROFILE PAGE

### 10.1 Load Own Profile

**Page:** My Profile Screen
**URL:** `/profile`

**Supabase Query:**
```javascript
// lib/actions/profile.ts → getProfile()
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single()
```

**Profile Data Shape:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "display_name": "John D.",
  "phone": "+264812345678",
  "province": "Khomas",
  "id_number": "12345678901",
  "account_type": "citizen",
  "avatar_url": "https://public.blob.vercel-storage.com/avatars/...",
  "level": 1,
  "trust_score": 75,
  "created_at": "2026-01-01T00:00:00Z"
}
```

**Also load:**
```javascript
// Follower / Following counts
const [followersResult, followingResult] = await Promise.all([
  supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", userId),
  supabase.from("user_follows").select("id", { count: "exact" }).eq("follower_id", userId)
])
// followers: followersResult.count
// following: followingResult.count

// Active subscription
const { data: subscription } = await supabase
  .from("user_subscriptions")
  .select("*, plans(*)")
  .eq("user_id", user.id)
  .gte("expires_at", new Date().toISOString())
  .order("expires_at", { ascending: false })
  .maybeSingle()

// User's incidents count
const { count: incidentCount } = await supabase
  .from("incidents")
  .select("id", { count: "exact" })
  .eq("created_by", user.id)
```

---

### 10.2 Profile Page Buttons

| Button | Action |
|---|---|
| Edit Display Name | Opens dialog → calls `updateDisplayName()` |
| Upload Avatar | File picker → calls `uploadAvatar()` |
| View Followers | Opens followers dialog |
| View Following | Opens following dialog |
| Redeem Voucher | Opens voucher dialog → calls `redeemVoucher()` |
| View Subscription | Shows plan details + expiry |
| Sign Out | Calls `signOut()` |

---

### 10.3 Upload Avatar

**Server Action:** `uploadAvatar()` in `lib/actions/profile.ts`

```javascript
// Upload to Vercel Blob:
const blob = await put(`avatars/${user.id}-${Date.now()}.jpg`, file, {
  access: "public"
})

// Update profile:
await supabase
  .from("profiles")
  .update({ avatar_url: blob.url })
  .eq("id", user.id)
```

---

### 10.4 Follow / Unfollow User

**Follow:**
```javascript
// lib/actions/profile.ts → followUser()
await supabase.from("user_follows").insert({
  follower_id: user.id,
  following_id: targetUserId
})
// Also creates notification for the followed user
await supabase.from("notifications").insert({
  user_id: targetUserId,
  type: "new_follower",
  metadata: { follower_id: user.id },
  is_read: false
})
```

**Unfollow:**
```javascript
// lib/actions/profile.ts → unfollowUser()
await supabase
  .from("user_follows")
  .delete()
  .eq("follower_id", user.id)
  .eq("following_id", targetUserId)
```

---

### 10.5 View Other User's Profile

**Page:** Other User Profile Screen
**URL:** `/profile/[id]`

Same queries as own profile but:
- Uses the target `userId` from URL params
- Shows Follow/Unfollow button instead of Edit button
- Check if current user follows them:
  ```javascript
  const { data: followRecord } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", currentUser.id)
    .eq("following_id", targetUserId)
    .maybeSingle()
  // isFollowing = !!followRecord
  ```

---

### 10.6 Redeem Voucher

**Server Action:** `redeemVoucher()` in `lib/actions/vouchers.ts`

```javascript
const { data } = await supabase.rpc("redeem_voucher", {
  voucher_code: voucherCode
})
// Returns subscription details if successful
```

---

### 10.7 User Trust Score Display

```javascript
const TRUST_SCORE_DISPLAY = {
  0-20:   { label: "Very Low",  color: "#EF4444" },  // red
  21-40:  { label: "Low",       color: "#F97316" },  // orange
  41-60:  { label: "Fair",      color: "#EAB308" },  // yellow
  61-80:  { label: "Good",      color: "#22C55E" },  // green
  81-100: { label: "Excellent", color: "#3B82F6" }   // blue
}
```

---

### 10.8 User Levels

```javascript
const USER_LEVELS = {
  1: { label: "Community Member", badge: "🏘️" },
  2: { label: "Trusted Reporter",  badge: "⭐" },
  3: { label: "Community Lead",    badge: "🛡️" },
  4: { label: "Moderator",         badge: "⚖️" },
  5: { label: "Administrator",     badge: "👑" }
}
// Level 4+ = admin access
```

---

## 11. NOTIFICATIONS PAGE

### 11.1 Load Notifications

**Page:** Notifications Screen
**URL:** `/notifications`

**Supabase Query:**
```javascript
const { data: notifications } = await supabase
  .from("notifications")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .limit(50)
```

**Notification Shape:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "new_follower",
  "metadata": { "follower_id": "uuid" },
  "is_read": false,
  "created_at": "2026-02-25T10:00:00Z"
}
```

**Mark as Read:**
```javascript
await supabase
  .from("notifications")
  .update({ is_read: true })
  .eq("id", notificationId)
```

**Mark All as Read:**
```javascript
await supabase
  .from("notifications")
  .update({ is_read: true })
  .eq("user_id", user.id)
  .eq("is_read", false)
```

**Notification Types:**
| type | Display |
|---|---|
| `new_follower` | "{user} started following you" |
| `incident_comment` | "New comment on your incident" |
| `incident_reaction` | "Someone reacted to your incident" |
| `group_request_approved` | "Your request to join {group} was approved" |
| `group_message` | "New message in {group}" |
| `subscription_expiring` | "Your subscription expires soon" |

**Unread count badge** (for navigation tab):
```javascript
const { count } = await supabase
  .from("notifications")
  .select("id", { count: "exact" })
  .eq("user_id", user.id)
  .eq("is_read", false)
```

---

## 12. SEARCH PAGE

### 12.1 Search

**Page:** Search Screen
**URL:** `/search`

**Search incidents by keyword:**
```javascript
const { data: results } = await supabase
  .from("incidents")
  .select(`
    id, title, description, type_id, town, created_at,
    incident_types(name, color),
    profiles:created_by(display_name, avatar_url)
  `)
  .or(`title.ilike.%${query}%,description.ilike.%${query}%,town.ilike.%${query}%`)
  .order("created_at", { ascending: false })
  .limit(20)
```

**Search users by display name:**
```javascript
const { data: users } = await supabase
  .from("profiles")
  .select("id, display_name, avatar_url, trust_score, level")
  .ilike("display_name", `%${query}%`)
  .limit(10)
```

---

## 13. SUBSCRIPTION & PAYMENTS

### 13.1 Load Subscription Plans

**Page:** Subscribe Screen
**URL:** `/subscribe`

**Server Action:** `getSubscriptionPackages()` in `lib/actions/subscriptions.ts`

```javascript
const { data: packages } = await supabase
  .from("plans")
  .select("*")
  .order("price_cents", { ascending: true })
```

**Plan Data Shape:**
```json
{
  "id": 1,
  "name": "Weekly Plan",
  "code": "WEEKLY",
  "price_cents": 1200,
  "period_days": 7,
  "description": "7-day access",
  "features": ["Full feed access", "Incident reporting", "Group chat"]
}
```

**Display price:** `plan.price_cents / 100` → format as "N$12.00"

---

### 13.2 Activate Subscription

**Server Action:** `createSubscription()` in `lib/actions/subscriptions.ts`

**User provides:**
- Payment reference number (proof of EFT/cash payment)

**Request:**
```javascript
// Gets plan details first
const { data: plan } = await supabase
  .from("plans")
  .select("*")
  .eq("id", planId)
  .single()

// Creates subscription:
const startDate = new Date()
const expiryDate = new Date(startDate)
expiryDate.setDate(expiryDate.getDate() + plan.period_days)

await supabase.from("user_subscriptions").insert({
  user_id: user.id,
  plan_id: planId,
  started_at: startDate.toISOString(),
  expires_at: expiryDate.toISOString(),
  status: "active",
  payment_reference: paymentReference
})
```

**On success:** Navigate to `/feed`

---

### 13.3 Get User Subscription

**Server Action:** `getUserSubscription()` in `lib/actions/subscriptions.ts`

```javascript
const { data: subscription } = await supabase
  .from("user_subscriptions")
  .select("*, plans(*)")
  .eq("user_id", user.id)
  .gte("expires_at", new Date().toISOString())
  .order("expires_at", { ascending: false })
  .maybeSingle()
```

**Display:**
- Plan name: `subscription.plans.name`
- Expires: formatted `subscription.expires_at`
- Days remaining: `Math.ceil((new Date(subscription.expires_at) - new Date()) / (1000 * 60 * 60 * 24))`

---

### 13.4 Cancel Subscription

**Server Action:** `cancelSubscription()` in `lib/actions/subscriptions.ts`

```javascript
await supabase
  .from("user_subscriptions")
  .update({ status: "cancelled", auto_renew: false })
  .eq("user_id", user.id)
  .eq("status", "active")
```

---

## 14. DEVICE TRACKING

See section 8.6 for full device tracking documentation.

**Additional Note - Device Types:**
```javascript
const DEVICE_TYPES = [
  { value: "phone",   label: "Mobile Phone" },
  { value: "laptop",  label: "Laptop / Computer" },
  { value: "tablet",  label: "Tablet" },
  { value: "camera",  label: "Camera" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other",   label: "Other" }
]
```

---

## 15. FILE UPLOAD API

### 15.1 Upload Endpoint

**HTTP Route:** `POST /api/upload`

**Use this for:** incident media, group chat images/videos, comment images

**Request:** `multipart/form-data`
- `file`: The file to upload (image or video)

**Constraints:**
- Images: max 10MB
- Videos: max 50MB
- Allowed MIME types: `image/*`, `video/*`

**Success Response (200):**
```json
{
  "url": "https://public.blob.vercel-storage.com/filename-hash.jpg"
}
```

**Error Response (400):**
```json
{
  "error": "File too large. Maximum size is 10MB"
}
```

**Example usage in mobile:**
```javascript
const formData = new FormData()
formData.append("file", {
  uri: localFileUri,
  type: "image/jpeg",
  name: "photo.jpg"
})

const response = await fetch("https://app.ngumus-eye.site/api/upload", {
  method: "POST",
  body: formData
})
const { url } = await response.json()
// Use url for storing in database
```

---

## 16. ADMIN FUNCTIONS

> Admin routes require `profiles.level >= 4`. All admin pages are at `/admin/*`.

### 16.1 Admin Dashboard

**URL:** `/admin`

**Stats loaded:**
```javascript
// Total users
const { count: userCount } = await supabase
  .from("profiles")
  .select("id", { count: "exact" })

// Total incidents
const { count: incidentCount } = await supabase
  .from("incidents")
  .select("id", { count: "exact" })

// Active subscriptions
const { count: subCount } = await supabase
  .from("user_subscriptions")
  .select("id", { count: "exact" })
  .eq("status", "active")
  .gte("expires_at", new Date().toISOString())

// Active groups
const { count: groupCount } = await supabase
  .from("groups")
  .select("id", { count: "exact" })
```

---

### 16.2 Admin: User Management

**URL:** `/admin/users`

```javascript
const { data: users } = await supabase
  .from("profiles")
  .select(`
    id, email, full_name, display_name, level,
    trust_score, account_type, created_at,
    user_subscriptions(status, expires_at, plans(name))
  `)
  .order("created_at", { ascending: false })
```

**Update User Level:**
```javascript
await supabase
  .from("profiles")
  .update({ level: newLevel })
  .eq("id", userId)
```

---

### 16.3 Admin: Incident Triage

**URL:** `/admin/triage`

```javascript
const { data: incidents } = await supabase
  .from("incidents")
  .select(`
    *, incident_types(name, color),
    profiles:created_by(display_name)
  `)
  .order("created_at", { ascending: false })
```

---

### 16.4 Admin: Billing / Vouchers

**URL:** `/admin/billing`

**Generate Voucher (Server Action `generateVoucher()`):**
```javascript
// Admin only (level 4+)
// Generates code: "PLN-12345-ABC123"
await supabase.from("vouchers").insert({
  code: generatedCode,
  plan_id: planId,
  days: customDays || null,
  issued_to_email: email
})
```

---

### 16.5 Admin: Evidence Management

**URL:** `/admin/evidence`

```javascript
// Load all case evidence across all users
const { data: cases } = await supabase
  .from("cases")
  .select("id, case_number, title, evidence, documents, user_id, created_at")
  .order("created_at", { ascending: false })
```

---

### 16.6 Admin: Groups Management

**URL:** `/admin/groups`

```javascript
const { data: groups } = await supabase
  .from("groups")
  .select(`
    id, name, visibility, negative_reports, created_at,
    group_members(count)
  `)
  .order("negative_reports", { ascending: false })
```

**Delete group with high reports:**
```javascript
await supabase.from("groups").delete().eq("id", groupId)
```

---

### 16.7 Admin: Audit Log

**URL:** `/admin/audit`

```javascript
const { data: events } = await supabase
  .from("incident_events")
  .select(`
    id, kind, data, created_at,
    profiles:actor(display_name)
  `)
  .order("created_at", { ascending: false })
  .limit(100)
```

---

## 17. ADVERTISEMENTS

### 17.1 Ad Inventory Schema

```json
{
  "id": "uuid",
  "title": "Summer Sale",
  "description": "Up to 50% off at City Centre",
  "media_url": "https://...",
  "media_type": "image",       // "image" | "video"
  "target_url": "https://advertiser.com",
  "display_priority": 5,
  "is_active": true,
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-03-31T00:00:00Z"
}
```

### 17.2 Displaying Ads

- Inject 1 ad card after every 5 incident cards in the feed
- Tap ad → open `target_url` in in-app browser
- Track view automatically on render:
  ```javascript
  await trackAdView(ad.id, currentUser?.id)
  ```

---

## 18. REAL-TIME SUBSCRIPTIONS

### 18.1 Group Chat - Real-time Messages

```javascript
const channel = supabase
  .channel(`group-chat-${groupId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "group_messages",
    filter: `group_id=eq.${groupId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new])
  })
  .subscribe()

return () => supabase.removeChannel(channel)
```

---

### 18.2 Notifications - Real-time

```javascript
const channel = supabase
  .channel(`notifications-${userId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "notifications",
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    setUnreadCount(prev => prev + 1)
    showPushNotification(payload.new)
  })
  .subscribe()
```

---

### 18.3 Feed - Real-time New Incidents

```javascript
const channel = supabase
  .channel("new-incidents")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "incidents"
  }, (payload) => {
    // Show "New incident reported" banner
    setNewIncidentAvailable(true)
  })
  .subscribe()
```

---

## 19. COMMON ENUMS & STATUS CODES

### 19.1 Account Types

```javascript
const ACCOUNT_TYPES = {
  "citizen":         { label: "Citizen",         color: "#3B82F6" },
  "business":        { label: "Business",         color: "#8B5CF6" },
  "tourist":         { label: "Tourist",          color: "#F97316" },
  "law_enforcement": { label: "Law Enforcement",  color: "#1D4ED8" }
}
```

### 19.2 Case / File Priority

```javascript
const CASE_PRIORITY = {
  "low":    { label: "Low",    color: "#22C55E" },
  "medium": { label: "Medium", color: "#EAB308" },
  "high":   { label: "High",   color: "#F97316" },
  "urgent": { label: "Urgent", color: "#EF4444" }
}
```

### 19.3 Incident Types (from DB)

Loaded dynamically from `incident_types` table. Common examples:

| id | name | color |
|---|---|---|
| 1 | Theft | #EF4444 |
| 2 | Assault | #DC2626 |
| 3 | Robbery | #B91C1C |
| 4 | Vandalism | #F97316 |
| 5 | Suspicious Activity | #EAB308 |
| 6 | Missing Person | #3B82F6 |
| 7 | Vehicle Accident | #8B5CF6 |
| 8 | Drug Activity | #6366F1 |

### 19.4 Group Visibility

```javascript
const GROUP_VISIBILITY = {
  "public":  { label: "Public",  description: "Anyone can join" },
  "private": { label: "Private", description: "Requires approval to join" }
}
```

### 19.5 Subscription Status

```javascript
const SUBSCRIPTION_STATUS = {
  "active":    { label: "Active",    color: "#22C55E" },
  "expired":   { label: "Expired",   color: "#EF4444" },
  "cancelled": { label: "Cancelled", color: "#6B7280" }
}
```

---

## 20. ERROR HANDLING

### 20.1 Supabase Error Codes

| Code | Meaning | Action |
|---|---|---|
| `PGRST116` | No rows found | Show empty state |
| `23505` | Unique constraint violation | Show "already exists" message |
| `42501` | RLS policy violation | Show "permission denied" |
| `PGRST301` | JWT expired | Refresh session or redirect to login |

### 20.2 HTTP Status Codes (for `/api/upload`)

| Status | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request (no file, file too large, wrong type) |
| 401 | Not authenticated |
| 500 | Server error |

### 20.3 Error Handling Best Practices

1. **Always check for error in Supabase response** before using data
2. **Handle null sessions** - redirect to login if `supabase.auth.getUser()` returns null
3. **Show user-friendly messages** - never expose database errors
4. **Network errors** - Show "Connection error. Please check your internet connection."
5. **Retry on 5xx** - Auto-retry once after 2 seconds
6. **Log for debugging** - Use `console.log("[DEBUG] ...")` in development only

### 20.4 Session Expiry Handling

```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "TOKEN_REFRESHED") {
    // Session refreshed automatically - no action needed
  }
  if (event === "SIGNED_OUT") {
    // Navigate to login
    router.replace("/auth/login")
  }
})
```

---

## 21. TESTING CHECKLIST

### 21.1 Authentication
- [ ] Sign up with new email works
- [ ] Confirmation email is received
- [ ] Email confirmation redirect works
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Sign out clears session
- [ ] Forgot password email is received
- [ ] Password reset link redirects to reset page
- [ ] PASSWORD_RECOVERY event fires correctly
- [ ] New password can be set successfully

### 21.2 Feed
- [ ] Feed loads with incidents
- [ ] Incidents show correct type, color, icon
- [ ] Reporter name and avatar display
- [ ] Incident images display
- [ ] Reaction buttons work (toggle on/off)
- [ ] Reaction counts update
- [ ] Ads display every 5 incidents
- [ ] Tap incident navigates to detail
- [ ] Feed pagination / load more works

### 21.3 Incident Detail
- [ ] Full incident details load
- [ ] Map pin shows correct location
- [ ] Comments load
- [ ] Can add text comment
- [ ] Can add comment with image
- [ ] All 4 reaction types work

### 21.4 Report Incident
- [ ] Incident type dropdown loads
- [ ] Map/location picker works
- [ ] Form validation works
- [ ] Incident submits successfully
- [ ] Images upload and attach
- [ ] Redirects to feed after submit

### 21.5 File Deck (Case Management)
- [ ] Files list loads
- [ ] Active/Closed counts are correct
- [ ] "No active files" empty state shows
- [ ] Create new file form works
- [ ] All categories available
- [ ] Evidence upload works
- [ ] Document upload works
- [ ] File detail page loads
- [ ] Case number displays correctly

### 21.6 Groups
- [ ] Groups list loads
- [ ] Public group: join immediately
- [ ] Private group: sends request
- [ ] Join request pending state shows
- [ ] Creator sees pending requests
- [ ] Creator can approve/reject
- [ ] Approved user can chat
- [ ] Non-member cannot send messages
- [ ] Real-time messages appear instantly
- [ ] Can delete own messages
- [ ] Report group works (member only)
- [ ] Can leave group

### 21.7 Profile
- [ ] Profile data loads
- [ ] Avatar displays
- [ ] Follow counts show
- [ ] Subscription status shows
- [ ] Can update display name
- [ ] Can upload new avatar
- [ ] Follow button works on other profiles
- [ ] Unfollow works
- [ ] Voucher redemption works
- [ ] Sign out works

### 21.8 Notifications
- [ ] Notifications list loads
- [ ] Unread count badge shows
- [ ] Mark as read works
- [ ] Real-time new notification arrives
- [ ] Notification types display correctly

### 21.9 Subscription
- [ ] Plans list loads with prices
- [ ] Payment reference field works
- [ ] Subscription activates on submit
- [ ] Redirects to feed after activation
- [ ] Subscription expiry shows on profile

### 21.10 Device Tracking
- [ ] Devices list loads
- [ ] Register new device works
- [ ] Device shows in list
- [ ] Report stolen works
- [ ] Status changes to "stolen"

---

## 22. MOBILE APP RULES

### 22.1 What the Mobile App MUST NOT Do

- Never use the Supabase Service Role Key
- Never calculate trust scores (backend handles this)
- Never modify RLS policies
- Never write directly to `incident_reactions` count columns (use reactions table, triggers handle counts)
- Never bypass subscription checks
- Never store passwords or sensitive data in AsyncStorage (use SecureStore)
- Never show raw Supabase error messages to users

### 22.2 What the Mobile App MUST Do

- Use Supabase ANON key only (from `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Use Supabase URL from `NEXT_PUBLIC_SUPABASE_URL`
- Store session tokens in Expo SecureStore (not AsyncStorage)
- Handle auth state changes via `onAuthStateChange`
- Upload ALL files through `/api/upload` endpoint (not directly to Supabase Storage)
- Format all dates using Africa/Windhoek timezone (GMT+2)
- Show loading states on all async operations
- Handle network errors gracefully

### 22.3 Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_SITE_URL=https://app.ngumus-eye.site
```

### 22.4 Supabase SDK Setup (React Native / Expo)

```javascript
import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { AppState } from "react-native"

const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key)
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
)

// Auto-refresh token when app comes to foreground
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
```

### 22.5 Backend vs Frontend Responsibilities

**Backend (Next.js + Supabase):**
- All RLS enforcement
- Trust score calculation
- Subscription validation
- File storage (Vercel Blob)
- Real-time events
- Geohash computation
- Notification creation

**Frontend (Mobile App):**
- UI/UX rendering
- User input capture + client-side validation
- Navigation between screens
- Display formatting (dates, currency, phone numbers)
- Real-time subscription listeners
- Local state management
- Session token storage

---

**END OF DOCUMENTATION**

This documentation is complete and covers every endpoint, Supabase query, button action, flow, and process in the Ngumus Eye app. Nothing has been omitted.
