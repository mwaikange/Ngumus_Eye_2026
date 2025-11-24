import { AppHeader } from "@/components/app-header"
import { IncidentCard } from "@/components/incident-card"
import { AdCard } from "@/components/ad-card"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getActiveAds } from "@/lib/actions/ads"

export default async function FeedPage() {
  const supabase = await createClient()

  const [incidentsResult, ads] = await Promise.all([
    supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(20),
    getActiveAds(),
  ])

  const { data: incidentsData, error: incidentsError } = incidentsResult

  console.log("[v0] Feed incidents query:", {
    count: incidentsData?.length,
    error: incidentsError,
    firstIncident: incidentsData?.[0],
    adsCount: ads?.length,
  })

  let incidents = null
  if (incidentsData && incidentsData.length > 0) {
    const typeIds = [...new Set(incidentsData.map((i) => i.type_id).filter(Boolean))]
    const userIds = [...new Set(incidentsData.map((i) => i.created_by).filter(Boolean))]

    const [{ data: types }, { data: profiles }] = await Promise.all([
      supabase.from("incident_types").select("*").in("id", typeIds),
      supabase.from("profiles").select("id, display_name, trust_score").in("id", userIds),
    ])

    const typesMap = new Map(types?.map((t) => [t.id, t]) || [])
    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    incidents = incidentsData.map((incident) => ({
      ...incident,
      incident_types: typesMap.get(incident.type_id) || null,
      profiles: profilesMap.get(incident.created_by) || null,
    }))
  }

  const feedItems: Array<{ type: "incident" | "ad"; data: any; key: string }> = []
  if (incidents && incidents.length > 0) {
    incidents.forEach((incident, index) => {
      feedItems.push({ type: "incident", data: incident, key: `incident-${incident.id}` })

      if ((index + 1) % 3 === 0 && ads && ads.length > 0) {
        const adIndex = Math.floor(index / 3) % ads.length
        feedItems.push({ type: "ad", data: ads[adIndex], key: `ad-${ads[adIndex].id}-${index}` })
      }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Community Feed" showSearch />

      <div className="container max-w-2xl px-4 py-4 space-y-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="nearby">Nearby</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {feedItems.length > 0 ? (
            feedItems.map((item) =>
              item.type === "incident" ? (
                <IncidentCard key={item.key} incident={item.data as any} />
              ) : (
                <AdCard key={item.key} ad={item.data} />
              ),
            )
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
