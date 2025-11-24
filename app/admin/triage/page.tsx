import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

const statusColumns = [
  { status: "new", label: "New", color: "bg-blue-500/10 text-blue-700" },
  { status: "verifying", label: "Verifying", color: "bg-yellow-500/10 text-yellow-700" },
  { status: "assigned", label: "Assigned", color: "bg-purple-500/10 text-purple-700" },
  { status: "resolved", label: "Resolved", color: "bg-green-500/10 text-green-700" },
]

export default async function TriagePage() {
  const supabase = await createClient()

  const incidentsByStatus = await Promise.all(
    statusColumns.map(async (column) => {
      const { data } = await supabase
        .from("incidents")
        .select(`
          *,
          incident_types(label),
          profiles(display_name)
        `)
        .eq("status", column.status)
        .order("created_at", { ascending: false })
        .limit(10)

      return {
        ...column,
        incidents: data || [],
      }
    }),
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Incident Triage</h1>
        <p className="text-muted-foreground">Manage and prioritize incidents</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {incidentsByStatus.map((column) => (
          <div key={column.status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{column.label}</h3>
              <Badge variant="secondary">{column.incidents.length}</Badge>
            </div>

            <div className="space-y-2">
              {column.incidents.length > 0 ? (
                column.incidents.map((incident: any) => (
                  <Card key={incident.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <Badge className={column.color} variant="outline">
                          {incident.incident_types.label}
                        </Badge>
                        <h4 className="text-sm font-medium leading-tight line-clamp-2">{incident.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                        </p>
                        <Button asChild size="sm" variant="outline" className="w-full bg-transparent">
                          <Link href={`/incident/${incident.id}`}>View</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">No incidents</CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
