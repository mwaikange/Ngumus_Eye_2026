# Admin Pages: /admin/*

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**Layout:** AdminSidebar (`components/admin-sidebar.tsx`) | **Auth Required:** Yes | **Role Required:** Admin (`profiles.is_admin = true`)

---

## Admin Routes Covered
| Route | File |
|-------|------|
| `/admin` | `app/admin/page.tsx` |
| `/admin/triage` | `app/admin/triage/page.tsx` |
| `/admin/users` | `app/admin/users/page.tsx` |
| `/admin/groups` | `app/admin/groups/page.tsx` |
| `/admin/billing` | `app/admin/billing/page.tsx` |
| `/admin/evidence` | `app/admin/evidence/page.tsx` |
| `/admin/audit` | `app/admin/audit/page.tsx` |
| `/admin/partners` | `app/admin/partners/page.tsx` |

---

## Access Control
- **Auth required:** Yes.
- **Admin required:** `profiles.is_admin = true` — checked server-side in each admin page.
- **Enforcement:** Each admin page queries `supabase.auth.getUser()` + checks `profiles.is_admin`; redirects to `/feed` if not admin.
- **No RLS bypass** — admin pages use the service role key where needed via `SUPABASE_SERVICE_ROLE_KEY`.

---

# /admin — Dashboard

## 1) Purpose
- Overview stats: total users, total incidents, active subscriptions, pending triage items, group count.

## 3) Data Used
- Aggregate counts from: `profiles`, `incidents`, `user_subscriptions`, `groups`

## 4) UI Sections
- Stats cards: Users, Incidents, Active Subscriptions, Pending Triage, Groups
- Quick links to each admin sub-section

## 7) Audit & Logging
- Read-only dashboard; no writes.

---

# /admin/triage — Incident Triage

## 1) Purpose
- Kanban-style board to review and update incident verification status.
- Admin can advance incidents through verification levels 0 → 1 → 2 → 3.

## 3) Data Used
| Type | Detail |
|------|--------|
| Tables read | `incidents`, `profiles` |
| Server Action | `updateIncidentStatus(id, status)` — `lib/actions/incidents.ts` |
| Server Action | `updateVerificationLevel(id, level)` — `lib/actions/incidents.ts` |
| Tables written | `incidents.status`, `incidents.verification_level` |

## 4) UI Sections
- Kanban columns by verification level (0 = Unverified, 1 = Reported, 2 = Confirmed, 3 = Verified)
- Incident cards with title, category, reporter, date
- Action buttons per card: Advance level, Archive, Assign

## 5) Key Actions

### Action: Advance Verification Level
- **Request:** `updateVerificationLevel(id, level + 1)` — `lib/actions/incidents.ts`
- **DB changes:** `incidents.verification_level` incremented; capped at 3
- **Side effects:** Notification sent to reporter **TODO (unconfirmed)**

### Action: Archive Incident
- **Request:** `updateIncidentStatus(id, "archived")`
- **DB changes:** `incidents.status = "archived"`

---

# /admin/users — User Management

## 1) Purpose
- List all users; search/filter; view profile details; grant/revoke admin; manage verification level.

## 3) Data Used
| Type | Detail |
|------|--------|
| Tables read | `profiles`, `auth.users` (via service role) |
| Server Action | `updateUserVerificationLevel(userId, level)` — **TODO (unconfirmed)** |
| Server Action | `toggleAdminRole(userId)` — **TODO (unconfirmed)** |
| Tables written | `profiles.verification_level`, `profiles.is_admin` |

## 5) Key Actions

### Action: Search Users
- Filter by name/email; results paginated
- **DB:** `profiles` ILIKE query

### Action: Update Verification Level
- Dropdown per user → select level 0–3
- **DB:** `profiles.verification_level` updated

### Action: Toggle Admin Role
- Toggle switch per user
- **DB:** `profiles.is_admin` toggled
- **Precaution:** Cannot remove own admin **TODO (unconfirmed)**

---

# /admin/groups — Group Management

## 1) Purpose
- List all groups; review reports; ban/suspend groups.

## 3) Data Used
| Type | Detail |
|------|--------|
| Tables read | `groups`, `group_members`, `group_reports` |
| Server Action | `banGroup(id)` / `deleteGroup(id)` — `lib/actions/groups.ts` |
| Tables written | `groups.status` |

## 5) Key Actions

### Action: View Group Reports
- Shows `group_reports` for each group

### Action: Ban Group
- Sets `groups.status = "banned"` — members can no longer access it

---

# /admin/billing — Voucher Management

## 1) Purpose
- Create voucher codes linked to subscription plans; view all vouchers and their usage status.

## 3) Data Used
| Type | Detail |
|------|--------|
| Tables read/written | `vouchers`, `subscription_plans` |
| Server Action | `createVoucher(planId, code, expiresAt)` — `lib/actions/vouchers.ts` |
| Tables written | `vouchers { code, plan_id, is_used: false, expires_at, created_by }` |

## 5) Key Actions

### Action: Create Voucher
- Select plan, enter code (or generate), set expiry
- **DB:** Insert into `vouchers`

### Action: View Voucher Usage
- Table showing all vouchers, who used them, when

---

# /admin/evidence — Evidence/Media Review

## 1) Purpose
- Review media attached to incidents for policy compliance.
- Admin can flag or remove inappropriate media.

## 3) Data Used
| Type | Detail |
|------|--------|
| Tables read | `incident_media`, `incidents`, `profiles` |
| Server Action | `deleteMedia(id)` — **TODO (unconfirmed)** |
| Tables written | `incident_media` row deletion |
| Storage | Vercel Blob — media deletion **TODO (unconfirmed)** |

---

# /admin/audit — Audit Log

## 1) Purpose
- View system audit trail.
- **Current status:** Stub page — full implementation **TODO (unconfirmed — check `app/admin/audit/page.tsx`)**.

---

# /admin/partners — Partner Management

## 1) Purpose
- Manage advertising/partner organisations.
- **Current status:** Stub page — **TODO (unconfirmed — check `app/admin/partners/page.tsx`)**.

---

## Test Checklist (UAT — Admin)
- Given non-admin user → When visiting any `/admin/*` → Then redirect to `/feed`
- Given admin → When visiting `/admin` → Then stats dashboard shown
- Given admin → When advancing incident verification level → Then `incidents.verification_level` incremented
- Given admin → When archiving incident → Then `incidents.status = "archived"`
- Given admin → When creating voucher → Then voucher appears in billing list
- Given admin → When updating user verification level → Then `profiles.verification_level` updated
- Given admin → When banning group → Then group inaccessible to members
