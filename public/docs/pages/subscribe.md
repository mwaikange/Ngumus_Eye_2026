# Page: /subscribe

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/subscribe/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Subscription purchase page showing available plans.
- Users redeem a voucher code to activate a subscription — no card payment integrated.
- Unlocks access to the File Deck (case management), Device Tracking, and Support features.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- Non-subscribers land here when trying to access subscription-gated pages.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getSubscriptionPlans()` — `lib/actions/subscriptions.ts` |
| Tables read | `subscription_plans` |
| Server Action | `redeemVoucher(code)` — `lib/actions/vouchers.ts` |
| Tables read/written | `vouchers`, `user_subscriptions` |
| Server Action | `getUserSubscription()` — `lib/actions/subscriptions.ts` |
| Tables read | `user_subscriptions` |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Title "Subscribe" |
| Current subscription banner | Shows active plan if subscribed |
| Plan cards | List of subscription plans with name, price, duration, features |
| Voucher input | Text field to enter voucher code |
| Redeem button | Submits voucher code |
| Success state | "Subscription activated" confirmation |
| Error state | Invalid/expired voucher message |

---

## 5) Actions

### Action: Redeem Voucher
- **Location:** Voucher input + "Redeem" button
- **Trigger:** Click or Enter
- **Preconditions:** Authenticated; voucher code non-empty
- **Client-side validation:** Non-empty check
- **Request:** `redeemVoucher(code)` — `lib/actions/vouchers.ts`
- **Server-side logic:**
  1. Find voucher in `vouchers` where `code = input`, `is_used = false`, `expires_at > now()`
  2. Look up associated `subscription_plan_id` from voucher
  3. Insert into `user_subscriptions { user_id, plan_id, status: "active", starts_at: now(), expires_at: now() + plan.days }`
  4. Mark voucher as used: `vouchers.is_used = true`, `vouchers.used_by = auth.uid()`, `vouchers.used_at = now()`
- **Database changes:** `user_subscriptions` insert + `vouchers` update
- **Side effects:** User can now access subscription-gated pages
- **Success state:** Toast "Subscription activated!"; subscription banner updates; redirect to `/case-deck` or stay on page
- **Failure states:**
  - Code not found → "Invalid voucher code"
  - Already used → "This voucher has already been used"
  - Expired → "This voucher has expired"
  - Already subscribed → **TODO (unconfirmed — check if double-subscribe is prevented)**
- **Edge cases:** Race condition on two users using same code simultaneously — DB unique constraint on `vouchers.is_used` per code **TODO (unconfirmed — verify atomicity)**

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| No subscription | Plans shown + voucher input |
| Active subscription | Current plan banner shown |
| Submitting | Redeem request in flight |
| Success | Subscription activated |
| Error | Invalid/expired/used voucher |

---

## 7) Audit & Logging
- `vouchers.used_by` and `vouchers.used_at` track redemption.
- `user_subscriptions` row records full subscription lifecycle.

---

## 8) Test Checklist (UAT)
- Given valid unused unexpired voucher → When redeemed → Then subscription activated, access granted
- Given already-used voucher → Then error "already used"
- Given expired voucher → Then error "expired"
- Given invalid code → Then error "invalid"
- Given non-subscriber trying to access `/case-deck` → Then redirect to `/subscribe`
- Given subscriber → When visiting `/subscribe` → Then current plan shown
