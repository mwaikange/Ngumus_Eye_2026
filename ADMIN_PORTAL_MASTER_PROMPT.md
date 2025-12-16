# 🔐 NGUMU'S EYE ADMIN PORTAL - MASTER IMPLEMENTATION PROMPT

## 📋 EXECUTIVE SUMMARY

You are building a comprehensive Admin Portal for NGUMU'S EYE, a community safety platform. This portal must integrate perfectly with the existing Next.js mobile app that uses Supabase PostgreSQL, Supabase Auth, Vercel Blob storage, and Row Level Security (RLS).

**CRITICAL**: You are NOT building the mobile app. The mobile app already exists and is fully functional. Your job is to build ONLY the Admin Portal that manages users, posts, cases, subscriptions, ads, and staff for that existing app.

---

## 🎯 TECH STACK REQUIREMENTS

### **Framework & Runtime**
- **Next.js 16** (App Router)
- **React 19.2**
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (with design tokens)
- Server Components by default, Client Components only when necessary

### **Database & Auth**
- **Supabase PostgreSQL** (existing database - DO NOT recreate tables)
- **Supabase Auth** for admin staff authentication
- **Row Level Security (RLS)** - must respect existing policies
- **Server Actions** for all mutations

### **Storage & Media**
- **Vercel Blob** for file uploads (ads, evidence, media)

### **Deployment**
- **Vercel** (same project as mobile app, different route `/admin`)

---

## 📊 EXISTING DATABASE SCHEMA REFERENCE

### **Core Tables You Will Query/Update**

#### **profiles** (Users)
```sql
id uuid PRIMARY KEY (references auth.users)
display_name text
phone text UNIQUE
trust_score int DEFAULT 0  -- Range: 0-100
level int DEFAULT 0  -- User level: 0-5 (0=normal, 4+=admin)
home_geohash text
work_geohash text
is_banned boolean DEFAULT false
created_at timestamptz
updated_at timestamptz
```

#### **incidents** (Feed Posts)
```sql
id uuid PRIMARY KEY
type_id int REFERENCES incident_types(id)
title text
description text
lat double precision
lng double precision
geohash text
area_radius_m int DEFAULT 200
status text CHECK (status IN ('new','verifying','assigned','resolved','archived'))
verification_level int (0-3)  -- 0=unverified, 3=fully verified
created_by uuid REFERENCES profiles(id)
created_at timestamptz
updated_at timestamptz
```

#### **incident_media** (Post Images/Videos)
```sql
id uuid PRIMARY KEY
incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE
path text  -- Vercel Blob URL
sha256 text
mime text
created_at timestamptz
```

#### **incident_events** (Post Actions Log)
```sql
id uuid PRIMARY KEY
incident_id uuid REFERENCES incidents(id)
actor uuid REFERENCES profiles(id)
kind text  -- 'admin_delete', 'admin_warn', 'admin_confirm', etc.
data jsonb  -- {"reason": "...", "severity": "...", etc.}
created_at timestamptz
```

#### **trust_score_history** (Trust Score Changes)
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES profiles(id)
delta int  -- Change amount (+5, -10, etc.)
reason text
created_at timestamptz
```

#### **incident_files** (Case Deck Cases)
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES profiles(id)
category text CHECK (category IN ('theft','gbv','harassment','missing_person','fraud','domestic','stolen_device','other'))
title text
description text
status text CHECK (status IN ('new','assigned','in_progress','closed','archived'))
investigator_id uuid REFERENCES profiles(id)  -- Admin/Staff assigned
priority text CHECK (priority IN ('low','medium','high','urgent'))
case_number text UNIQUE  -- Auto-generated: CASE-25-000001
created_at timestamptz
updated_at timestamptz
closed_at timestamptz
```

#### **incident_file_updates** (Case Timeline)
```sql
id uuid PRIMARY KEY
incident_file_id uuid REFERENCES incident_files(id)
update_text text
media_urls text[]
officer_id uuid REFERENCES profiles(id)
is_public boolean DEFAULT false
created_at timestamptz
```

#### **case_evidence** (Case Attachments)
```sql
id uuid PRIMARY KEY
incident_file_id uuid REFERENCES incident_files(id)
file_type text CHECK (file_type IN ('image','video','audio','document'))
file_url text  -- Vercel Blob URL
file_name text
file_size int
description text
uploaded_by uuid REFERENCES profiles(id)
created_at timestamptz
```

#### **tracked_devices** (Stolen Device Tracking)
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES profiles(id)
device_name text
device_type text CHECK (device_type IN ('phone','tablet','laptop','watch','other'))
imei text
serial_number text
status text CHECK (status IN ('active','stolen','recovered','lost'))
last_seen_location text
last_seen_at timestamptz
reported_stolen_at timestamptz
recovered_at timestamptz
notes text
created_at timestamptz
updated_at timestamptz
```

#### **support_requests** (Counseling/Support)
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES profiles(id)
request_type text CHECK (request_type IN ('counseling','emergency','legal','other'))
priority text CHECK (priority IN ('low','medium','high','urgent'))
description text
status text CHECK (status IN ('pending','assigned','in_progress','completed','cancelled'))
assigned_to uuid REFERENCES profiles(id)
scheduled_at timestamptz
completed_at timestamptz
notes text
created_at timestamptz
updated_at timestamptz
```

#### **plans** (Subscription Packages)
```sql
id serial PRIMARY KEY
code text UNIQUE
label text
period_days int
price_cents int
duration_type text CHECK (duration_type IN ('month','week','day'))
duration_length int
package_type text CHECK (package_type IN ('individual','family','tourist'))
description text
features jsonb
```

**Correct Membership Packages** (as of latest fix):
```
Individual Plans:
- N$70 / 30 days (monthly)
- N$195 / 90 days (3 months)
- N$360 / 180 days (6 months)
- N$672 / 365 days (12 months)

Family Plans:
- N$150 / 90 days (3 months)
- N$450 / 180 days (6 months)
- N$1800 / 365 days (12 months)

Tourist Plans:
- N$500 / 14 days (fixed from 7 days)
```

#### **user_subscriptions** (Active Subscriptions)
```sql
user_id uuid REFERENCES profiles(id)
plan_id int REFERENCES plans(id)
started_at timestamptz
expires_at timestamptz
status text CHECK (status IN ('active','expired','pending','cancelled'))
auto_renew boolean
payment_reference text
created_at timestamptz
PRIMARY KEY (user_id, plan_id, started_at)
```

#### **vouchers** (Subscription Codes)
```sql
code text PRIMARY KEY
plan_id int REFERENCES plans(id)
days int
issued_to_email text
redeemed_by uuid REFERENCES profiles(id)
redeemed_at timestamptz
```

#### **reactions** (Post Reactions)
```sql
incident_id uuid REFERENCES incidents(id)
user_id uuid REFERENCES profiles(id)
kind text CHECK (kind IN ('seen','helpful','not_helpful','follow'))
created_at timestamptz
PRIMARY KEY (incident_id, user_id, kind)
```

#### **comments** (Post Comments)
```sql
id uuid PRIMARY KEY
incident_id uuid REFERENCES incidents(id)
author uuid REFERENCES profiles(id)
body text
created_at timestamptz
```

---

## 🔧 NEW TABLES YOU MUST CREATE

### **admin_staff** (Admin Portal Users)
```sql
CREATE TABLE IF NOT EXISTS public.admin_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text CHECK (role IN ('staff', 'service_provider')) DEFAULT 'staff',
  access_level int CHECK (access_level IN (1, 2, 3)) DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_admin_staff_profile_id ON public.admin_staff(profile_id);
CREATE INDEX idx_admin_staff_role ON public.admin_staff(role);
CREATE INDEX idx_admin_staff_email ON public.admin_staff(email);
```

