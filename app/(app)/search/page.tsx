import { AppHeader } from "@/components/app-header"
import { IncidentCard } from "@/components/incident-card"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

async function searchContent(query: string, filter: string) {
  const supabase = await createClient()

  const results = {
    incidents: [] as any[],
    users: [] as any[],
  }

  if (!query || query.length < 2) return results

  // Search incidents
  if (filter === "all" || filter === "incidents") {
    const { data: incidents } = await supabase
      .from("incidents")
      .select(`
        id,
        title,
        description,
        type_id,
        created_at,
        created_by,
        area_radius_m,
        verification_level,
        incident_types(label, severity),
        incident_media(path),
        profiles!incidents_created_by_fkey(id, display_name, avatar_url)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20)

    results.incidents = incidents || []
  }

  // Search users
  if (filter === "all" || filter === "users") {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, display_name, full_name, avatar_url, trust_score")
      .or(`display_name.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(20)

    results.users = users || []
  }

  return results
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>
}) {
  const params = await searchParams
  const query = params.q || ""
  const filter = params.filter || "all"

  const { incidents, users } = await searchContent(query, filter)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Search Results" backHref="/feed" />

      <div className="container max-w-4xl px-4 py-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Search: "{query}"</h2>
          <p className="text-muted-foreground">{incidents.length + users.length} results found</p>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {incidents.length === 0 && users.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No results found</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {incidents.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Incidents</h3>
                    {incidents.map((incident) => (
                      <IncidentCard key={incident.id} incident={incident} />
                    ))}
                  </div>
                )}
                {users.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Users</h3>
                    {users.map((user) => (
                      <Card key={user.id}>
                        <CardContent className="py-4">
                          <a href={`/user-posts/${user.id}`} className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                              {user.display_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-semibold">{user.display_name || user.full_name}</p>
                              <p className="text-sm text-muted-foreground">Trust Score: {user.trust_score}</p>
                            </div>
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            {incidents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No incidents found</p>
                </CardContent>
              </Card>
            ) : (
              incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {users.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No users found</p>
                </CardContent>
              </Card>
            ) : (
              users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="py-4">
                    <a href={`/user-posts/${user.id}`} className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        {user.display_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold">{user.display_name || user.full_name}</p>
                        <p className="text-sm text-muted-foreground">Trust Score: {user.trust_score}</p>
                      </div>
                    </a>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
