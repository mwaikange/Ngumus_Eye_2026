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
import { Settings, Check, X, Loader2 } from "lucide-react"
import { getPendingRequests, approveRequest, rejectRequest, getTrustScore } from "@/lib/actions/groups"
import { useToast } from "@/hooks/use-toast"

interface ManageRequestsDialogProps {
  groupId: string
  triggerElement?: React.ReactNode
}

export function ManageRequestsDialog({ groupId, triggerElement }: ManageRequestsDialogProps) {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState<string | null>(null)
  const [rejectLoading, setRejectLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadRequests()
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

  async function handleApprove(requestId: string, displayName: string) {
    setApproveLoading(requestId)
    const result = await approveRequest(requestId, groupId)
    if (result.success) {
      toast({
        title: "Member Added",
        description: `You added ${displayName} to this group.`,
      })
      loadRequests()
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerElement || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Manage Requests
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Membership Requests</DialogTitle>
          <DialogDescription>Approve or reject users who want to join your private group</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No pending requests</div>
        ) : (
          <div className="space-y-3">
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
      </DialogContent>
    </Dialog>
  )
}
