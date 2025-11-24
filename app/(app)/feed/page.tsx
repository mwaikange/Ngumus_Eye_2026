import { AppHeader } from "@/components/app-header"
import { IncidentCard } from "@/components/incident-card"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: incidentsData, error: incidentsError } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20)

  console.log("[v0] Feed incidents query:", {
    count: incidentsData?.length,
    error: incidentsError,
    firstIncident: incidentsData?.[0],
  })

  let incidents = null
  if (incidentsData && incidentsData.length > 0) {
    // Get all unique type IDs and user IDs
    const typeIds = [...new Set(incidentsData.map((i) => i.type_id).filter(Boolean))]
    const userIds = [...new Set(incidentsData.map((i) => i.created_by).filter(Boolean))]

    // Fetch types and profiles in parallel
    const [{ data: types }, { data: profiles }] = await Promise.all([
      supabase.from("incident_types").select("*").in("id", typeIds),
      supabase.from("profiles").select("id, display_name, trust_score").in("id", userIds),
    ])

    // Map types and profiles to a lookup
    const typesMap = new Map(types?.map((t) => [t.id, t]) || [])
    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    // Combine data
    incidents = incidentsData.map((incident) => ({
      ...incident,
      incident_types: typesMap.get(incident.type_id) || null,
      profiles: profilesMap.get(incident.created_by) || null,
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Community Feed" showSearch />

      <div className="container max-w-2xl px-4 py-4 space-y-4">
        {/* Filters */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="nearby">Nearby</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Incidents list */}
        <div className="space-y-3">
          {incidents && incidents.length > 0 ? (
            incidents.map((incident) => <IncidentCard key={incident.id} incident={incident as any} />)
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No incidents reported yet</p>
              <Button className="mt-4" asChild>
                <a href="/report">Report an Incident</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
