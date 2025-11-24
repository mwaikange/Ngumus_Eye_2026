import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { Users, MapPin, Shield, Plus, Globe } from "lucide-react"
import Link from "next/link"

export default async function GroupsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, geohash_prefix, visibility, created_by, member_count, created_at")
    .order("created_at", { ascending: false })

  const creatorIds = [...new Set(groups?.map((g) => g.created_by) || [])]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", creatorIds.length > 0 ? creatorIds : ["00000000-0000-0000-0000-000000000000"])

  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user?.id || "")

  const membershipMap = new Map(memberships?.map((m) => [m.group_id, m.role]) || [])

  const { data: requests } = await supabase
    .from("group_requests")
    .select("group_id, status")
    .eq("user_id", user?.id || "")
    .eq("status", "pending")

  const requestSet = new Set(requests?.map((r) => r.group_id) || [])

  const groupsWithData = (groups || []).map((group) => ({
    ...group,
    creatorName: profileMap.get(group.created_by) || "Unknown",
    memberCount: group.member_count || 0,
    userRole: membershipMap.get(group.id),
    isCreator: group.created_by === user?.id,
    hasPendingRequest: requestSet.has(group.id),
  }))

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Community Groups" />

      <div className="container max-w-4xl px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Communities</h2>
            <p className="text-muted-foreground">Join local groups for better coordination</p>
          </div>
          <Button asChild>
            <Link href="/groups/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {groupsWithData.length > 0 ? (
            groupsWithData.map((group: any) => (
              <Card key={group.id} className="hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">{group.name}</CardTitle>
                      <CardDescription className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Area: {group.geohash_prefix}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          {group.visibility === "public" ? (
                            <>
                              <Globe className="h-3 w-3" />
                              Public
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3" />
                              Private
                            </>
                          )}
                        </span>
                      </CardDescription>
                    </div>
                    {group.isCreator ? (
                      <Badge className="bg-purple-500/10 text-purple-700">Creator</Badge>
                    ) : group.userRole ? (
                      <Badge className="bg-muted text-muted-foreground">Member</Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {group.userRole || group.isCreator ? (
                      <Button asChild variant="default" className="flex-1">
                        <Link href={`/groups/${group.id}`}>Open Group</Link>
                      </Button>
                    ) : group.hasPendingRequest ? (
                      <Button disabled variant="outline" className="flex-1 bg-transparent">
                        Request Pending
                      </Button>
                    ) : (
                      <Button asChild variant="default" className="flex-1">
                        <Link href={`/groups/${group.id}`}>
                          {group.visibility === "public" ? "Join Group" : "Request to Join"}
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="pt-6 text-center space-y-2">
                <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No groups available yet</p>
                <Button asChild>
                  <Link href="/groups/create">Create the First Group</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
