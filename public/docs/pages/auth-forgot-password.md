# Page: /auth/forgot-password

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/auth/forgot-password/page.tsx` | **Layout:** None | **Auth Required:** No

---

## 1) Purpose
- Allows users who have forgotten their password to request a reset link.
- Sends a password recovery email via Supabase Auth with a `redirectTo` pointing to `/auth/reset-password`.

---

## 2) Who Can Access It
- **Auth required:** No — public page.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Supabase Auth | `supabase.auth.resetPasswordForEmail(email, { redirectTo })` |
| Tables | None |
| Storage | None |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| Email field | Input for registered email address |
| Send Reset Link button | Submits request |
| Success state | Confirmation message shown after email sent |
| Back to login link | Navigates to `/auth/login` |
| Error banner | Shows on failure |

---

## 5) Actions

### Action: Send Password Reset Email
- **Location:** "Send Reset Link" button
- **Trigger:** Click or Enter
- **Preconditions:** Email field non-empty
- **Client-side validation:** Valid email format
- **Server-side validation:** Supabase silently succeeds even for unregistered emails (security best practice)
- **Request:** `supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://app.ngumus-eye.site/auth/reset-password" })`
- **Database changes:** Supabase creates a one-time recovery token in `auth.users`
- **Side effects:** Supabase sends password reset email containing a magic link that redirects to `https://app.ngumus-eye.site/auth/reset-password`
- **Success state:** Page shows "Check your email" confirmation message; form hidden
- **Failure states:**
  - Network error → error banner shown
- **Edge cases:** Supabase does not reveal whether email is registered (always shows success)

### Action: Back to Login
- **Location:** Link below form
- **Trigger:** Click
- **Request:** Navigation to `/auth/login`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Default | Email field shown |
| Loading | Request in flight |
| Success | Confirmation message, form hidden |
| Error | Network/server failure |

---

## 7) Audit & Logging
- Supabase records recovery token in `auth.users.recovery_sent_at`.

---

## 8) Test Checklist (UAT)
- Given registered email → When send clicked → Then success confirmation shown
- Given unregistered email → When send clicked → Then still shows success (no leak)
- Given empty field → When send clicked → Then client validation blocks submission
- Given network failure → When send clicked → Then error banner shown
