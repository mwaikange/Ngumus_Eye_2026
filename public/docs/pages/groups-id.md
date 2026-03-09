# Page: /groups/[id]

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/groups/[id]/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** No

---

## 1) Purpose
- Group detail page: shows group info, member list, and real-time group chat.
- Group admins can manage members, approve join requests, and update group settings.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Membership required:** Must be an active member of the group to view chat (RLS enforced). Non-members see group info + join option only.
- **Admin actions:** Restricted to group members with `role = "admin"` in `group_members`.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getGroup(id)` — `lib/actions/groups.ts` |
| Server Action | `getGroupMessages(groupId)` — `lib/actions/groups.ts` |
| Server Action | `getGroupMembers(groupId)` — `lib/actions/groups.ts` |
| Tables read | `groups`, `group_members`, `group_messages`, `profiles` |
| Server Action | `sendGroupMessage(groupId, content)` — `lib/actions/groups.ts` |
| Server Action | `leaveGroup(groupId)` — `lib/actions/groups.ts` |
| Server Action | `removeMember(groupId, userId)` — `lib/actions/groups.ts` |
| Server Action | `approveJoinRequest(groupId, userId)` — `lib/actions/groups.ts` |
| Realtime | `supabase.channel()` subscription on `group_messages` for live chat |
| Storage | Message image attachments via Vercel Blob |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Back + group name |
| Group header | Group avatar, name, description, member count |
| Tabs | Chat / Members / About (or similar) |
| GroupChat | Real-time message list + input (`components/group-chat.tsx`) |
| Members tab | List of members with role badges |
| Pending requests | Admin-only: list of pending join requests |
| Leave Group button | For members to leave |
| Report Group button | `components/report-group-button.tsx` |
| Manage Requests dialog | `components/manage-requests-dialog.tsx` (admin only) |

---

## 5) Actions

### Action: Send Message
- **Location:** GroupChat message input at bottom of chat
- **Trigger:** Send button or Enter
- **Preconditions:** Active group member; message non-empty (max 1000 chars)
- **Client-side validation:** Non-empty check; length limit
- **Request:** `sendGroupMessage(groupId, { content, image_url? })` — `lib/actions/groups.ts`
- **Database changes:** Insert into `group_messages { group_id, user_id, content, image_url, created_at }`
- **Side effects:** All other group members receive message via Supabase Realtime subscription
- **Success state:** Message appears in chat immediately (optimistic)
- **Failure states:** Error toast; message may not persist

### Action: Send Message with Image
- **Location:** Camera icon in chat input
- **Trigger:** File picker
- **Preconditions:** Active member; image file
- **Request:** `POST /api/upload` → Vercel Blob URL → sent with message
- **Database changes:** `group_messages.image_url` set
- **Success state:** Image shown inline in chat

### Action: Leave Group
- **Location:** Group header or settings — "Leave Group" button
- **Trigger:** Click → confirm dialog
- **Preconditions:** Must be a member; admins cannot leave if they are the only admin
- **Request:** `leaveGroup(groupId)` — `lib/actions/groups.ts`
- **Database changes:** `group_members` row deleted or `status` set to `"left"`
- **Success state:** Navigate to `/groups`; toast "Left group"
- **Failure states:** Last admin → error "Transfer admin role before leaving"

### Action: Approve Join Request (Admin only)
- **Location:** Manage Requests dialog
- **Trigger:** Click "Approve"
- **Preconditions:** `role = "admin"` in `group_members`
- **Request:** `approveJoinRequest(groupId, userId)` — `lib/actions/groups.ts`
- **Database changes:** `group_members.status` updated to `"active"`; `role` set to `"member"`
- **Side effects:** Notification sent to approved user **TODO (unconfirmed)**
- **Success state:** User appears in members list

### Action: Remove Member (Admin only)
- **Location:** Members list — remove button per member
- **Trigger:** Click → confirm
- **Preconditions:** `role = "admin"`; cannot remove self
- **Request:** `removeMember(groupId, userId)` — `lib/actions/groups.ts`
- **Database changes:** `group_members` row deleted
- **Success state:** Member removed from list

### Action: Report Group
- **Location:** Report button (non-admin members)
- **Trigger:** Click → `ReportGroupButton` dialog
- **Preconditions:** Member of group
- **Request:** `reportGroup(groupId, reason)` — inserts into `group_reports`
- **Database changes:** Insert into `group_reports { group_id, reporter_id, reason, created_at }`
- **Success state:** Toast "Group reported"

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Data fetch |
| Non-member | Group info + join button shown |
| Member | Full chat + tabs |
| Admin | Additional management controls |
| Error | Group not found or fetch error |

---

## 7) Audit & Logging
- All messages stored in `group_messages` with `user_id` + `created_at`.
- Member join/leave recorded in `group_members`.
- Reports stored in `group_reports`.

---

## 8) Test Checklist (UAT)
- Given active member → When visiting → Then chat loaded with message history
- Given non-member → Then group info shown, join option visible, chat hidden
- Given message typed + sent → Then appears in chat for all members
- Given admin visits → Then manage requests + remove member options visible
- Given admin approves pending request → Then user moved to active members
- Given member leaves → Then removed from members list, navigated to `/groups`
- Given report group clicked → Then report submitted, toast shown
- Given Realtime: message sent by another member → Then appears in chat without reload
