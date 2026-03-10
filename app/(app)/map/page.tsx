"use client"

import { AppHeader } from "@/components/app-header"
import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, X, Clock } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface MapIncident {
  id: string
  title: string
  lat: number
  lng: number
  town: string | null
  severity: string | null
  area_radius_m: number | null
  created_at: string
  verified_expiry: string | null
  expires_at: string | null
  upvotes: number
  verification_level: number
  type_label: string | null
  type_severity: number | null
}

// Severity colour by type_severity value
function pinColor(typeSeverity: number | null): string {
  if (typeSeverity === null) return "#6b7280"
  if (typeSeverity >= 5) return "#EF4444"
  if (typeSeverity === 4) return "#F97316"
  if (typeSeverity === 3) return "#EAB308"
  return "#22c55e"
}

function severityLabel(typeSeverity: number | null): string {
  if (typeSeverity === null) return "Unknown"
  if (typeSeverity >= 5) return "Critical"
  if (typeSeverity === 4) return "High"
  if (typeSeverity === 3) return "Medium"
  return "Low"
}

// Project lat/lng to percentage positions within Namibia's bounding box
// Namibia approx: lat -29.0 to -16.9, lng 11.7 to 25.3
const LAT_MIN = -29.0
const LAT_MAX = -16.9
const LNG_MIN = 11.7
const LNG_MAX = 25.3
const PAD = 3 // % padding from edges

function project(lat: number, lng: number): { x: number; y: number } {
  const x = PAD + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (100 - PAD * 2)
  const y = PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (100 - PAD * 2)
  return { x: Math.max(PAD, Math.min(100 - PAD, x)), y: Math.max(PAD, Math.min(100 - PAD, y)) }
}

export default function MapPage() {
  const [incidents, setIncidents] = useState<MapIncident[]>([])
  const [selected, setSelected] = useState<MapIncident | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/map-incidents")
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data: MapIncident[] = await res.json()
      setIncidents(data)
    } catch (err: any) {
      setError(err.message ?? "Failed to load incidents")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
      )
    }
  }, [fetchIncidents])

  // Separate incidents with valid coordinates from those without
  const plottable = incidents.filter(
    (i) => i.lat !== null && i.lng !== null && i.lat >= LAT_MIN && i.lat <= LAT_MAX + 2 && i.lng >= LNG_MIN - 2 && i.lng <= LNG_MAX + 2,
  )

  const legendItems = [
    { label: "Critical", color: "#EF4444" },
    { label: "High", color: "#F97316" },
    { label: "Medium", color: "#EAB308" },
    { label: "Low", color: "#22c55e" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Incident Map" />

      <div className="relative h-[calc(100vh-3.5rem)]">

        {/* Map canvas */}
        <div className="absolute inset-0 bg-[#dce9f5]">
          <div className="relative w-full h-full overflow-hidden">

            {/* Grid background */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(150,180,220,0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(150,180,220,0.3) 1px, transparent 1px)
                `,
                backgroundSize: "5% 5%",
              }}
            />

            {/* Country outline label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
              <span className="text-[#b0c8e8] text-6xl font-bold opacity-20 tracking-widest">NAMIBIA</span>
            </div>

            {/* User location */}
            {userLocation && (() => {
              const pos = project(userLocation.lat, userLocation.lng)
              return (
                <div
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div className="relative">
                    <div className="h-4 w-4 rounded-full bg-primary border-2 border-white shadow-lg" />
                    <div className="absolute inset-0 h-4 w-4 rounded-full bg-primary animate-ping opacity-60" />
                  </div>
                </div>
              )
            })()}

            {/* Incident pins */}
            {plottable.map((incident) => {
              const pos = project(incident.lat, incident.lng)
              const color = pinColor(incident.type_severity)
              const isSelected = selected?.id === incident.id
              return (
                <button
                  key={incident.id}
                  className="absolute z-20 -translate-x-1/2 -translate-y-full transition-transform hover:scale-125 focus:outline-none"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => setSelected(isSelected ? null : incident)}
                  title={incident.title}
                >
                  <div className="relative">
                    {/* Pin body */}
                    <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
                      <path
                        d="M14 0C6.268 0 0 6.268 0 14c0 9.334 14 22 14 22S28 23.334 28 14C28 6.268 21.732 0 14 0z"
                        fill={color}
                        stroke="white"
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      <circle cx="14" cy="14" r="5" fill="white" fillOpacity="0.9" />
                    </svg>
                    {/* Verified dot */}
                    {incident.verification_level > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                </button>
              )
            })}

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-40">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading incidents...</span>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center z-40">
                <Card className="max-w-sm mx-4">
                  <CardContent className="pt-6 text-center space-y-3">
                    <MapPin className="h-10 w-10 mx-auto text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                    <Button size="sm" onClick={fetchIncidents}>Retry</Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && plottable.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <Card className="max-w-sm mx-4">
                  <CardContent className="pt-6 text-center space-y-2">
                    <MapPin className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="font-medium">No verified incidents</p>
                    <p className="text-sm text-muted-foreground">Incidents appear here once admin-verified with valid GPS coordinates.</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="shadow-md"
            title="Centre on my location"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                  () => {},
                )
              }
            }}
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>

        {/* Pin count badge */}
        {!loading && plottable.length > 0 && (
          <div className="absolute top-4 right-16 z-30">
            <Badge variant="secondary" className="shadow-md text-xs">
              {plottable.length} incident{plottable.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}

        {/* Selected incident popup */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 z-30 md:left-auto md:right-4 md:w-96">
            <Card className="shadow-xl border-2" style={{ borderColor: pinColor(selected.type_severity) }}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selected.type_label && (
                        <Badge style={{ backgroundColor: pinColor(selected.type_severity), color: "#fff" }}>
                          {selected.type_label}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {severityLabel(selected.type_severity)}
                      </Badge>
                    </div>
                    <h3 className="font-semibold leading-tight">{selected.title}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 -mr-1 -mt-1 h-7 w-7"
                    onClick={() => setSelected(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  {selected.town && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {selected.town}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                  </span>
                </div>

                {selected.verified_expiry && (
                  <p className="text-xs text-muted-foreground">
                    Expires from map:{" "}
                    {formatDistanceToNow(new Date(selected.verified_expiry), { addSuffix: true })}
                  </p>
                )}

                <Button asChild className="w-full" size="sm">
                  <Link href={`/incident/${selected.id}`}>View Details</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 left-4 z-30">
          <Card className="shadow-md">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Severity</p>
              <div className="space-y-1.5">
                {legendItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs">{item.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 border-t mt-1">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Verified</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
