import { GroupChat } from "@/components/group-chat"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { Users, MapPin, Shield, ChevronLeft, Globe, Settings } from "lucide-react"
import Link from "next/link"
import { joinGroup, leaveGroup, requestMembership } from "@/lib/actions/groups"
import { redirect } from "next/navigation"
import { ActionButton } from "@/components/action-button-with-loading"
import { ManageRequestsDialog } from "@/components/manage-requests-dialog"

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, geohash_prefix, visibility, created_by, member_count, created_at")
    .eq("id", id)
    .maybeSingle()

  if (!group) {
    redirect("/groups")
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  const isMember = !!membership
  const isCreator = group.created_by === user.id
  const isMemberOrCreator = isMember || isCreator

  const { data: pendingRequest } = await supabase
    .from("group_requests")
    .select("id")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle()

  async function handleJoin() {
    "use server"
    if (group.visibility === "private") {
      await requestMembership(id)
    } else {
      await joinGroup(id)
    }
  }

  async function handleLeave() {
    "use server"
    await leaveGroup(id)
    redirect("/groups")
  }

  return (
    <div className="min-h-screen chat-gradient-bg">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Button asChild variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-white shadow-sm">
              <Link href="/groups">
                <ChevronLeft className="h-6 w-6" />
              </Link>
            </Button>

            {isCreator ? (
              <ManageRequestsDialog
                groupId={id}
                groupName={group.name}
                triggerElement={
                  <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-white shadow-sm">
                    <Settings className="h-6 w-6" />
                  </Button>
                }
              />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-12 w-12 bg-white shadow-sm opacity-50 cursor-not-allowed"
                disabled
              >
                <Settings className="h-6 w-6" />
              </Button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-14 h-14">
                <img src="/images/ngumu-20eye-20logo.jpg" alt="Ngumu Eye" className="w-full h-full object-contain" />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-base text-foreground leading-tight line-clamp-2">{group.name}</h1>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full whitespace-nowrap">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="text-[10px]">062</span>
                  </span>
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full whitespace-nowrap">
                    {group.visibility === "public" ? (
                      <>
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="text-[10px]">Public</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-3 w-3 flex-shrink-0" />
                        <span className="text-[10px]">Private</span>
                      </>
                    )}
                  </span>
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full whitespace-nowrap">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    <span className="text-[10px]">{group.member_count}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-safe">
        {!isMember && !isCreator && (
          <div className="mb-4">
            {pendingRequest ? (
              <Button
                disabled
                variant="outline"
                className="w-full bg-accent/10 text-accent-foreground border-accent/30 rounded-full h-12"
              >
                Membership Request Pending
              </Button>
            ) : (
              <form action={handleJoin}>
                <ActionButton
                  className="w-full rounded-full h-12 chat-bubble-sent text-white shadow-lg text-base font-medium"
                  loadingText={group.visibility === "public" ? "Joining..." : "Requesting..."}
                >
                  {group.visibility === "public" ? "Join Group" : "Request Membership"}
                </ActionButton>
              </form>
            )}
          </div>
        )}
        {isMember && !isCreator && (
          <div className="mb-4">
            <form action={handleLeave}>
              <ActionButton
                variant="outline"
                className="w-full rounded-full h-12 border-destructive/30 text-destructive hover:bg-destructive/10"
                loadingText="Leaving..."
              >
                Leave Group
              </ActionButton>
            </form>
          </div>
        )}

        {isMemberOrCreator || group.visibility === "public" ? (
          <GroupChat groupId={id} userId={user.id} isMember={isMemberOrCreator} />
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-12 text-center mt-8">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm leading-relaxed">
              {pendingRequest
                ? "Your membership request is pending approval from the group creator"
                : "Request to join the group to view messages and chat with members"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
