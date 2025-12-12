"use client"

import { AppHeader } from "@/components/app-header"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, Layers } from "lucide-react"
import Link from "next/link"

interface IncidentMarker {
  id: string
  title: string
  lat: number
  lng: number
  type_label: string
  severity: number
  verification_level: number
  town?: string // Added town field
}

export default function MapPage() {
  const [incidents, setIncidents] = useState<IncidentMarker[]>([])
  const [selectedIncident, setSelectedIncident] = useState<IncidentMarker | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const fetchIncidents = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("incidents")
        .select(`
          id,
          title,
          lat,
          lng,
          town,
          verification_level,
          incident_types(label, severity)
        `)
        .gte("verification_level", 1)
        .order("created_at", { ascending: false })
        .limit(50)

      if (data) {
        setIncidents(
          data.map((item: any) => ({
            id: item.id,
            title: item.title,
            lat: item.lat,
            lng: item.lng,
            town: item.town, // Added town to mapped data
            type_label: item.incident_types.label,
            severity: item.incident_types.severity,
            verification_level: item.verification_level,
          })),
        )
      }
    }

    fetchIncidents()

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }, [])

  const severityColors = {
    1: "bg-blue-500",
    2: "bg-yellow-500",
    3: "bg-orange-500",
    4: "bg-red-500",
    5: "bg-destructive",
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Incident Map" />

      <div className="relative h-[calc(100vh-3.5rem)]">
        {/* Map placeholder with incident markers */}
        <div className="absolute inset-0 bg-muted/30">
          <div className="relative w-full h-full overflow-hidden">
            {/* Grid background to simulate map */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, oklch(0.90 0.005 250) 1px, transparent 1px),
                  linear-gradient(to bottom, oklch(0.90 0.005 250) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            />

            {/* User location marker */}
            {userLocation && (
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                  left: "50%",
                  top: "50%",
                }}
              >
                <div className="relative">
                  <div className="h-4 w-4 rounded-full bg-primary border-2 border-background shadow-lg" />
                  <div className="absolute inset-0 h-4 w-4 rounded-full bg-primary animate-ping opacity-75" />
                </div>
              </div>
            )}

            {/* Incident markers */}
            {incidents.map((incident, index) => {
              const angle = (index / incidents.length) * 2 * Math.PI
              const radius = 150 + (index % 3) * 80
              const x = 50 + Math.cos(angle) * (radius / 10)
              const y = 50 + Math.sin(angle) * (radius / 10)

              return (
                <button
                  key={incident.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 transition-transform hover:scale-110"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                  onClick={() => setSelectedIncident(incident)}
                >
                  <div className="relative">
                    <MapPin
                      className={`h-8 w-8 ${severityColors[incident.severity as keyof typeof severityColors]} text-white drop-shadow-lg`}
                      fill="currentColor"
                    />
                    {incident.verification_level > 0 && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          <Button size="icon" variant="secondary" className="shadow-lg">
            <Layers className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="shadow-lg">
            <Navigation className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected incident card */}
        {selectedIncident && (
          <div className="absolute bottom-4 left-4 right-4 z-30 md:left-auto md:w-96">
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <Badge className="mb-1">{selectedIncident.type_label}</Badge>
                      <h3 className="font-semibold leading-tight">{selectedIncident.title}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => setSelectedIncident(null)}
                    >
                      ×
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}
                    </span>
                  </div>
                  {selectedIncident.town && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Town:</span> {selectedIncident.town}
                    </div>
                  )}
                  <Button asChild className="w-full">
                    <Link href={`/incident/${selectedIncident.id}`}>View Details</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 left-4 z-30">
          <Card className="shadow-lg">
            <CardContent className="p-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Severity</p>
                <div className="space-y-1">
                  {[
                    { level: 5, label: "Critical" },
                    { level: 4, label: "High" },
                    { level: 3, label: "Medium" },
                    { level: 2, label: "Low" },
                  ].map((item) => (
                    <div key={item.level} className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${severityColors[item.level as keyof typeof severityColors]}`}
                      />
                      <span className="text-xs">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info banner */}
        {incidents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <Card className="max-w-md mx-4">
              <CardContent className="pt-6 text-center space-y-2">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No verified incidents to display</p>
                <p className="text-sm text-muted-foreground">Incidents will appear here once they are verified</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
