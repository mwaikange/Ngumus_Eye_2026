# File Deck Access Control — Replit Dev Integration Guide

**Version:** 1.0  
**Last Updated:** March 4, 2026  
**Base URL:** https://app.ngumus-eye.site  

---

## The One Rule

> **The File Deck (case-deck) is locked behind an active, non-expired subscription.**
> If no row exists in `user_subscriptions` where `status = 'active'` AND `expires_at > NOW()` for the current user, deny access and redirect to the Subscribe screen.

---

## The Exact Database Check

This is the precise query the web app runs on every File Deck screen load:

```sql
SELECT *
FROM user_subscriptions
WHERE user_id   = '<current_user_uuid>'
  AND status    = 'active'
  AND expires_at > NOW()
LIMIT 1;
```

- If **1 row returned** → user has access. Show File Deck.
- If **0 rows returned** → user has NO access. Block and show upgrade prompt.

---

## Tables Involved

### `user_subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | FK → auth.users.id |
| `plan_id` | integer | FK → plans.id |
| `status` | text | `'active'` \| `'cancelled'` \| `'expired'` |
| `started_at` | timestamptz | When subscription began |
| `expires_at` | timestamptz | **Expiry date — check this against NOW()** |
| `auto_renew` | boolean | Informational only |
| `payment_reference` | text | Receipt/voucher reference |
| `created_at` | timestamptz | Row creation time |

**RLS:** Users can only SELECT their own rows (`user_id = auth.uid()`).

### `user_subscription_status` (convenience view)

A pre-built DB view that simplifies the check:

| Column | Type |
|--------|------|
| `user_id` | uuid |
| `currently_active` | boolean | ← **This is the flag to check** |
| `plan_id` | integer |
| `plan_code` | text |
| `plan_label` | text |
| `price_cents` | integer |
| `period_days` | integer |
| `started_at` | timestamptz |
| `expires_at` | timestamptz |

**RLS:** No RLS (view inherits from underlying table). Query with authenticated user only.

You can use this view for a simpler check:

```sql
SELECT currently_active, expires_at, plan_label
FROM user_subscription_status
WHERE user_id = '<current_user_uuid>';
```

---

## How the Web App Enforces It

### 1. Route-Level Wrap (Layout)

Every page under `/case-deck/*` is wrapped by `CaseDeckLayout`:

```
app/(app)/case-deck/layout.tsx
  └── <SubscriptionGate>
        └── {children}   ← only rendered if access = true
      </SubscriptionGate>
```

### 2. The Gate Logic (component: `subscription-gate.tsx`)

```typescript
// Pseudocode of the exact check
const { data: subscription } = await supabase
  .from("user_subscriptions")
  .select("*")
  .eq("user_id", user.id)
  .eq("status", "active")
  .gte("expires_at", new Date().toISOString())  // expires_at >= right now
  .maybeSingle()

const hasAccess = !!subscription   // true if row found, false if null
```

If `hasAccess === false`, render a locked screen with a "View Membership Plans" button — do NOT render any File Deck content.

---

## Also Check: `profiles.is_subscribed`

The `profiles` table has a denormalised boolean column:

```sql
profiles.is_subscribed  (boolean)
```

This is a **convenience flag** that mirrors the subscription state. However:

- **DO NOT rely solely on `profiles.is_subscribed`** for the File Deck gate.
- It can fall out of sync if a subscription expires but the profile is not updated.
- **Always use the `user_subscriptions` table with the `expires_at` check as the source of truth.**
- `profiles.is_subscribed` is useful for quick UI hints (e.g., showing a "PRO" badge) but not for gating features.

---

## Mobile App Implementation

### Step 1 — Check access on app launch / screen focus

```javascript
// React Native / Expo example
async function checkFileDeckAccess(supabase, userId) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('status, expires_at, plan_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('expires_at', now)
    .maybeSingle()

  if (error || !data) {
    return { hasAccess: false }
  }

  return { hasAccess: true, subscription: data }
}
```