**Access Levels:**
- **Level 1**: User Management, Feed Post Management, Profile
- **Level 2**: Level 1 + Case Management + User Subscriptions
- **Level 3**: Everything + App Management (full admin)

### **ad_inventory** (Admin Uploaded Ads)
```sql
CREATE TABLE IF NOT EXISTS public.ad_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,  -- Vercel Blob URL
  banner_url text,  -- Optional banner version
  link_url text,  -- Optional hyperlink
  is_active boolean DEFAULT true,
  display_priority int DEFAULT 0,  -- Higher = shows more often
  impressions int DEFAULT 0,
  clicks int DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ad_inventory_active ON public.ad_inventory(is_active, display_priority DESC);
```

### **system_notifications** (Admin → User Messages)
```sql
CREATE TABLE IF NOT EXISTS public.system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text CHECK (type IN ('warning', 'info', 'alert', 'confirmation')) DEFAULT 'info',
  related_incident_id uuid REFERENCES public.incidents(id),
  read_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_system_notifications_recipient ON public.system_notifications(recipient_id, created_at DESC);
CREATE INDEX idx_system_notifications_read ON public.system_notifications(recipient_id, read_at);
```

---

## 🛡️ RLS POLICIES

### **Admin Staff Access**
```sql
-- Admin staff can only be managed by Level 3 admins
ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Level 3 admins can manage staff" ON public.admin_staff
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_staff
      WHERE profile_id = (SELECT auth.uid()) AND access_level = 3
    )
  );

CREATE POLICY "Staff can view their own record" ON public.admin_staff
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));
```

### **Ad Inventory**
```sql
ALTER TABLE public.ad_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Level 2+ can manage ads" ON public.ad_inventory
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_staff
      WHERE profile_id = (SELECT auth.uid()) AND access_level >= 2
    )
  );
```

### **System Notifications**
```sql
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications" ON public.system_notifications
  FOR SELECT TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "Staff can send notifications" ON public.system_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_staff
      WHERE profile_id = (SELECT auth.uid()) AND is_active = true
    )
  );
```

---

## 🏗️ ADMIN PORTAL ARCHITECTURE

### **Project Structure**
```
admin-portal/
├── app/
│   ├── admin/
│   │   ├── layout.tsx  -- Protected layout, sidebar navigation
│   │   ├── page.tsx  -- Dashboard overview
│   │   ├── users/
│   │   │   ├── page.tsx  -- User Management
│   │   │   └── [id]/page.tsx  -- User Detail View
│   │   ├── feed/
│   │   │   ├── page.tsx  -- Feed Post Management
│   │   │   └── [id]/page.tsx  -- Post Process Popup
│   │   ├── cases/
│   │   │   ├── page.tsx  -- Case Management
│   │   │   └── [id]/page.tsx  -- Case Detail View
│   │   ├── subscriptions/
│   │   │   ├── page.tsx  -- Membership Management
│   │   │   └── generate/page.tsx  -- Generate Voucher Codes
│   │   ├── ads/
│   │   │   ├── page.tsx  -- Ad Management
│   │   │   └── new/page.tsx  -- Upload New Ad
│   │   ├── app-management/
│   │   │   ├── staff/page.tsx  -- Staff Management
│   │   │   └── providers/page.tsx  -- Service Providers
│   │   └── profile/page.tsx  -- Admin Profile
│   └── api/
│       ├── admin/
│       │   ├── upload-ad/route.ts  -- Vercel Blob upload for ads
│       │   └── generate-voucher/route.ts  -- Generate subscription codes
│       └── webhooks/
│           └── case-email/route.ts  -- Email notifications to service providers
├── components/
│   ├── admin/
│   │   ├── sidebar.tsx  -- Admin navigation
│   │   ├── user-table.tsx
│   │   ├── feed-post-card.tsx
│   │   ├── case-detail-view.tsx
│   │   ├── process-post-dialog.tsx  -- Post moderation popup
│   │   ├── subscription-generator.tsx
│   │   └── staff-access-control.tsx
│   └── ui/  -- shadcn/ui components
├── lib/
│   ├── actions/
│   │   ├── admin-users.ts
│   │   ├── admin-feed.ts
│   │   ├── admin-cases.ts
│   │   ├── admin-subscriptions.ts
│   │   ├── admin-ads.ts
│   │   └── admin-staff.ts
│   ├── supabase/
│   │   ├── server.ts  -- Supabase server client
│   │   └── admin-client.ts  -- Admin-specific queries
│   └── utils/
│       ├── access-control.ts  -- Permission checking
│       └── email.ts  -- Email service for case assignments
└── middleware.ts  -- Route protection for /admin
```

---

## 📋 FEATURE IMPLEMENTATION GUIDE

## **1. USER MANAGEMENT**

### **Page: `/admin/users`**

**UI Requirements:**
- Data table with columns: Name, Surname, UID (shortened), Subscription Status, Email, Mobile, Join Date
- Search bar (search by name, email, phone)
- Date range filter (from date → to date)
- Status filter dropdown: All / Subscribed / Not Subscribed / Banned
- Export to CSV button
- Pagination (50 users per page)

