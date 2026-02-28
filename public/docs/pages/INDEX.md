# Ngumus Eye — Page Inventory Index

**Version:** 1.0.0
**Last Updated:** 28 February 2026
**Base URL:** https://app.ngumus-eye.site
**Framework:** Next.js 16 App Router
**Auth Provider:** Supabase Auth
**Database:** Supabase (PostgreSQL)

---

## Authentication Guard

All routes under `app/(app)/` are protected by `app/(app)/layout.tsx`, which calls `supabase.auth.getUser()` server-side and redirects to `/auth/login` if no session. The global `middleware.ts` calls `updateSession()` from `lib/supabase/middleware.ts` on every request to keep sessions fresh.

---

## Route Index

| # | Route | File | Layout | Auth Required | Subscription Required | Notes |
|---|-------|------|--------|---------------|----------------------|-------|
| 1 | `/` | `app/page.tsx` | Root | No | No | Redirect only — sends authed users to `/feed`, others to `/auth/login` |
| 2 | `/auth/login` | `app/auth/login/page.tsx` | None | No | No | Public |
| 3 | `/auth/sign-up` | `app/auth/sign-up/page.tsx` | None | No | No | Public |
| 4 | `/auth/sign-up-success` | `app/auth/sign-up-success/page.tsx` | None | No | No | Static confirmation page |
| 5 | `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | None | No | No | Public |
| 6 | `/auth/reset-password` | `app/auth/reset-password/page.tsx` | None | No | No | Requires Supabase PASSWORD_RECOVERY session |
| 7 | `/auth/callback` | `app/auth/callback/route.ts` | None | No | No | OAuth/magic-link code exchange |
| 8 | `/auth/signout` | `app/auth/signout/route.ts` | None | Yes | No | Server action POST, redirects to `/auth/login` |
| 9 | `/feed` | `app/(app)/feed/page.tsx` | AppShell | Yes | No | Main incident feed |
| 10 | `/incident/[id]` | `app/(app)/incident/[id]/page.tsx` | AppShell | Yes | No | Incident detail |
| 11 | `/report` | `app/(app)/report/page.tsx` | AppShell | Yes | No | 3-step report wizard |
| 12 | `/map` | `app/(app)/map/page.tsx` | AppShell | Yes | No | Visual incident map |
| 13 | `/case-deck` | `app/(app)/case-deck/page.tsx` | AppShell | Yes | Yes | File (case) dashboard |
| 14 | `/case-deck/new` | `app/(app)/case-deck/new/page.tsx` | AppShell | Yes | Yes | Open new file |
| 15 | `/case-deck/[id]` | `app/(app)/case-deck/[id]/page.tsx` | AppShell | Yes | Yes | File detail + evidence |
| 16 | `/case-deck/devices` | `app/(app)/case-deck/devices/page.tsx` | AppShell | Yes | Yes | Device tracker |
| 17 | `/case-deck/support` | `app/(app)/case-deck/support/page.tsx` | AppShell | Yes | Yes | Counseling & support |
| 18 | `/groups` | `app/(app)/groups/page.tsx` | AppShell | Yes | No | Community groups list |
| 19 | `/groups/create` | `app/(app)/groups/create/page.tsx` | AppShell | Yes | No | Create group |
| 20 | `/groups/[id]` | `app/(app)/groups/[id]/page.tsx` | AppShell | Yes | No | Group chat + management |
| 21 | `/profile` | `app/(app)/profile/page.tsx` | AppShell | Yes | No | Own profile |
| 22 | `/profile/[id]` | `app/(app)/profile/[id]/page.tsx` | AppShell | Yes | No | Other user's profile + posts |
| 23 | `/notifications` | `app/(app)/notifications/page.tsx` | AppShell | Yes | No | User notification list |
| 24 | `/search` | `app/(app)/search/page.tsx` | AppShell | Yes | No | Search incidents + users |
| 25 | `/subscribe` | `app/(app)/subscribe/page.tsx` | AppShell | Yes | No | Subscription packages |
| 26 | `/admin` | `app/admin/page.tsx` | AdminSidebar | Yes | Admin only | Admin dashboard |
| 27 | `/admin/triage` | `app/admin/triage/page.tsx` | AdminSidebar | Yes | Admin only | Incident kanban board |
| 28 | `/admin/users` | `app/admin/users/page.tsx` | AdminSidebar | Yes | Admin only | User management |
| 29 | `/admin/groups` | `app/admin/groups/page.tsx` | AdminSidebar | Yes | Admin only | Group management |
| 30 | `/admin/billing` | `app/admin/billing/page.tsx` | AdminSidebar | Yes | Admin only | Voucher management |
| 31 | `/admin/evidence` | `app/admin/evidence/page.tsx` | AdminSidebar | Yes | Admin only | Media review |
| 32 | `/admin/audit` | `app/admin/audit/page.tsx` | AdminSidebar | Yes | Admin only | Audit log (stub) |
| 33 | `/admin/partners` | `app/admin/partners/page.tsx` | AdminSidebar | Yes | Admin only | Partners (stub) |
| 34 | `/api/upload` | `app/api/upload/route.ts` | None | Yes | No | Vercel Blob upload endpoint |

---

## Navigation Structure

### Bottom Nav (AppShell — mobile, all authenticated users)
- Feed, Map, Report, Groups, Profile

### Bottom Nav (AppShell — subscribers only, adds)
- Feed, Map, Report, **Files**, Groups, Profile

### Admin Sidebar
- Dashboard, Triage, Users, Groups, Billing, Evidence, Audit, Partners

---

## Key Shared Components

| Component | File | Used On |
|-----------|------|---------|
| AppShell | `components/app-shell.tsx` | All `(app)` pages |
| AppHeader | `components/app-header.tsx` | All `(app)` pages |
| IncidentCard | `components/incident-card.tsx` | Feed, Search, Profile/[id] |
| ReactionButtons | `components/reaction-buttons.tsx` | Incident detail |
| CommentSection | `components/comment-section.tsx` | Incident detail |
| GroupChat | `components/group-chat.tsx` | Groups/[id] |
| CaseTimeline | `components/case-timeline.tsx` | Case-deck/[id] |
| CaseEvidenceUpload | `components/case-evidence-upload.tsx` | Case-deck/[id] |
| FeedFilters | `components/feed-filters.tsx` | Feed |
| AdCard | `components/ad-card.tsx` | Feed |

---

## Detailed Page Documentation

See the combined document: `PAGES_FUNCTIONAL_DOCS.md`
