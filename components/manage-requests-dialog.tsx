"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, Check, X, Loader2, Users, Trash2 } from "lucide-react"
import { getPendingRequests, approveRequest, rejectRequest, getTrustScore, removeMember } from "@/lib/actions/groups"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"

interface ManageRequestsDialogProps {
  groupId: string
  groupName?: string
  triggerElement?: React.ReactNode
}

export function ManageRequestsDialog({ groupId, groupName, triggerElement }: ManageRequestsDialogProps) {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState<string | null>(null)
  const [rejectLoading, setRejectLoading] = useState<string | null>(null)
  const [removeLoading, setRemoveLoading] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadRequests()
      loadMembers()
    }
  }, [open])

  async function loadRequests() {
    setLoading(true)
    const result = await getPendingRequests(groupId)
    if (result.success) {
      const requestsWithTrust = await Promise.all(
        (result.data || []).map(async (req: any) => {
          const trustResult = await getTrustScore(req.user_id)
          return {
            ...req,
            trust_score: trustResult.success ? trustResult.data : 0,
          }
        }),
      )
      setRequests(requestsWithTrust)
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from("group_members")
      .select("user_id, role, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: false })

    if (error) {
      console.error("[v0] Error loading members:", error)
      return
    }

    if (!data || data.length === 0) {
      setMembers([])
      return
    }

    // Fetch profiles
    const userIds = data.map((m) => m.user_id)
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, trust_score").in("id", userIds)

    const profileMap = new Map(profiles?.map((p) => [p.id, p]))

    const membersWithProfiles = data
      .map((member) => {
        const profile = profileMap.get(member.user_id)
        return {
          ...member,
          display_name: profile?.display_name || "Unknown",
          trust_score: profile?.trust_score || 0,
        }
      })
      .filter((m) => m.role !== "creator")

    setMembers(membersWithProfiles)
  }

  async function handleApprove(requestId: string, displayName: string) {
    setApproveLoading(requestId)
    const result = await approveRequest(requestId, groupId)
    if (result.success) {
      const userName = (result as any).user_name || displayName
      toast({
        title: "Member Added",
        description: `You added ${userName} to this group.`,
      })
      await loadRequests()
      await loadMembers()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
    setApproveLoading(null)
  }

  async function handleReject(requestId: string) {
    setRejectLoading(requestId)
    const result = await rejectRequest(requestId, groupId)
    if (result.success) {
      toast({
        title: "Request Declined",
        description: "The membership request has been declined.",
      })
      loadRequests()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
    setRejectLoading(null)
  }

  async function handleRemoveMember(userId: string, displayName: string) {
    setRemoveLoading(userId)

    const result = await removeMember(groupId, userId)

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Member Removed",
        description: `${displayName} has been removed from the group.`,
      })
      await loadMembers()
    }

    setRemoveLoading(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerElement || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Manage Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage {groupName || "Group"}</DialogTitle>
          <DialogDescription>Approve requests and manage members</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests">Requests {requests.length > 0 && `(${requests.length})`}</TabsTrigger>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-1" />
              Members {members.length > 0 && `(${members.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No pending requests</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {request.display_name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.display_name}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          Trust Score: {request.trust_score || 0}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(request.id, request.display_name)}
                        disabled={approveLoading === request.id || rejectLoading === request.id}
                        className="bg-primary"
                      >
                        {approveLoading === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        disabled={approveLoading === request.id || rejectLoading === request.id}
                      >
                        {rejectLoading === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No members yet</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.display_name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.display_name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            Trust: {member.trust_score || 0}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveMember(member.user_id, member.display_name)}
                      disabled={removeLoading === member.user_id}
                    >
                      {removeLoading === member.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