**Query Logic:**
```typescript
// lib/actions/admin-users.ts
export async function getUserList({
  search = '',
  status = 'all',
  fromDate,
  toDate,
  page = 1,
  perPage = 50
}: UserListParams) {
  const supabase = await createAdminClient()
  
  let query = supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      phone,
      trust_score,
      level,
      is_banned,
      created_at,
      user_subscriptions!inner(
        expires_at,
        status,
        plans(label)
      )
    `)
  
  // Search filter
  if (search) {
    query = query.or(`display_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }
  
  // Subscription status filter
  if (status === 'subscribed') {
    query = query.filter('user_subscriptions.expires_at', 'gte', new Date().toISOString())
  } else if (status === 'not_subscribed') {
    query = query.is('user_subscriptions', null)
  } else if (status === 'banned') {
    query = query.eq('is_banned', true)
  }
  
  // Date range filter
  if (fromDate) query = query.gte('created_at', fromDate)
  if (toDate) query = query.lte('created_at', toDate)
  
  // Pagination
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  
  const { data, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return { users: data, total: count, page, perPage }
}
```

**Data Shape:**
```typescript
interface UserRow {
  id: string  // UUID
  display_name: string | null
  phone: string | null
  trust_score: number  // 0-100
  level: number  // 0-5
  is_banned: boolean
  created_at: string
  subscription_status: 'subscribed' | 'not_subscribed' | 'expired'
  subscription_plan?: string  // "Individual Monthly"
  days_left?: number
}
```

**Actions:**
- View user detail → `/admin/users/[id]`
- Ban/Unban user
- Adjust trust score (admin level 3 only)
- View subscription history
- View incident history

---

## **2. FEED POST MANAGEMENT**

### **Page: `/admin/feed`**

**UI Requirements:**
- Feed post cards showing:
  - Post image thumbnail (if exists)
  - User name, surname
  - Subscription status badge (Subscribed / Not)
  - Post title & excerpt
  - Category badge (incident type)
  - Verification level indicator (0-3 stars)
  - "Process" button
- Filters: All / Unverified / Verified / Flagged
- Sort: Most Recent / Most Reactions / Most Comments

**Query Logic:**
```typescript
// lib/actions/admin-feed.ts
export async function getFeedPosts({
  filter = 'all',
  sortBy = 'recent',
  page = 1
}: FeedParams) {
  const supabase = await createAdminClient()
  
  let query = supabase
    .from('incidents')
    .select(`
      id,
      title,
      description,
      status,
      verification_level,
      created_at,
      created_by,
      profiles!inner(
        display_name,
        phone,
        trust_score,
        user_subscriptions(expires_at, status)
      ),
      incident_types(label, code),
      incident_media(path, mime),
      reactions(count),
      comments(count)
    `)
  
  // Filter logic
  if (filter === 'unverified') {
    query = query.eq('verification_level', 0)
  } else if (filter === 'verified') {
    query = query.gte('verification_level', 2)
  }
  
  // Sort logic
  if (sortBy === 'recent') {
    query = query.order('created_at', { ascending: false })
  }
  
  const { data, error } = await query.limit(20)
  
  if (error) throw error
  return data
}
```

### **Process Post Dialog** (Popup Overlay)

**Triggered by:** Click "Process" button on post card

**UI Requirements:**
- Modal dialog (full screen on mobile, centered popup on desktop)
- Display:
  - Post image (large)
  - Post title & full description
  - User info (name, trust score, subscription status)
  - Post location (map pin or address)
  - Post date & time
  - Current verification level

**Action Buttons:**
1. **Delete without warning**
   - Deletes post immediately
   - No notification sent
   - Logs action in `incident_events`

2. **Delete with warning**
   - Deletes post
   - Sends notification to user with reason
   - Logs action with reason

3. **Delete + Decrease Trust Score**
   - Deletes post
   - Decreases user trust score by X points (admin enters value)
   - Sends notification
   - Logs to `trust_score_history`

4. **Send Message**
   - Opens message input
   - Sends system notification to user
   - Does NOT delete post

5. **Confirm Incident**
   - Increases `verification_level` to 3
   - Increases user trust score by +5
   - Sends confirmation notification
   - Opens severity selector popup

**Severity Selector (for Map Display):**
```typescript
type Severity = 'low' | 'medium' | 'high' | 'critical'
```
- Stored in `incident_types.severity` or `incidents.verification_level`
- Controls map pin color:
  - Low: Yellow
  - Medium: Orange
  - High: Red
  - Critical: Purple

**Server Actions:**
```typescript
// lib/actions/admin-feed.ts

export async function deletePost(
  incidentId: string,
  action: 'no_warning' | 'with_warning' | 'decrease_trust',
  reason?: string,
  trustScoreDelta?: number
) {
  const supabase = await createAdminClient()
  
  // Get post and user info
  const { data: incident } = await supabase
    .from('incidents')
    .select('*, profiles(id, display_name)')
    .eq('id', incidentId)
    .single()
  
  if (!incident) throw new Error('Post not found')
  
  // Log the action
  await supabase.from('incident_events').insert({
    incident_id: incidentId,
    actor: (await supabase.auth.getUser()).data.user?.id,
    kind: `admin_delete_${action}`,
    data: { reason, trust_score_delta: trustScoreDelta }
  })
  
  // Handle trust score
  if (action === 'decrease_trust' && trustScoreDelta) {
    await supabase.rpc('update_trust_score', {
      p_user_id: incident.created_by,
      p_delta: -trustScoreDelta,
      p_reason: reason || 'Post deleted by admin'
    })
  }
  
  // Send notification if needed
  if (action !== 'no_warning') {
    await supabase.from('system_notifications').insert({
      recipient_id: incident.created_by,
      title: 'Post Removed',
      message: reason || 'Your post was removed by a moderator.',
      type: 'warning',
      related_incident_id: incidentId,
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
  }
  
  // Delete post
  await supabase.from('incidents').delete().eq('id', incidentId)
  
  return { success: true }
}

export async function confirmIncident(
  incidentId: string,
  severity: Severity
) {
  const supabase = await createAdminClient()
  
  // Update verification level
  await supabase
    .from('incidents')
    .update({ 
      verification_level: 3,
      status: 'verified'
    })
    .eq('id', incidentId)
  
  // Get post creator
  const { data: incident } = await supabase
    .from('incidents')
    .select('created_by')
    .eq('id', incidentId)
    .single()
  
  // Increase trust score
  await supabase.rpc('update_trust_score', {
    p_user_id: incident.created_by,
    p_delta: 5,
    p_reason: 'Incident confirmed by admin'
  })
  
  // Log action
  await supabase.from('incident_events').insert({
    incident_id: incidentId,
    actor: (await supabase.auth.getUser()).data.user?.id,
    kind: 'admin_confirm',
    data: { severity }
  })
  
  // Send confirmation notification
  await supabase.from('system_notifications').insert({
    recipient_id: incident.created_by,
    title: 'Incident Confirmed',
    message: 'Your report has been verified and confirmed by our team.',
    type: 'confirmation',
    related_incident_id: incidentId,
    created_by: (await supabase.auth.getUser()).data.user?.id
  })
  
  return { success: true }
}

export async function sendUserMessage(
  userId: string,
  title: string,
  message: string,
  relatedIncidentId?: string
) {
  const supabase = await createAdminClient()
  
  await supabase.from('system_notifications').insert({
    recipient_id: userId,
    title,
    message,
    type: 'info',
    related_incident_id: relatedIncidentId,
    created_by: (await supabase.auth.getUser()).data.user?.id
  })
  
  return { success: true }
}
```

---

## **3. CASE MANAGEMENT**

### **Page: `/admin/cases`**

**Access Control:** Level 2+ only

**UI Requirements:**
- Data table with columns:
  - Case Number (CASE-25-000001)
  - Case Type (Theft, GBV, Harassment, etc.)
  - User Name
  - UID (shortened)
  - Membership Type (Individual Monthly, etc.)
  - Membership Status (Active / Expired)
  - Priority (Low / Medium / High / Urgent) - colored badges
  - Status (New / Assigned / In Progress / Closed) - colored badges
  - Assigned To (Staff / Service Provider name, or "Unassigned")
  - Created Date
  - "View" button

**Filters:**
- Status: All / New / Assigned / In Progress / Closed
- Priority: All / Low / Medium / High / Urgent
- Assigned: All / Unassigned / Assigned to Me / Assigned to Others
- Date Range

**Query Logic:**
```typescript
// lib/actions/admin-cases.ts
export async function getCaseList({
  status = 'all',
  priority = 'all',
  assigned = 'all',
  staffId,
  page = 1
}: CaseListParams) {
  const supabase = await createAdminClient()
  
  let query = supabase
    .from('incident_files')
    .select(`
      id,
      case_number,
      category,
      title,
      status,
      priority,
      created_at,
      user:profiles!user_id(
        id,
        display_name,
        user_subscriptions(
          status,
          plans(label, package_type)
        )
      ),
      investigator:profiles!investigator_id(
        display_name
      ),
      service_provider:admin_staff!investigator_id(
        full_name,
        role
      )
    `)
  
  // Status filter
  if (status !== 'all') {
    query = query.eq('status', status)
  }
  
  // Priority filter
  if (priority !== 'all') {
    query = query.eq('priority', priority)
  }
  
  // Assignment filter
  if (assigned === 'unassigned') {
    query = query.is('investigator_id', null)
  } else if (assigned === 'assigned_to_me') {
    query = query.eq('investigator_id', staffId)
  }
  
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * 50, page * 50 - 1)
  
  if (error) throw error
  return data
}
```

### **Case Detail View** (Large Popup/Modal)

**Triggered by:** Click "View" button

**UI Layout:**
```
┌─────────────────────────────────────────────────┐
│  CASE-25-000123                   [X] Close     │
│  Status: In Progress  Priority: High            │
├─────────────────────────────────────────────────┤
│                                                  │
│  User Information:                               │
│  Name: John Doe                                  │
│  UID: 9f42400a-fc3d                              │
│  Phone: +264 81 234 5678                         │
│  Membership: Individual Monthly (Active)         │
│  Days Left: 15                                   │
│  Trust Score: 68                                 │
│                                                  │
│  Case Details:                                   │
│  Category: Theft                                 │
│  Title: Stolen Laptop                            │
│  Description: [Full description here...]         │
│  Created: 2025-11-10 14:32                       │
│                                                  │
│  Assigned To:                                    │
│  [Dropdown: Select Staff / Service Provider]    │
│  [Assign Button]                                 │
│                                                  │
│  Evidence Attachments:                           │
│  - Image: stolen_laptop.jpg [Download]          │
│  - Document: police_report.pdf [Download]       │
│                                                  │
│  Case Timeline:                                  │
│  - 2025-11-10 14:32: Case created               │
│  - 2025-11-11 09:15: Assigned to Officer Smith  │
│  - 2025-11-12 16:45: Evidence reviewed          │
│                                                  │
│  Actions:                                        │
│  [Download PDF]  [Email Case]  [Close Case]     │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Server Actions:**
```typescript
// lib/actions/admin-cases.ts

export async function assignCase(
  caseId: string,
  assigneeId: string,
  assigneeType: 'staff' | 'service_provider'
) {
  const supabase = await createAdminClient()
  
  // Get case details for phone number
  const { data: caseData } = await supabase
    .from('incident_files')
    .select(`
      *,
      user:profiles!user_id(phone)
    `)
    .eq('id', caseId)
    .single()

  // Update case
  await supabase
    .from('incident_files')
    .update({ 
      investigator_id: assigneeId,
      status: 'assigned',
      updated_at: new Date().toISOString()
    })
    .eq('id', caseId)
  
  // Log timeline update
  await supabase.from('incident_file_updates').insert({
    incident_file_id: caseId,
    update_text: `Case assigned to ${assigneeType}`,
    officer_id: (await supabase.auth.getUser()).data.user?.id,
    is_public: false
  })
  
  // If service provider, send email
  if (assigneeType === 'service_provider') {
    const { data: provider } = await supabase
      .from('admin_staff')
      .select('email, full_name')
      .eq('profile_id', assigneeId)
      .single()
    
    // Send email (implement email service)
    await sendCaseAssignmentEmail(provider.email, {
      providerName: provider.full_name,
      caseNumber: caseData.case_number,
      userName: caseData.user.display_name,
      userPhone: caseData.user.phone,
      caseDescription: caseData.description,
      priority: caseData.priority
    })
  }
  
  // Send SMS to user that their case is assigned
  if (caseData.user.phone) {
    await assignCaseToInvestigator(caseId, assigneeId, caseData.user.phone)
  }
  
  return { success: true }
}

export async function closeCase(
  caseId: string,
  remarks: string
) {
  const supabase = await createAdminClient()
  
  await supabase
    .from('incident_files')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString()
    })
    .eq('id', caseId)
  
  // Log closure
  await supabase.from('incident_file_updates').insert({
    incident_file_id: caseId,
    update_text: `Case closed. Remarks: ${remarks}`,
    officer_id: (await supabase.auth.getUser()).data.user?.id,
    is_public: true
  })
  
  return { success: true }
}