### Step 2 — Gate the File Deck tab/screen

```javascript
// In your navigation or screen component
const { hasAccess } = await checkFileDeckAccess(supabase, user.id)

if (!hasAccess) {
  // Navigate to Subscribe screen
  navigation.navigate('Subscribe')
  return
}

// Otherwise render the File Deck
```

### Step 3 — When to re-check

| Trigger | Action |
|---------|--------|
| App launch | Always check |
| User taps Files tab | Check before rendering |
| User returns from Subscribe screen | Re-check immediately |
| `onAuthStateChange` fires | Re-check |
| Every 10 minutes while app is in foreground (optional) | Re-check to catch expiry |

### Step 4 — Handle expiry gracefully

If a user's subscription expires mid-session:
1. The next `user_subscriptions` check will return null.
2. Show a non-dismissible modal: "Your subscription has expired. Renew to continue."
3. Provide a "Renew Now" button → navigate to Subscribe screen.
4. Do NOT hard-crash or log out the user. They retain access to Feed, Map, Report, Groups, Profile.

---

## What Requires Subscription vs What Is Free

### FREE (no subscription needed)
- Feed (`/feed`) — view all incidents
- Map (`/map`) — view incident map
- Report (`/report`) — submit new incidents
- Groups (`/groups`) — browse and join community groups
- Profile (`/profile`) — view and edit own profile
- Notifications (`/notifications`)
- Search (`/search`)

### REQUIRES ACTIVE SUBSCRIPTION
- **File Deck** (`/case-deck`) — dashboard, all stats
- **File Deck / New File** (`/case-deck/new`) — create a new file
- **File Deck / File Detail** (`/case-deck/:id`) — view/edit a file, upload evidence, add notes
- **Device Tracking** (`/case-deck/devices`) — register and manage tracked devices
- **Counseling & Support** (`/case-deck/support`) — submit support requests

---

## Subscription Plans Reference

Query to fetch all available plans:

```sql
SELECT id, code, label, description, price_cents, period_days, features
FROM plans
ORDER BY price_cents ASC;
```

**Current plans (from DB):**

| id | code | label | price_cents | period_days |
|----|------|-------|-------------|-------------|
| (query live DB for current values — see `/subscribe` page) |

Plans are managed in the `plans` table and can be updated by admin. Always query live — do not hardcode plan IDs.

---

## Voucher-Based Subscription Flow

Users can get a subscription via a voucher code (no payment gateway):

```sql
-- 1. Validate voucher (must be unredeemed, must match plan)
SELECT code, plan_id, days, redeemed_at
FROM vouchers
WHERE code = '<USER_INPUT_CODE>'
  AND redeemed_by IS NULL;

-- 2. If valid, call the DB function:
SELECT redeem_voucher('<USER_INPUT_CODE>', auth.uid());
-- This atomically: marks voucher as redeemed + inserts user_subscriptions row

-- 3. Re-check access after redemption
```

The web app calls `redeemVoucher(code)` server action which runs the above.

---

## Error States for Mobile

| Scenario | User-facing message | Action |
|----------|---------------------|--------|
| No subscription row found | "A subscription is required to access Files." | Show Subscribe button |
| Subscription `status = 'cancelled'` | "Your subscription has been cancelled." | Show Renew button |
| `expires_at` is in the past | "Your subscription has expired." | Show Renew button |
| Supabase query error | "Unable to verify subscription. Please try again." | Retry button |
| User not authenticated | (redirect to login first) | Navigate to Login |

---

## Summary Flowchart

```
User taps "Files" tab
        │
        ▼
Is user authenticated?
    NO  ──────────────────────► Navigate to Login
        │
       YES
        ▼
Query user_subscriptions
WHERE user_id = me
  AND status = 'active'
  AND expires_at > NOW()
        │
     Row found?
    NO  ──────────────────────► Show "Subscription Required" screen
        │                        with "View Plans" button
       YES
        ▼
Render File Deck content
```
