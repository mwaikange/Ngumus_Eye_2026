# Cross-Page User Flows

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site

---

## Flow 1: New User Onboarding

```
/auth/sign-up → /auth/sign-up-success → (email confirmation click) → /auth/callback → /feed
```

**Steps:**
1. User fills registration form on `/auth/sign-up`
2. `supabase.auth.signUp()` creates `auth.users` row + triggers `handle_new_user` to create `profiles` row
3. Confirmation email sent → user shown `/auth/sign-up-success`
4. User clicks email link → `/auth/callback` exchanges code for session
5. Redirected to `/feed` with active session
6. Middleware (`lib/supabase/middleware.ts`) refreshes session on every subsequent request

**Pages:** `auth-sign-up`, `auth-sign-up-success`, `auth-callback` → `feed`

---

## Flow 2: Password Reset

```
/auth/forgot-password → (email sent) → (user clicks email link) → /auth/reset-password → /auth/login
```

**Steps:**
1. User submits email on `/auth/forgot-password`
2. `supabase.auth.resetPasswordForEmail()` sends recovery email with `redirectTo: https://app.ngumus-eye.site/auth/reset-password`
3. User clicks link → Supabase sets `PASSWORD_RECOVERY` session
4. `/auth/reset-password` detects `PASSWORD_RECOVERY` event via `onAuthStateChange`
5. User submits new password → `supabase.auth.updateUser({ password })`
6. Redirected to `/auth/login`

**Pages:** `auth-forgot-password`, `auth-reset-password`, `auth-login`

---

## Flow 3: Report an Incident

```
/feed → /report (step 1 → 2 → 3) → /feed (or /incident/[newId])
```

**Steps:**
1. User taps "Report" in bottom nav → `/report`
2. Step 1: select category + type
3. Step 2: enter location (GPS or manual) + description + date/time
4. Step 3: upload optional media → review
5. Submit → `createIncident()` inserts into `incidents` + `incident_media`
6. Incident appears in feed for all authenticated users immediately
7. Redirect to `/feed` or new incident detail

**Pages:** `feed`, `report`, `incident-id`

---

## Flow 4: Incident Verification Lifecycle

```
Incident created (level 0) → community reactions → admin triage → level 1/2/3
```

**Verification Levels:**
| Level | Meaning | How reached |
|-------|---------|-------------|
| 0 | Unverified | Default on creation |
| 1 | Reported | **TODO (unconfirmed — check trigger threshold in DB)** |
| 2 | Confirmed | Admin advances or community verified_count threshold |
| 3 | Verified | Admin sets manually or threshold met |

**Steps:**
1. User submits incident → `verification_level = 0`
2. Other users react with "Verified" → `incident_reactions.type = "verified"` → `verified_count` incremented
3. When threshold met, level auto-advances **TODO (unconfirmed — confirm threshold in `scripts/009_fix_rls_and_add_verification_system.sql`)**
4. Admin reviews on `/admin/triage` → can manually advance or archive
5. Reporter receives notification on level change **TODO (unconfirmed)**

**Pages:** `incident-id`, `admin` (triage)

---

## Flow 5: Subscribe to Access File Deck

```
/case-deck (redirect) → /subscribe → (voucher redeemed) → /case-deck
```

**Steps:**
1. Non-subscriber visits `/case-deck` → server-side subscription check fails → redirect to `/subscribe`
2. User views plans + enters voucher code
3. `redeemVoucher(code)` → inserts `user_subscriptions` row → marks voucher used
4. Redirect to `/case-deck` — subscription check now passes
5. User can create files, track devices, access support

**Pages:** `subscribe`, `case-deck`, `case-deck-new`, `case-deck-devices`, `case-deck-support`

---

## Flow 6: Open and Manage an Investigation File

```
/case-deck → /case-deck/new → /case-deck/[id] (add notes, upload evidence, update status)
```

**Steps:**
1. Subscriber visits `/case-deck` → clicks "New File"
2. Fills form on `/case-deck/new` → `createCase()` inserts into `cases` with `status: "new"`
3. Navigate to `/case-deck/[id]`
4. Update status: `new` → `in_progress` → `closed`
5. Add timeline notes via `addTimelineEntry()`
6. Upload evidence images/videos via `POST /api/upload` → `addEvidence()`
7. When resolved, set status to `closed` or `archived`

**Pages:** `case-deck`, `case-deck-new`, `case-deck-id`

---

## Flow 7: Group Communication

```
/groups → /groups/create (or join) → /groups/[id] (chat, manage)
```

**Steps:**
1. User visits `/groups` → sees "My Groups" + "Discover"
2. New user: tap "Create Group" → `/groups/create` → `createGroup()` → user becomes admin
3. Joining: tap "Join" on discover card → `joinGroup()` → instant join or pending approval
4. If pending: group admin sees request in "Manage Requests" on `/groups/[id]` → approves
5. Member enters `/groups/[id]` → sends messages via `sendGroupMessage()`
6. Messages delivered in real-time to all members via Supabase Realtime channel

**Pages:** `groups`, `groups-create`, `groups-id`

---

## Flow 8: Admin Voucher Issuance + User Redemption

```
/admin/billing (create voucher) → [voucher shared with user] → /subscribe (redeem) → subscription active
```

**Steps:**
1. Admin visits `/admin/billing` → creates voucher with plan ID, code, expiry
2. `vouchers` row inserted with `is_used: false`
3. Admin shares code with user (out-of-band)
4. User enters code on `/subscribe` → `redeemVoucher(code)` validates + creates subscription
5. `vouchers.is_used = true` + `user_subscriptions` row created

**Pages:** `admin` (billing), `subscribe`

---

## Incident Status Definitions (Canonical)
| Status | Meaning |
|--------|---------|
| `active` | Visible in feed, open for interaction |
| `archived` | Hidden from feed, not deleted |
| `closed` | **TODO (unconfirmed — verify if `closed` used on incidents or only on cases)** |

## Case/File Status Flow (Canonical)
```
new → assigned → in_progress → closed → archived
```

## Verification Level Definitions (Canonical — from codebase)
| Level | Label | Color |
|-------|-------|-------|
| 0 | Unverified | Gray |
| 1 | Reported | Yellow |
| 2 | Confirmed | Blue |
| 3 | Verified | Green |
