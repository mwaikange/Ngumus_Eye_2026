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
import { Settings, Check, X } from "lucide-react"
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

  async function handleApprove(requestId: string) {
    const result = await approveRequest(requestId, groupId)
    if (result.success) {
      toast({
        title: "Request Approved",
        description: result.message,
      })
      loadRequests()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  async function handleReject(requestId: string) {
    const result = await rejectRequest(requestId, groupId)
    if (result.success) {
      toast({
        title: "Request Rejected",
        description: result.message,
      })
      loadRequests()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
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
          <div className="text-center py-4">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No pending requests</div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{request.display_name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      Trust Score: {request.trust_score || 0}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => handleApprove(request.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(request.id)}>
                    <X className="h-4 w-4" />
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
