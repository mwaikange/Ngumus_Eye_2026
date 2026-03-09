# Page: /case-deck/devices

**Version:** 1.0.0 | **Last Updated:** 28 February 2026 | **Base URL:** https://app.ngumus-eye.site
**File:** `app/(app)/case-deck/devices/page.tsx` | **Layout:** AppShell | **Auth Required:** Yes | **Subscription Required:** Yes

---

## 1) Purpose
- Register and track stolen or lost devices (phones, laptops, tablets).
- Associates IMEI/serial numbers with user account for tracking purposes.

---

## 2) Who Can Access It
- **Auth required:** Yes.
- **Subscription required:** Yes.

---

## 3) Data Used
| Type | Detail |
|------|--------|
| Server Action | `getUserDevices()` — `lib/actions/devices.ts` |
| Server Action | `registerDevice(formData)` — `lib/actions/devices.ts` |
| Server Action | `deleteDevice(id)` — `lib/actions/devices.ts` |
| Tables read/written | `tracked_devices` (filtered by `user_id`) |
| Realtime | None |
| Storage | None |

---

## 4) UI Sections
| Section | Description |
|---------|-------------|
| AppHeader | Back + "Device Tracking" |
| Register Device form | Device type, brand, model, IMEI/serial, description |
| Registered devices list | Cards showing each registered device with status |
| Empty state | "No devices registered yet" |

---

## 5) Actions

### Action: Register Device
- **Location:** "Register Device" form / button
- **Trigger:** Submit
- **Preconditions:** Authenticated + subscribed; IMEI/serial non-empty
- **Client-side validation:** Required fields check
- **Request:** `registerDevice({ device_type, brand, model, imei, serial_number, description })` — `lib/actions/devices.ts`
- **Database changes:** Insert into `tracked_devices { user_id, device_type, brand, model, imei, serial_number, description, status: "stolen", created_at }`
- **Success state:** Device appears in list; toast "Device registered"
- **Failure states:** Duplicate IMEI → DB error shown; server error → toast

### Action: Delete Device
- **Location:** Device card — delete/remove button
- **Trigger:** Click → confirm
- **Preconditions:** Device owner
- **Request:** `deleteDevice(id)` — `lib/actions/devices.ts`
- **Database changes:** `tracked_devices` row deleted
- **Success state:** Device removed from list

---

## 6) State Machine
| State | Condition |
|-------|-----------|
| Loading | Data fetch |
| Empty | No devices registered |
| Populated | Devices listed |
| Submitting | Registration in flight |

---

## 7) Audit & Logging
- Device registrations stored in `tracked_devices` with `user_id` + `created_at`.

---

## 8) Test Checklist (UAT)
- Given subscriber → When registering device with IMEI → Then device appears in list
- Given missing IMEI → Then validation error shown
- Given device delete clicked → Then device removed
- Given non-subscriber → Then redirect to `/subscribe`