export async function downloadCasePDF(caseId: string) {
  // Generate PDF with all case details
  // Return blob/download link
  // Implementation: Use jsPDF or server-side PDF generator
}

export async function emailCase(
  caseId: string,
  recipientEmail: string
) {
  // Send case details via email
  // Implementation: Use email service (SendGrid, Resend, etc.)
}
```

---

## **4. MEMBERSHIP MANAGEMENT**

### **Page: `/admin/subscriptions`**

**Access Control:** Level 2+ only

**UI Sections:**

#### **A. Generate Subscription Codes**

**Form:**
- Package Type dropdown (Individual / Family / Tourist)
- Package Duration dropdown (populated based on type selected)
  - Individual: 30d, 90d, 180d, 365d
  - Family: 90d, 180d, 365d
  - Tourist: 14d
- User Mobile Number (optional - can be blank for general codes)
- Generate button

**Logic:**
```typescript
// lib/actions/admin-subscriptions.ts

// **REPLACE TWILIO SENDSMS WITH THIS**
async function sendSMS(phoneNumber: string, message: string) {
  const { sendSMS } = await import('@/lib/utils/sms')
  
  return await sendSMS({
    phone: phoneNumber,
    message,
    messageType: 'notification',
  })
}

export async function generateVoucherCode({
  packageType,
  durationDays,
  userMobile
}: {
  packageType: string
  durationDays: number
  userMobile?: string
}) {
  const supabase = await createAdminClient()
  
  // Get plan_id
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('package_type', packageType)
    .eq('period_days', durationDays)
    .single()
  
  if (!plan) throw new Error('Plan not found')
  
  // Generate unique code (format: IND-XXXX-XXXXXX)
  const prefix = packageType === 'individual' ? 'IND' : 
                 packageType === 'family' ? 'FAM' : 'TOU'
  const code = `${prefix}-${generateRandomString(4)}-${generateRandomString(6)}`
  
  // Insert voucher
  await supabase.from('vouchers').insert({
    code,
    plan_id: plan.id,
    days: durationDays,
    issued_to_email: userMobile ? `${userMobile}@generated.local` : null
  })
  
  // If user mobile provided, send SMS with code
  if (userMobile) {
    await sendSMS(userMobile, `Your NGUMU subscription code: ${code}. Valid for ${durationDays} days. Redeem at ngumu.app/subscribe`)
  }
  
  return { code, success: true }
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
```

#### **B. Subscription List**

**UI Requirements:**
- Data table with columns:
  - Name
  - Surname
  - UID (shortened)
  - Package Type (Individual Monthly, etc.)
  - Status Badge (Subscribed / Requested / Expired)
  - Days Left (countdown)
  - Created Date
  - Expires Date
  - Action Button (status-dependent)

**Status-Dependent Actions:**
- **Requested (Green badge)**: Show "Approve" button
  - Approving assigns subscription and marks as active
- **Subscribed (Blue badge)**: Show "Extend" button
  - Opens dialog to add more days
- **Expired (Red badge)**: Show "Send Reminder" button
  - Sends SMS with CTA to renew

**Query Logic:**
```typescript
export async function getSubscriptionList({
  status = 'all',
  page = 1
}: {
  status: 'all' | 'active' | 'expired' | 'pending'
  page: number
}) {
  const supabase = await createAdminClient()
  
  let query = supabase
    .from('user_subscriptions')
    .select(`
      user_id,
      expires_at,
      status,
      payment_reference,
      created_at,
      plans(label, package_type, period_days),
      profiles!inner(id, display_name, phone)
    `)
  
  const now = new Date().toISOString()
  
  if (status === 'active') {
    query = query.gte('expires_at', now)
  } else if (status === 'expired') {
    query = query.lt('expires_at', now)
  } else if (status === 'pending') {
    query = query.eq('status', 'pending')
  }
  
  const { data, error } = await query
    .order('expires_at', { ascending: false })
    .range((page - 1) * 50, page * 50 - 1)
  
  if (error) throw error
  
  // Calculate days left
  return data.map(sub => ({
    ...sub,
    days_left: Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }))
}

// **REPLACE TWILIO SENDSMS WITH THIS**
export async function sendRenewalReminder(userId: string, phone: string, daysLeft: number) {
  const message = daysLeft === 0 
    ? 'Your NGUMU subscription has expired. Renew now to continue accessing premium features. Visit ngumu.app/subscribe'
    : `Your NGUMU subscription expires in ${daysLeft} days. Renew now to avoid interruption. Visit ngumu.app/subscribe`
  
  const { sendSMS } = await import('@/lib/utils/sms')
  await sendSMS({
    phone,
    message,
    messageType: 'reminder',
    userId,
  })
  
  return { success: true }
}
```

---

## **5. AD MANAGEMENT**

### **Page: `/admin/ads`**

**Access Control:** Level 2+ only

**UI Sections:**

#### **A. Upload New Ad**

**Form:**
- Ad Title (text input)
- Standard Image (file upload - accepts jpg, png, webp)
  - Recommended size: 1200x628px
- Banner Image (file upload - optional)
  - Recommended size: 728x90px or 320x100px (mobile)
- Link URL (text input - optional)
  - If provided, clicking ad in feed opens this URL
- Display Priority (slider: 0-10)
  - Higher priority = shows more often
- Active (toggle switch)

**Upload Logic:**
```typescript
// app/api/admin/upload-ad/route.ts
import { put } from '@vercel/blob'

export async function POST(request: Request) {
  const formData = await request.formData()
  const title = formData.get('title') as string
  const imageFile = formData.get('image') as File
  const bannerFile = formData.get('banner') as File | null
  const linkUrl = formData.get('linkUrl') as string | null
  const priority = parseInt(formData.get('priority') as string)
  
  // Upload to Vercel Blob
  const imageBlob = await put(`ads/${Date.now()}-${imageFile.name}`, imageFile, {
    access: 'public'
  })
  
  let bannerUrl = null
  if (bannerFile) {
    const bannerBlob = await put(`ads/banners/${Date.now()}-${bannerFile.name}`, bannerFile, {
      access: 'public'
    })
    bannerUrl = bannerBlob.url
  }
  
  // Save to database
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('ad_inventory').insert({
    title,
    image_url: imageBlob.url,
    banner_url: bannerUrl,
    link_url: linkUrl,
    display_priority: priority,
    is_active: true,
    created_by: (await supabase.auth.getUser()).data.user?.id
  }).select().single()
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  
  return Response.json({ success: true, ad: data })
}
```

#### **B. Ad List & Management**

**UI Requirements:**
- Grid view of ads showing:
  - Ad image thumbnail
  - Ad title
  - Link URL (if exists)
  - Active/Inactive badge
  - Display priority number
  - Impressions count
  - Clicks count
  - Edit button
  - Delete button
  - Toggle Active/Inactive switch

**Feed Integration Logic:**

Ads must appear in the mobile app feed between posts at random intervals.

```typescript
// Mobile app: lib/actions/feed.ts (existing file - you must ADD this logic)

export async function getFeedWithAds(page: number = 1) {
  const supabase = await createClient()
  
  // Get regular feed posts
  const { data: posts } = await supabase
    .from('incidents')
    .select('...')  // existing query
    .range((page - 1) * 10, page * 10 - 1)
  
  // Get active ads
  const { data: ads } = await supabase
    .from('ad_inventory')
    .select('*')
    .eq('is_active', true)
    .order('display_priority', { ascending: false })
  
  // Insert ads randomly after 3-7 posts
  const feedWithAds = []
  let adIndex = 0
  let nextAdPosition = Math.floor(Math.random() * 5) + 3  // Random 3-7
  
  posts.forEach((post, index) => {
    feedWithAds.push({ type: 'post', data: post })
    
    if (index === nextAdPosition && ads[adIndex]) {
      feedWithAds.push({ type: 'ad', data: ads[adIndex] })
      adIndex++
      nextAdPosition += Math.floor(Math.random() * 5) + 3
    }
  })
  
  return feedWithAds
}
```

**Ad Click Tracking:**
```typescript
// Mobile app: lib/actions/ads.ts (NEW FILE)

export async function trackAdClick(adId: string) {
  const supabase = await createClient()
  
  await supabase.rpc('increment_ad_clicks', { ad_id: adId })
  
  return { success: true }
}

// Database function (add to migration)
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.ad_inventory
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;
```

---

## **6. APP MANAGEMENT**

### **Page: `/admin/app-management/staff`**

**Access Control:** Level 3 ONLY

**UI Sections:**

#### **A. Add New Staff**

**Form:**
- Full Name (text input)
- Email (text input - must be unique)
- Access Level (dropdown):
  - Level 1: User Management, Feed Post Management, Profile
  - Level 2: Level 1 + Case Management + User Subscriptions
  - Level 3: Everything + App Management
- Generate Password (button - auto-generates secure password)
- Send Credentials (toggle - if on, emails credentials to staff)
- Add button

**Logic:**
```typescript
// lib/actions/admin-staff.ts

// **REPLACE TWILIO SENDSMS WITH THIS FOR CREDENTIALS EMAIL**
async function sendStaffCredentialsEmail(email: string, data: any) {
  const { sendSMS } = await import('@/lib/utils/sms')
  
  const message = `
    Welcome to NGUMU Admin Portal, ${data.fullName}!
    Your account is ready.
    Email: ${data.email}
    Password: ${data.password}
    Login: ${data.loginUrl}
    Please change your password after logging in.
  `
  
  await sendSMS({
    phone: data.phone, // Assuming you can get the phone number associated with the new staff
    message,
    messageType: 'notification',
    userId: data.profile_id // You'll need to pass the profile_id
  })
}

export async function addStaff({
  fullName,
  email,
  accessLevel,
  sendCredentials = false, // Added default value
  staffPhone // Added staffPhone parameter
}: {
  fullName: string
  email: string
  accessLevel: 1 | 2 | 3
  sendCredentials?: boolean
  staffPhone?: string
}) {
  const supabase = await createAdminClient()
  
  // Generate secure password
  const password = generateSecurePassword()
  
  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  
  if (authError) throw authError
  
  // Create profile
  const { data: profile } = await supabase.from('profiles').insert({
    id: authUser.user.id,
    display_name: fullName,
    level: accessLevel + 3,  // Map to profiles.level (4, 5, 6)
    phone: staffPhone // Store staff phone number in profile
  }).select().single()
  
  // Create admin_staff record
  await supabase.from('admin_staff').insert({
    profile_id: authUser.user.id,
    email,
    full_name: fullName,
    role: 'staff',
    access_level: accessLevel,
    is_active: true
  })
  
  // Send credentials email if enabled
  if (sendCredentials && staffPhone) { // Only send if enabled and phone is provided
    await sendStaffCredentialsEmail(email, {
      fullName,
      email,
      password,
      loginUrl: 'https://ngumu.app/admin/login',
      phone: staffPhone, // Pass the phone number
      profile_id: profile.id // Pass the profile ID
    })
  }
  
  return { success: true, email, password }
}

function generateSecurePassword(): string {
  // Generate random 16-character password with uppercase, lowercase, numbers, symbols
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
```

#### **B. Staff List**

**UI Requirements:**
- Data table with columns:
  - Full Name
  - Email
  - Access Level badge (Level 1 / Level 2 / Level 3)
  - Status (Active / Blocked)
  - Created Date
  - Actions: Reset Password / Resend Credentials / Block/Unblock / Delete

**Reset Password:**
```typescript
export async function resetStaffPassword(staffId: string, email: string, staffPhone?: string) {
  const supabase = await createAdminClient()
  
  const newPassword = generateSecurePassword()
  
  // Update auth password
  await supabase.auth.admin.updateUserById(staffId, {
    password: newPassword
  })
  
  // Email new password
  // **REPLACE TWILIO SENDSMS WITH THIS FOR PASSWORD RESET EMAIL**
  async function sendPasswordResetEmail(email: string, data: any) {
    const { sendSMS } = await import('@/lib/utils/sms')
    
    const message = `
      Your NGUMU Admin Portal password has been reset.
      New Password: ${data.password}
      Login: ${data.loginUrl}
      Please change your password after logging in.
    `
    
    await sendSMS({
      phone: data.phone, // Assuming you can get the phone number associated with the staff
      message,
      messageType: 'confirmation',
      userId: data.userId
    })
  }

  await sendPasswordResetEmail(email, {
    password: newPassword,
    loginUrl: 'https://ngumu.app/admin/login',
    phone: staffPhone, // Pass the phone number
    userId: staffId
  })
  
  return { success: true }
}
```

### **Page: `/admin/app-management/providers`**

**Service Providers:**
- Service providers do NOT get login access
- They receive case details via EMAIL only
- Admin can:
  - Add service provider (name, email, specialty)
  - Assign cases to them (sends email with case info)
  - Delete service providers

**Form:**
- Full Name
- Email
- Specialty (dropdown: Legal, Counseling, Investigation, Medical, Other)
- Add button

**Email Template (when case assigned):**
```
Subject: New Case Assignment - CASE-25-000123

Dear [Provider Name],

You have been assigned a new case:

Case Number: CASE-25-000123
Category: Theft
Priority: High

User Information:
Name: John Doe
Phone: +264 81 234 5678

Case Description:
[Full description here...]

Please contact the user directly or respond to this email with updates.

Thank you,
NGUMU'S EYE Admin Team
```

---

## **7. PROFILE SETTINGS**

### **Page: `/admin/profile`**

**UI Requirements:**
- Display staff info:
  - Full Name
  - Email
  - Access Level
  - Profile picture (optional upload)
- Change Password form:
  - Current Password
  - New Password
  - Confirm New Password
  - Change Password button

**Server Action:**
```typescript
// lib/actions/admin-profile.ts

export async function changeAdminPassword({
  currentPassword,
  newPassword
}: {
  currentPassword: string
  newPassword: string
}) {
  const supabase = await createAdminClient()
  
  // Verify current password
  const { data: user } = await supabase.auth.getUser()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.user?.email!,
    password: currentPassword
  })
  
  if (signInError) {
    throw new Error('Current password is incorrect')
  }
  
  // Update to new password
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  if (error) throw error
  
  return { success: true }
}
```

---

## 🔐 AUTHENTICATION & ACCESS CONTROL

### **Middleware Protection**

```typescript
// middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // If accessing /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Must be logged in
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    
    // Must be admin staff
    const { data: staff } = await supabase
      .from('admin_staff')
      .select('access_level, is_active')
      .eq('profile_id', user.id)
      .single()
    
    if (!staff || !staff.is_active) {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
    }
    
    // Check access level for specific routes
    const path = request.nextUrl.pathname
    
    if (path.includes('/app-management') && staff.access_level < 3) {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
    }
    
    if ((path.includes('/cases') || path.includes('/subscriptions')) && staff.access_level < 2) {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
    }
  }
  
  return response
}

