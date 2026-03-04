# Ngumus Eye — Storage Integration Guide

**Version:** 1.0.0
**Last Updated:** 2026-03-04
**Base URL:** `https://app.ngumus-eye.site`

---

## 1. What Storage Provider Is Used?

This app uses **Vercel Blob** (`@vercel/blob`) as its sole file/media storage.

- Provider: Vercel Blob
- CDN delivery: Yes — files are served globally via Vercel's CDN
- Access: **Public read** — every uploaded file gets a publicly accessible HTTPS URL
- Write access: Token-gated (`BLOB_READ_WRITE_TOKEN` environment variable, server-side only)
- Supported types: Images (`image/*`) and Videos (`video/*`)
- Max size: Images = **10 MB**, Videos = **50 MB**

Vercel Blob is NOT Supabase Storage. The app does not use Supabase Storage at all. All media goes through Vercel Blob and the resulting public URL is then saved into the Supabase database column for that record.

---

## 2. The Upload Endpoint

All uploads go through a single authenticated proxy endpoint on this Next.js server:

```
POST https://app.ngumus-eye.site/api/upload
Content-Type: multipart/form-data
```

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (binary) | Yes | The file to upload |

### Response — Success `200`

```json
{
  "url": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/filename-abc123.jpg"
}
```

### Response — Error `400`

```json
{ "error": "No file provided" }
{ "error": "File too large. Maximum size is 10MB" }
{ "error": "Invalid file type. Only images and videos are allowed" }
```

### Response — Error `500`

```json
{ "error": "Upload failed" }
```

---

## 3. How the Mobile App Must Use It

The mobile app (Replit / React Native / Flutter / etc.) **must NOT call Vercel Blob directly**. It has no access to `BLOB_READ_WRITE_TOKEN`. Instead:

```
Mobile App  →  POST /api/upload  →  Vercel Blob  →  returns public URL
                                                         ↓
Mobile App  →  Supabase (save URL into DB column)
```

### Step-by-Step for Every Upload

**Step 1 — Upload the binary file to the proxy endpoint**

```http
POST https://app.ngumus-eye.site/api/upload
Authorization: Bearer <supabase_access_token>   ← include for future auth gating
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<binary file data>
--boundary--
```

**Step 2 — Receive the public URL**

```json
{ "url": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/photo-xyz.jpg" }
```

**Step 3 — Save the URL into the correct Supabase column**

Use the URL returned in Step 2 as the value for the relevant DB column (see Section 4).

---

## 4. Where Each URL Is Stored in Supabase

| Feature | Table | Column | Notes |
|---------|-------|--------|-------|
| Incident photo | `incidents` | `image_url` | Single image per incident |
| Incident video | `incidents` | `video_url` | Single video per incident |
| Comment photo | `incident_comments` | `image_url` | Optional attachment on comment |
| Case evidence file | `case_files` | `file_url` | Can be image or video |
| Group chat message image | `group_messages` | `image_url` | Image sent in group chat |
| Group chat message video | `group_messages` | `video_url` | Video sent in group chat |
| User avatar | `profiles` | `avatar_url` | Profile picture |
| Ad media | `advertisements` | `media_url` | Image or video for ad |

---

## 5. File Naming & URL Format

Vercel Blob generates a unique URL per upload. The format is:

```
https://hebbkx1anhila5yf.public.blob.vercel-storage.com/{original-filename}-{random-hash}.{ext}
```

Example:
```
https://hebbkx1anhila5yf.public.blob.vercel-storage.com/scene-photo-abc123xyz.jpg
```

- URLs are **permanent** — Vercel Blob does not expire public URLs
- Files are **publicly readable** without any token
- The mobile app can display these URLs directly in `<Image>` components

---

## 6. Size & Type Limits (enforce on mobile before upload)

| Type | Max Size | Allowed MIME types |
|------|----------|--------------------|
| Image | 10 MB | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic` |
| Video | 50 MB | `video/mp4`, `video/quicktime`, `video/webm`, `video/3gpp` |

The mobile app should validate these **before** sending to avoid a wasted network round-trip. The server enforces them as a hard reject (`400`).

---

## 7. Example — React Native Upload (Expo)

```typescript
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'

