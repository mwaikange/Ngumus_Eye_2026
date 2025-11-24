export type IncidentStatus = "new" | "verifying" | "assigned" | "resolved" | "archived"
export type VerificationLevel = 0 | 1 | 2 | 3
export type UserLevel = 0 | 1 | 2 | 3 | 4 | 5
export type GroupRole = "member" | "moderator" | "responder" | "owner"
export type IncidentEventKind = "note" | "status_change" | "verification" | "assignment" | "close" | "merge"
export type ReactionKind = "seen" | "helpful" | "not_helpful" | "follow"

export interface Profile {
  id: string
  display_name: string | null
  phone: string | null
  trust_score: number
  level: UserLevel
  home_geohash: string | null
  work_geohash: string | null
  is_banned: boolean
  created_at: string
  updated_at: string
}

export interface IncidentType {
  id: number
  code: string
  label: string
  severity: number
}

export interface Incident {
  id: string
  type_id: number
  title: string
  description: string | null
  lat: number
  lng: number
  geohash: string
  area_radius_m: number
  status: IncidentStatus
  verification_level: VerificationLevel
  created_by: string
  created_at: string
  updated_at: string
}

export interface IncidentWithType extends Incident {
  incident_types: IncidentType
  profiles: Pick<Profile, "id" | "display_name" | "trust_score">
}

export interface IncidentMedia {
  id: string
  incident_id: string
  path: string
  sha256: string | null
  mime: string | null
  created_at: string
}

export interface IncidentEvent {
  id: string
  incident_id: string
  actor: string | null
  kind: IncidentEventKind
  data: Record<string, unknown> | null
  created_at: string
}

export interface Comment {
  id: string
  incident_id: string
  author: string
  body: string
  created_at: string
}

export interface Group {
  id: string
  name: string
  geohash_prefix: string
  visibility: "public" | "private"
  created_by: string
  created_at: string
}

export interface Plan {
  id: number
  code: string
  label: string
  period_days: number
  price_cents: number
}

export interface UserSubscription {
  user_id: string
  plan_id: number
  started_at: string
  expires_at: string
}

export interface CreateIncidentInput {
  type_id: number
  title: string
  description?: string
  lat: number
  lng: number
  geohash: string
  area_radius_m?: number
}
