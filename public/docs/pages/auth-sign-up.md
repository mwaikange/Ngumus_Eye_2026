# Page: /auth/sign-up

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/auth/sign-up/page.tsx` | **Layout:** None (standalone) | **Auth Required:** No

---

## 1) Purpose
- Allows new users to create an account.
- Collects full name, email, password, and optional phone number.
- Triggers Supabase email confirmation flow before account is active.

---

## 2) Who Can Access It
- **Auth required:** No — public page.
- **Redirect if already authenticated:** Yes, redirected to `/feed`.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Supabase Auth | `supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })` |
| Tables | `profiles` — row created via `handle_new_user` DB trigger on `auth.users` insert |
| Storage | None |
| Realtime | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| Full name field | Text input |
| Email field | Email input |
| Phone field | Optional phone number input |
| Password field | Password input with show/hide toggle |
| Confirm password field | Must match password |
| Sign Up button | Submits registration |
| Sign in link | Navigates to `/auth/login` |
| Error/success banner | Shows feedback |

---

## 5) Actions

### Action: Register
- **Location:** "Sign Up" button
- **Trigger:** Click or Enter key
- **Preconditions:** All required fields filled
- **Client-side validation:**
  - Full name: non-empty
  - Email: valid format
  - Password: min 6 characters
  - Confirm password: must match password
- **Server-side validation:** Supabase checks email uniqueness in `auth.users`
- **Request:** `supabase.auth.signUp(...)` — see `lib/actions/auth.ts`
- **Database changes:**
  - New row in `auth.users`
  - `handle_new_user` trigger creates row in `public.profiles` with `full_name`, `email`, `phone`, `verification_level = 0`, `trust_score = 0`
- **Side effects:** Supabase sends confirmation email to user's address
- **Success state:** Redirect to `/auth/sign-up-success`
- **Failure states:**
  - Email already registered → "User already registered"
  - Passwords don't match → client validation error shown
  - Network error → generic error banner
- **Edge cases:** Double-submit prevented by loading state

### Action: Navigate to Sign In
- **Location:** "Already have an account? Sign in" link
- **Trigger:** Click
- **Request:** Navigation to `/auth/login`

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Default | Form empty |
| Loading | Request in flight, button disabled |
| Error | Registration failed, error shown |
| Success | Redirect to `/auth/sign-up-success` |

---

## 7) Audit & Logging
- Supabase Auth logs signup in `auth.audit_log_entries`.
- `handle_new_user` DB trigger (`scripts/043_update_handle_new_user_function.sql`) creates the profile row.

---

## 8) Test Checklist (UAT)
- Given valid unique email + matching passwords → When Sign Up clicked → Then redirect to `/auth/sign-up-success`
- Given existing email → When Sign Up clicked → Then error "User already registered" shown
- Given mismatched passwords → When Sign Up clicked → Then client error shown before submission
- Given empty required fields → When Sign Up clicked → Then client validation prevents submission
- Given already authenticated → When visiting `/auth/sign-up` → Then redirect to `/feed`