const UPLOAD_ENDPOINT = 'https://app.ngumus-eye.site/api/upload'

export async function uploadMedia(localUri: string, mimeType: string): Promise<string> {
  const fileName = localUri.split('/').pop() ?? 'upload'

  const formData = new FormData()
  formData.append('file', {
    uri: localUri,
    name: fileName,
    type: mimeType,
  } as any)

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    body: formData,
    headers: {
      // Do NOT set Content-Type manually — let fetch set the multipart boundary
    },
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error ?? 'Upload failed')
  }

  const { url } = await response.json()
  return url // e.g. "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/..."
}
```

---

## 8. Example — Full Incident Report Flow (Mobile)

```typescript
// 1. User picks a photo
const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] })
if (result.canceled) return

const asset = result.assets[0]

// 2. Upload to Vercel Blob via the proxy
const blobUrl = await uploadMedia(asset.uri, asset.mimeType ?? 'image/jpeg')

// 3. Submit the incident with the blob URL
const { data, error } = await supabase
  .from('incidents')
  .insert({
    title: formValues.title,
    description: formValues.description,
    incident_type: formValues.type,
    latitude: coords.latitude,
    longitude: coords.longitude,
    geohash: computeGeohash(coords.latitude, coords.longitude),
    town: formValues.town,
    image_url: blobUrl,         // ← the Vercel Blob public URL
    user_id: session.user.id,
    status: 'pending',
    is_anonymous: formValues.anonymous,
  })
  .select('id')
  .single()
```

---

## 9. Example — Avatar Upload Flow (Mobile)

```typescript
// 1. Pick image
const asset = result.assets[0]

// 2. Upload
const avatarUrl = await uploadMedia(asset.uri, 'image/jpeg')

// 3. Save to profiles table
const { error } = await supabase
  .from('profiles')
  .update({ avatar_url: avatarUrl })
  .eq('id', session.user.id)
```

---

## 10. Example — Group Chat Media Message (Mobile)

```typescript
// 1. Upload
const mediaUrl = await uploadMedia(asset.uri, asset.mimeType ?? 'image/jpeg')
const isVideo = asset.mimeType?.startsWith('video/')

// 2. Insert group message
const { error } = await supabase
  .from('group_messages')
  .insert({
    group_id: groupId,
    user_id: session.user.id,
    content: isVideo ? '' : '',
    image_url: isVideo ? null : mediaUrl,
    video_url: isVideo ? mediaUrl : null,
  })
```

---

## 11. Compression Recommendations (Mobile)

Before calling `uploadMedia`, compress on the client to stay within limits:

| Media | Recommended Action |
|-------|-------------------|
| Image (HEIC from iOS) | Convert to JPEG, max 1920px on longest side, quality 0.8 |
| Image (Android) | Resize to max 1920px, quality 0.85 |
| Video | Target < 30 MB; use H.264 720p if source is larger |

The web app uses `lib/utils/image-compression.ts` and `lib/utils/video-compression.ts` for reference — apply equivalent logic on mobile.

---

## 12. What NOT to Do

| Do NOT | Reason |
|--------|--------|
| Call Vercel Blob SDK directly from mobile | `BLOB_READ_WRITE_TOKEN` is a server-only secret |
| Store `BLOB_READ_WRITE_TOKEN` in the mobile app bundle | It would expose write access to your entire blob store |
| Use Supabase Storage | This app does not use Supabase Storage — there are no buckets configured |
| Send files to Supabase directly | All media routes through `POST /api/upload` only |
| Set `Content-Type: multipart/form-data` manually | Let the HTTP client set the boundary automatically |

---

## 13. Summary Cheat Sheet

```
Storage provider:    Vercel Blob (@vercel/blob)
Upload endpoint:     POST https://app.ngumus-eye.site/api/upload
Request format:      multipart/form-data, field name = "file"
Response:            { "url": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/..." }
URL persistence:     Save returned URL to the appropriate Supabase table column
Image limit:         10 MB
Video limit:         50 MB
Allowed types:       image/* and video/* only
Public access:       Yes — all URLs are publicly readable, no auth required to view
Write access:        Server-side only via BLOB_READ_WRITE_TOKEN (never expose to mobile)
```
