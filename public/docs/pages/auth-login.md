# Page: /auth/login

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/auth/login/page.tsx` | **Layout:** None (standalone) | **Auth Required:** No

---

## 1) Purpose
- Entry point for returning users to authenticate and access the app.
- Accepts email + password credentials via Supabase Auth.
- Redirects authenticated users away immediately; redirects successful logins to `/feed`.

---

## 2) Who Can Access It
- **Auth required:** No — public page.
- **Redirect if already authenticated:** The page checks `supabase.auth.getUser()` server-side; if a valid session exists the user is redirected to `/feed`.
- **Enforcement location:** `app/(app)/layout.tsx` (server-side) and `middleware.ts` (session refresh).

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Supabase Auth | `supabase.auth.signInWithPassword({ email, password })` |
| Tables | None directly — auth session established |
| Storage | None |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| Logo / Brand header | Ngumus Eye logo + app name |
| Email field | Text input for email address |
| Password field | Password input with show/hide toggle |
| Sign In button | Submits credentials |
| Forgot password link | Navigates to `/auth/forgot-password` |
| Sign up link | Navigates to `/auth/sign-up` |
| Error banner | Shows error message on failure |

---

## 5) Actions

### Action: Sign In
- **Location:** Primary submit button at bottom of form
- **Trigger:** Click "Sign In" button or Enter key
- **Preconditions:** Fields must not be empty
- **Client-side validation:**
  - Email must be non-empty and valid email format
  - Password must be non-empty (min 6 chars)
- **Server-side validation:** Supabase validates credentials against `auth.users`
- **Request:** `supabase.auth.signInWithPassword({ email, password })`
- **Database changes:** Auth session created in Supabase auth schema; no public tables modified
- **Side effects:** Supabase sets HTTP-only session cookie via `lib/supabase/server.ts`
- **Success state:** Redirect to `/feed`
- **Failure states:**
  - Invalid credentials → "Invalid login credentials"
  - Unverified email → "Email not confirmed"
  - Network error → "Something went wrong. Please try again."
- **Edge cases:** Double-submit prevented by loading state; button disabled while request in flight

### Action: Navigate to Forgot Password
- **Location:** "Forgot password?" link below password field
- **Trigger:** Click
- **Request:** Client-side navigation to `/auth/forgot-password`

### Action: Navigate to Sign Up
- **Location:** "Don't have an account? Sign up" link
- **Trigger:** Click
- **Request:** Client-side navigation to `/auth/sign-up`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Default | Form empty, button enabled |
| Loading | Request in flight, button disabled + spinner |
| Error | Auth failed, error banner visible |
| Success | Redirect to `/feed` |

---

## 7) Audit & Logging
- No explicit audit log entries.
- Supabase Auth logs sign-in events internally in `auth.audit_log_entries`.
- `console.log("[v0] ...")` removed post-debug.

---

## 8) Test Checklist (UAT)
- Given valid email + password → When Sign In clicked → Then redirect to `/feed`
- Given invalid password → When Sign In clicked → Then error "Invalid login credentials" shown
- Given unverified email → When Sign In clicked → Then error "Email not confirmed" shown
- Given empty fields → When Sign In clicked → Then client validation prevents submission
- Given already authenticated user → When visiting `/auth/login` → Then auto-redirect to `/feed`
- Given network failure → When Sign In clicked → Then generic error message shown