export const config = {
  matcher: ['/admin/:path*']
}
```

### **Access Control Helper**

```typescript
// lib/utils/access-control.ts

export async function requireAccessLevel(minLevel: 1 | 2 | 3) {
  const supabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data: staff } = await supabase
    .from('admin_staff')
    .select('access_level, is_active')
    .eq('profile_id', user.id)
    .single()
  
  if (!staff || !staff.is_active) {
    throw new Error('Not authorized')
  }
  
  if (staff.access_level < minLevel) {
    throw new Error(`Requires access level ${minLevel}`)
  }
  
  return staff
}
```

---

## 📧 EMAIL SERVICE INTEGRATION

### **Required Email Templates**

1. **Staff Credentials Email**
```typescript
interface StaffCredentialsEmailData {
  fullName: string
  email: string
  password: string
  loginUrl: string
  phone?: string // Added phone
  userId?: string // Added userId
}

async function sendStaffCredentialsEmail(email: string, data: StaffCredentialsEmailData) {
  // Use Resend, SendGrid, or similar
  // **REPLACED WITH SMS FUNCTION FOR CREDENTIALS/PASSWORD EMAILS**
  // See lib/actions/admin-staff.ts and lib/actions/admin-profile.ts for usage
  
  // Placeholder for actual email sending if needed
  console.log('Sending Staff Credentials Email to:', email, data);
}
```

2. **Case Assignment Email** (Service Providers)
```typescript
interface CaseAssignmentEmailData {
  providerName: string
  caseNumber: string
  userName: string
  userPhone: string
  caseDescription: string
  priority: string
}

