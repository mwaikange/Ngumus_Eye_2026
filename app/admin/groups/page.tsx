import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { Users, MapPin, Shield } from "lucide-react"

export default async function AdminGroupsPage() {
  const supabase = await createClient()

  const { data: groups } = await supabase
    .from("groups")
    .select(`
      *,
      profiles!groups_created_by_fkey(display_name)
    `)
    .order("created_at", { ascending: false })

  // Get member counts for each group
  const groupsWithCounts = await Promise.all(
    (groups || []).map(async (group) => {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id)

      const { count: moderatorCount } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id)
        .in("role", ["moderator", "owner"])

      return {
        ...group,
        memberCount: count || 0,
        moderatorCount: moderatorCount || 0,
      }
    }),
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Group Management</h1>
        <p className="text-muted-foreground">Manage community groups and moderators</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groupsWithCounts.length > 0 ? (
          groupsWithCounts.map((group: any) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {group.name}
                    {group.visibility === "private" && <Shield className="h-4 w-4 text-muted-foreground" />}
                  </CardTitle>
                  <Badge variant="outline">{group.visibility}</Badge>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {group.geohash_prefix}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">{group.memberCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Moderators</span>
                    <span className="font-medium">{group.moderatorCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created by</span>
                    <span className="font-medium">{group.profiles?.display_name || "Unknown"}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Manage Group
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6 text-center space-y-2">
              <Users className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No groups created yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
