# Page: /auth/reset-password

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/auth/reset-password/page.tsx` | **Layout:** None | **Auth Required:** Supabase PASSWORD_RECOVERY session

---

## 1) Purpose
- Landing page for users who clicked the password reset link in their email.
- Detects `PASSWORD_RECOVERY` auth event via `onAuthStateChange` to establish a valid session.
- Allows user to set a new password.

---

## 2) Who Can Access It
- **Auth required:** Requires a valid Supabase recovery token (from email link).
- If no recovery session, shows "Invalid or expired link" message with link to `/auth/forgot-password`.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Supabase Auth | `supabase.auth.onAuthStateChange` — listens for `PASSWORD_RECOVERY` event |
| Supabase Auth | `supabase.auth.updateUser({ password: newPassword })` |
| Tables | None directly |
| Storage | None |
| Realtime | `onAuthStateChange` subscription |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| Loading state | Shown while checking session validity |
| Invalid link state | Shown if no recovery session found |
| New password field | Password input |
| Confirm password field | Must match new password |
| Update Password button | Submits new password |
| Success state | Confirmation + redirect to login |
| Error banner | Shows on failure |

---

## 5) Actions

### Action: Update Password
- **Location:** "Update Password" button
- **Trigger:** Click or Enter
- **Preconditions:** Valid `PASSWORD_RECOVERY` session must be active
- **Client-side validation:**
  - New password: min 6 characters
  - Confirm password: must match new password
- **Server-side validation:** Supabase validates token and enforces password policy
- **Request:** `supabase.auth.updateUser({ password: newPassword })`
- **Database changes:** `auth.users.encrypted_password` updated; recovery token invalidated
- **Side effects:** Session remains active after password update
- **Success state:** "Password updated successfully" + redirect to `/auth/login` after 2 seconds
- **Failure states:**
  - Expired/invalid token → "Invalid or expired link" state shown
  - Passwords don't match → client error
  - Supabase error → error banner
- **Edge cases:** Token is single-use; revisiting URL after use shows invalid state

### Action: Go to Forgot Password (invalid state)
- **Location:** Link shown when session invalid
- **Trigger:** Click
- **Request:** Navigation to `/auth/forgot-password`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Checking | `isCheckingSession = true` — spinner shown |
| Invalid | No recovery session — invalid link message |
| Valid / Ready | `hasValidSession = true` — form shown |
| Loading | Update request in flight |
| Success | Password updated, redirect pending |
| Error | Update failed |

---

## 7) Audit & Logging
- Supabase records password change in `auth.audit_log_entries`.
- `onAuthStateChange` subscription unsubscribed on component unmount via cleanup function.

---

## 8) Test Checklist (UAT)
- Given valid email reset link clicked → When page loads → Then `PASSWORD_RECOVERY` event fires → Then form shown
- Given valid new password + matching confirm → When Update Password clicked → Then success + redirect to login
- Given mismatched passwords → When Update Password clicked → Then client error shown
- Given expired/used link → When page loads → Then invalid link state shown
- Given network failure during update → When clicked → Then error banner shown