async function sendCaseAssignmentEmail(email: string, data: CaseAssignmentEmailData) {
  // Use Resend, SendGrid, or similar
  await emailService.send({
    to: email,
    subject: `New Case Assignment - ${data.caseNumber}`,
    html: `
      <h1>New Case Assignment</h1>
      <p>Dear ${data.providerName},</p>
      <p>You have been assigned a new case:</p>
      <ul>
        <li><strong>Case Number:</strong> ${data.caseNumber}</li>
        <li><strong>Priority:</strong> ${data.priority}</li>
        <li><strong>User:</strong> ${data.userName}</li>
        <li><strong>Phone:</strong> ${data.userPhone}</li>
      </ul>
      <p><strong>Description:</strong></p>
      <p>${data.caseDescription}</p>
      <p>Please contact the user directly or respond to this email with updates.</p>
    `
  })
}
```

3. **Password Reset Email**
   *Note: This functionality is now handled via SMS.*
4. **Subscription Renewal Reminder SMS**

---

## 📱 SMS SERVICE INTEGRATION

Use **SMSPortal REST API** for all SMS functionality. The integration uses Supabase Edge Functions for secure API communication.

### **Required Environment Variables**
Add these to your Supabase project secrets:
```
SMSPORTAL_CLIENT_ID=your_client_id_here
SMSPORTAL_API_SECRET=your_api_secret_here
```

### **Database Table for SMS Logging**
```sql
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('otp', 'notification', 'reminder', 'confirmation')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  sms_portal_response JSONB,
  error_response JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admin can view all SMS logs"
  ON public.sms_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_staff
      WHERE profile_id = (SELECT auth.uid()) AND access_level >= 1 -- Assuming any admin can view logs
    )
  );
```

### **Edge Function Implementation**

**File: `supabase/functions/send-sms/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
  messageType: 'otp' | 'notification' | 'reminder' | 'confirmation';
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const smsPortalClientId = Deno.env.get('SMSPORTAL_CLIENT_ID')!;
    const smsPortalApiSecret = Deno.env.get('SMSPORTAL_API_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { phone, message, messageType, userId }: SMSRequest = await req.json();

    console.log(`Sending ${messageType} SMS to ${phone}`);

    // Format phone number for Namibia (+264)
    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+264' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+264' + formattedPhone;
    }

    // Log SMS attempt in database
    const { data: smsLog, error: logError } = await supabase
      .from('sms_logs')
      .insert({
        user_id: userId || null,
        phone: formattedPhone,
        message: message,
        message_type: messageType,
        status: 'queued',
      })
      .select()
      .single();

    if (logError) throw logError;

    // Prepare SMSPortal API request
    const smsPortalPayload = {
      messages: [{
        content: message,
        destination: formattedPhone,
      }],
    };

    // Create Basic Auth credentials
    const credentials = btoa(`${smsPortalClientId}:${smsPortalApiSecret}`);

    // Send SMS via SMSPortal REST API
    const smsResponse = await fetch('https://rest.smsportal.com/v1/bulkmessages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smsPortalPayload),
    });

    const smsResponseData = await smsResponse.json();
    console.log('SMSPortal response:', smsResponseData);

    // Update SMS log with response
    const updateData: any = {
      sms_portal_response: smsResponseData,
      sent_at: new Date().toISOString(),
      status: smsResponse.ok ? 'sent' : 'failed',
    };

    if (!smsResponse.ok) {
      updateData.error_response = smsResponseData;
    }

    await supabase
      .from('sms_logs')
      .update(updateData)
      .eq('id', smsLog.id);

    if (!smsResponse.ok) {
      throw new Error(`SMSPortal API error: ${JSON.stringify(smsResponseData)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        smsLogId: smsLog.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-sms function:', error);
    
    // Attempt to log the error if smsLog.id is available
    if (error.smsLogId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await supabase.from('sms_logs').update({
        status: 'failed',
        error_response: { message: error.message },
        sent_at: new Date().toISOString()
      }).eq('id', error.smsLogId);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### **Client-Side Utility**

**File: `lib/utils/sms.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export interface SMSOptions {
  phone: string;
  message: string;
  messageType: 'otp' | 'notification' | 'reminder' | 'confirmation';
  userId?: string;
}

export async function sendSMS(options: SMSOptions) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: options,
    });

    if (error) {
      console.error('Error invoking send-sms function:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw error;
  }
}
```

### **Usage Examples in Admin Portal**

#### **1. Voucher Code Generation (Subscription Management)**
```typescript
// lib/actions/admin-subscriptions.ts

