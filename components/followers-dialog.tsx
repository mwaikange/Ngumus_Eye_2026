"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, Loader2, UserPlus, UserMinus } from "lucide-react"
import { getFollowersList, getFollowingList, followUser, unfollowUser } from "@/lib/actions/profile"
import { useToast } from "@/hooks/use-toast"

interface FollowersDialogProps {
  userId: string
  type: "followers" | "following"
  count: number
}

export function FollowersDialog({ userId, type, count }: FollowersDialogProps) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [followingMap, setFollowingMap] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open])

  async function loadUsers() {
    setLoading(true)
    const result = type === "followers" ? await getFollowersList(userId) : await getFollowingList(userId)

    if (!result.error) {
      setUsers(result.data || [])
      if (type === "following") {
        setFollowingMap(new Set(result.data?.map((u: any) => u.id) || []))
      }
    }
    setLoading(false)
  }

  async function handleFollowToggle(targetUserId: string, isCurrentlyFollowing: boolean) {
    setActionLoading(targetUserId)

    const result = isCurrentlyFollowing ? await unfollowUser(targetUserId) : await followUser(targetUserId)

    if (result.success) {
      toast({
        title: isCurrentlyFollowing ? "Unfollowed" : "Following",
        description: result.message,
      })
      setFollowingMap((prev) => {
        const newSet = new Set(prev)
        if (isCurrentlyFollowing) {
          newSet.delete(targetUserId)
        } else {
          newSet.add(targetUserId)
        }
        return newSet
      })
      loadUsers()
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
    setActionLoading(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex flex-col items-center hover:opacity-80 transition-opacity">
          <span className="text-xl font-bold">{count}</span>
          <span className="text-sm text-muted-foreground capitalize">{type}</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{type}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No {type} yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {users.map((user) => {
              const isFollowingThisUser = followingMap.has(user.id)

              return (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.display_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.display_name || "Anonymous"}</p>
                      <Badge variant="secondary" className="text-xs">
                        Trust: {user.trust_score || 0}
                      </Badge>
                    </div>
                  </div>
                  {type === "followers" ? (
                    <Button
                      size="sm"
                      variant={isFollowingThisUser ? "secondary" : "outline"}
                      onClick={() => handleFollowToggle(user.id, isFollowingThisUser)}
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isFollowingThisUser ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Follow Back
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleFollowToggle(user.id, true)}
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unfollow
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
