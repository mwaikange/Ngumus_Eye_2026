import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Fetch statistics
  const { count: totalIncidents } = await supabase.from("incidents").select("*", { count: "exact", head: true })

  const { count: openIncidents } = await supabase
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .in("status", ["new", "verifying", "assigned"])

  const { count: resolvedIncidents } = await supabase
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .eq("status", "resolved")

  const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true })

  const stats = [
    {
      title: "Total Incidents",
      value: totalIncidents || 0,
      icon: TrendingUp,
      description: "All time",
      color: "text-blue-600",
    },
    {
      title: "Open Cases",
      value: openIncidents || 0,
      icon: Clock,
      description: "Requires attention",
      color: "text-yellow-600",
    },
    {
      title: "Resolved",
      value: resolvedIncidents || 0,
      icon: CheckCircle,
      description: "Successfully closed",
      color: "text-green-600",
    },
    {
      title: "Total Users",
      value: totalUsers || 0,
      icon: AlertCircle,
      description: "Registered members",
      color: "text-purple-600",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of platform activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest incidents reported</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Activity feed coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Platform status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage</span>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Authentication</span>
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