// **REPLACE TWILIO SENDSMS WITH THIS**
async function sendSMS(phoneNumber: string, message: string) {
  const { sendSMS } = await import('@/lib/utils/sms')
  
  return await sendSMS({
    phone: phoneNumber,
    message,
    messageType: 'notification',
  })
}

export async function generateVoucherCode({
  packageType,
  durationDays,
  userMobile
}: {
  packageType: string
  durationDays: number
  userMobile?: string
}) {
  const supabase = await createAdminClient()
  
  // Get plan_id
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('package_type', packageType)
    .eq('period_days', durationDays)
    .single()
  
  if (!plan) throw new Error('Plan not found')
  
  // Generate unique code (format: IND-XXXX-XXXXXX)
  const prefix = packageType === 'individual' ? 'IND' : 
                 packageType === 'family' ? 'FAM' : 'TOU'
  const code = `${prefix}-${generateRandomString(4)}-${generateRandomString(6)}`
  
  // Insert voucher
  await supabase.from('vouchers').insert({
    code,
    plan_id: plan.id,
    days: durationDays,
    issued_to_email: userMobile ? `${userMobile}@generated.local` : null
  })
  
  // If user mobile provided, send SMS with code
  if (userMobile) {
    await sendSMS(userMobile, `Your NGUMU subscription code: ${code}. Valid for ${durationDays} days. Redeem at ngumu.app/subscribe`)
  }
  
  return { code, success: true }
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
```

#### **2. Subscription Expiry Reminder**
```typescript
// lib/actions/admin-subscriptions.ts

// **REPLACE TWILIO SENDSMS WITH THIS**
export async function sendRenewalReminder(userId: string, phone: string, daysLeft: number) {
  const message = daysLeft === 0 
    ? 'Your NGUMU subscription has expired. Renew now to continue accessing premium features. Visit ngumu.app/subscribe'
    : `Your NGUMU subscription expires in ${daysLeft} days. Renew now to avoid interruption. Visit ngumu.app/subscribe`
  
  const { sendSMS } = await import('@/lib/utils/sms')
  await sendSMS({
    phone,
    message,
    messageType: 'reminder',
    userId,
  })
  
  return { success: true }
}
```

#### **3. Case Assignment Notification**
```typescript
// lib/actions/admin-cases.ts

// **REPLACE TWILIO SENDSMS WITH THIS FOR CASE ASSIGNMENT**
async function assignCaseToInvestigator(
  caseId: string,
  investigatorId: string,
  userPhone: string
) {
  const supabase = await createAdminClient() // Ensure supabase client is available
  const { data: caseData } = await supabase
    .from('incident_files')
    .select('case_number, title')
    .eq('id', caseId)
    .single()
  
  if (userPhone) {
    const { sendSMS } = await import('@/lib/utils/sms')
    await sendSMS({
      phone: userPhone,
      message: `Your case ${caseData.case_number} (${caseData.title}) has been assigned to an investigator. You will be contacted soon.`,
      messageType: 'notification',
      // You might want to associate this notification with the user_id of the case
      // userId: await getCaseUserId(caseId) // Assuming a helper function exists
    })
  }
  
  return { success: true }
}
```

### **CRITICAL: SMSPortal Implementation Notes**

1. **Authentication Method**: Uses Basic Authentication (NOT Bearer tokens)
   - Format: `Authorization: Basic base64(clientId:apiSecret)`

2. **Phone Number Formatting**: Automatically handles Namibian numbers
   - Converts `0812345678` → `+264812345678`
   - Removes spaces and validates format

3. **API Endpoint**: `https://rest.smsportal.com/v1/bulkmessages`
   - Method: POST
   - Content-Type: application/json

4. **Payload Structure**:
   ```json
   {
     "messages": [
       {
         "content": "Your message here",
         "destination": "+264812345678"
       }
     ]
   }
   ```

5. **Database Logging**: All SMS attempts are logged to `sms_logs` table
   - Status tracking: queued → sent/failed
   - Response storage for debugging
   - Admin audit trail

6. **Error Handling**: Detailed error responses stored in database
   - Failed attempts logged with error_response
   - Retry logic can be implemented based on status

### **Testing SMS Integration**

1. **Test with curl**:
```bash
curl -X POST https://rest.smsportal.com/v1/bulkmessages \
  -H "Authorization: Basic $(echo -n 'CLIENT_ID:API_SECRET' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "content": "Test message from NGUMU Admin",
      "destination": "+264812345678"
    }]
  }'
```

2. **Check SMS logs in database**:
```sql
SELECT * FROM public.sms_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

3. **Monitor Edge Function logs** in Supabase dashboard

### **SMS Usage Scenarios in Admin Portal**

| Feature | Trigger | Message Type | Example Message |
|---------|---------|--------------|-----------------|
| Voucher Generation | Admin generates code for specific user | notification | "Your NGUMU subscription code: IND-1234-ABCDEF. Valid for 30 days." |
| Subscription Expiry | Automated job checks expiring subscriptions | reminder | "Your NGUMU subscription expires in 3 days. Renew at ngumu.app/subscribe" |
| Case Assignment | Admin assigns case to investigator | notification | "Your case CASE-25-000123 has been assigned. You will be contacted soon." |
| Account Warning | Admin sends warning to user | notification | "Your account has received a warning for posting inappropriate content." |
| Trust Score Change | Admin adjusts trust score significantly | notification | "Your trust score has been updated to 75. View details at ngumu.app/profile" |

---

## 🎨 UI/UX DESIGN REQUIREMENTS

### **Design System**

Use the same color system as the mobile app:

```css
/* globals.css */
@theme inline {
  /* Primary Colors */
  --color-primary: #6366f1;  /* Indigo */
  --color-primary-hover: #4f46e5;
  
  /* Secondary Colors */
  --color-secondary: #8b5cf6;  /* Purple */
  
  /* Accent Colors */
  --color-accent-yellow: #fbbf24;  /* Warning/Trust badges */
  --color-accent-red: #ef4444;  /* Danger/Delete */
  --color-accent-green: #10b981;  /* Success/Confirm */
  
  /* Neutrals */
  --color-background: #f8fafc;
  --color-foreground: #0f172a;
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;
  
  /* Status Colors */
  --color-status-new: #3b82f6;  /* Blue */
  --color-status-assigned: #8b5cf6;  /* Purple */
  --color-status-in-progress: #f59e0b;  /* Amber */
  --color-status-closed: #6b7280;  /* Gray */
  
  /* Priority Colors */
  --color-priority-low: #10b981;  /* Green */
  --color-priority-medium: #f59e0b;  /* Amber */
  --color-priority-high: #ef4444;  /* Red */
  --color-priority-urgent: #dc2626;  /* Dark Red */
  
  /* Border & Shadow */
  --radius: 0.5rem;
  --border: 1px solid #e2e8f0;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

### **Component Library**

Use shadcn/ui components:
- Button
- Card
- Table
- Dialog
- Select
- Input
- Badge
- Tabs
- Dropdown Menu
- Checkbox
- Radio Group
- Toast
- Avatar
- Separator

### **Layout Structure**

```
┌──────────────────────────────────────────────────┐
│  NGUMU Logo     [User Avatar ▼]  [Logout]       │
├────────┬─────────────────────────────────────────┤
│        │                                          │
│ Sidebar│          Main Content Area              │
│        │                                          │
│ - Dash │                                          │
│ - Users│                                          │
│ - Feed │                                          │
│ - Cases│                                          │
│ - Subs │                                          │
│ - Ads  │                                          │
│ - App  │                                          │
│ - Prof │                                          │
│        │                                          │
└────────┴──────────────────────────────────────────┘
```

**Sidebar Navigation:**
```typescript
const navigationItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, level: 1 },
  { label: 'Users', href: '/admin/users', icon: Users, level: 1 },
  { label: 'Feed Posts', href: '/admin/feed', icon: FileText, level: 1 },
  { label: 'Cases', href: '/admin/cases', icon: Briefcase, level: 2 },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, level: 2 },
  { label: 'Ads', href: '/admin/ads', icon: Image, level: 2 },
  { label: 'App Management', href: '/admin/app-management', icon: Settings, level: 3 },
  { label: 'Profile', href: '/admin/profile', icon: User, level: 1 }
]
```

---

## 🚀 IMPLEMENTATION CHECKLIST

### **Phase 1: Setup & Authentication**
- [ ] Create admin route structure (`/admin/*`)
- [ ] Setup Supabase admin client
- [ ] Create `admin_staff` table with RLS
- [ ] Implement login page
- [ ] Setup middleware for route protection
- [ ] Create admin layout with sidebar

### **Phase 2: User Management**
- [ ] Build user list page with search/filters
- [ ] Implement user detail view
- [ ] Add ban/unban functionality
- [ ] Add trust score adjustment

### **Phase 3: Feed Post Management**
- [ ] Build feed post list
- [ ] Create process post dialog
- [ ] Implement delete actions (3 types)
- [ ] Add confirm incident flow
- [ ] Implement send message feature
- [ ] Add severity selector for map

### **Phase 4: Case Management**
- [ ] Build case list with filters
- [ ] Create case detail popup
- [ ] Implement case assignment
- [ ] Add email notification for service providers
- [ ] Build case timeline display
- [ ] Add close case functionality
- [ ] Implement PDF export
- [ ] Add email case functionality

### **Phase 5: Subscription Management**
- [ ] Build voucher generator
- [ ] Create subscription list
- [ ] Implement status management
- [ ] Add renewal reminder SMS

### **Phase 6: Ad Management**
- [ ] Create `ad_inventory` table
- [ ] Build ad upload page
- [ ] Implement Vercel Blob integration
- [ ] Create ad list/grid view
- [ ] Add mobile app feed integration
- [ ] Implement ad click tracking

### **Phase 7: App Management**
- [ ] Build staff management page
- [ ] Implement add staff flow
- [ ] Add password reset
- [ ] Create service provider management
- [ ] Implement email templates

### **Phase 8: Profile & Settings**
- [ ] Build profile page
- [ ] Implement password change
- [ ] Add profile picture upload

### **Phase 9: Testing & Deployment**
- [ ] Test all access levels
- [ ] Test RLS policies
- [ ] Verify email/SMS integrations
- [ ] Load test with real data
- [ ] Deploy to Vercel

---

## ⚠️ CRITICAL REQUIREMENTS

1. **DO NOT recreate existing tables** - Query the existing database schema
2. **Respect RLS policies** - Always use server-side Supabase client for admin operations
3. **Use Server Actions** - No client-side mutations, all database writes through server actions
4. **Access Level Enforcement** - Always check admin staff access level before operations
5. **Email Integration** - Must implement for service provider notifications
6. **SMS Integration** - Must implement for subscription reminders and voucher codes
7. **Vercel Blob Integration** - Must use for ad uploads and case evidence
8. **Audit Logging** - Log all admin actions to `incident_events` and `audit_logs` tables
9. **Mobile App Sync** - Ensure changes (ads, deleted posts, trust scores) reflect immediately in mobile app
10. **Security** - Never expose admin credentials in client-side code

---

## 📚 DATA CONTRACTS

### **API Response Format**
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

### **User Data Shape**
```typescript
interface AdminUser {
  id: string
  display_name: string | null
  phone: string | null
  trust_score: number
  level: number
  is_banned: boolean
  subscription_status: 'subscribed' | 'not_subscribed' | 'expired'
  subscription_plan?: string
  days_left?: number
  created_at: string
}
```

### **Feed Post Data Shape**
```typescript
interface AdminFeedPost {
  id: string
  title: string
  description: string
  status: 'new' | 'verifying' | 'assigned' | 'resolved' | 'archived'
  verification_level: number
  created_at: string
  user: {
    id: string
    display_name: string
    trust_score: number
    subscription_status: string
  }
  category: {
    label: string
    code: string
  }
  media: Array<{
    path: string
    mime: string
  }>
  reaction_count: number
  comment_count: number
}
```

### **Case Data Shape**
```typescript
interface AdminCase {
  id: string
  case_number: string
  category: 'theft' | 'gbv' | 'harassment' | 'missing_person' | 'fraud' | 'domestic' | 'stolen_device' | 'other'
  title: string
  description: string
  status: 'new' | 'assigned' | 'in_progress' | 'closed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  user: {
    id: string
    display_name: string
    phone: string
    subscription_plan: string
    subscription_status: string
    days_left: number
    trust_score: number
  }
  investigator?: {
    id: string
    name: string
    role: 'staff' | 'service_provider'
  }
  timeline: Array<{
    update_text: string
    created_at: string
    officer_name: string
  }>
  evidence: Array<{
    file_type: 'image' | 'video' | 'audio' | 'document'
    file_url: string
    file_name: string
    created_at: string
  }>
  created_at: string
  closed_at?: string
}
```

---

## 🎯 SUCCESS CRITERIA

Your admin portal is complete when:

1. ✅ All 7 feature sections are fully functional
2. ✅ Access level enforcement works correctly (Level 1/2/3)
3. ✅ Feed post moderation updates trust scores correctly
4. ✅ Confirmed incidents increase user trust score by +5
5. ✅ Deleted posts with trust penalty decrease score correctly
6. ✅ Case assignments trigger email notifications to service providers
7. ✅ Voucher generation creates valid codes that work in mobile app
8. ✅ Generated subscription codes can be redeemed in mobile app
9. ✅ Ads appear randomly in mobile app feed
10. ✅ Staff can login and access only their permitted sections
11. ✅ Service providers receive case details via email (no login)
12. ✅ SMS reminders send correctly for expired subscriptions
13. ✅ Case PDF export works
14. ✅ All admin actions are logged
15. ✅ RLS policies prevent unauthorized access
16. ✅ Mobile app reflects admin changes immediately (deleted posts, trust scores, ads)

---

## 📞 SUPPORT & QUESTIONS

If you encounter issues:
1. Check existing database schema first
2. Verify RLS policies are correctly configured
3. Ensure middleware is protecting routes
4. Test with different access levels
5. Verify email/SMS integrations are configured

---

**END OF MASTER PROMPT**

You now have everything needed to build the NGUMU Admin Portal. Begin with Phase 1 (Setup & Authentication) and work through each phase systematically. Good luck!
