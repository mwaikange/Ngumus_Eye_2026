"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"
import { toggleFollowIncident } from "@/lib/actions/incidents"
import { useToast } from "@/hooks/use-toast"

interface FollowIncidentButtonProps {
  incidentId: string
  initialIsFollowing: boolean
}

export function FollowIncidentButton({ incidentId, initialIsFollowing }: FollowIncidentButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleFollowIncident(incidentId)
      if (result.data) {
        setIsFollowing(result.data.following)
        toast({
          title: result.data.following ? "Following post" : "Unfollowed post",
          description: result.data.following
            ? "You'll get notified when someone comments."
            : "You won't receive comment notifications for this post.",
        })
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleToggle} disabled={isPending}>
      {isFollowing ? (
        <>
          <BellOff className="h-4 w-4 mr-1" />
          Unfollow
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  )
}
