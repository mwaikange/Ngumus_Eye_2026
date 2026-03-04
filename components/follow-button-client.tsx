"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus, UserCheck, Loader2 } from "lucide-react"
import { followUser, unfollowUser } from "@/lib/actions/profile"
import { useToast } from "@/hooks/use-toast"

interface FollowButtonClientProps {
  targetUserId: string
  initialIsFollowing: boolean
  displayName: string
}

export function FollowButtonClient({ targetUserId, initialIsFollowing, displayName }: FollowButtonClientProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleToggle() {
    const prev = isFollowing
    setIsFollowing(!prev)
    setLoading(true)
    try {
      const result = prev ? await unfollowUser(targetUserId) : await followUser(targetUserId)
      if (result.error) throw new Error(result.error)
      toast({
        title: prev ? "Unfollowed" : "Following",
        description: prev ? `You unfollowed ${displayName}` : `You are now following ${displayName}`,
      })
    } catch (err: any) {
      setIsFollowing(prev)
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant={isFollowing ? "secondary" : "default"}
      onClick={handleToggle}
      disabled={loading}
      className="min-w-[100px]"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-4 w-4 mr-1.5" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Follow
        </>
      )}
    </Button>
  )
}
