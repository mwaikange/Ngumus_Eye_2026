"use client"

import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, Heart, CheckCircle } from "lucide-react"
import { toggleReaction } from "@/lib/actions/incidents"
import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"

interface ReactionButtonsProps {
  incidentId: string
  upvotes: number
  downvotes: number
  loves: number
  confirms?: number
  userReactions: string[]
}

export function ReactionButtons({
  incidentId,
  upvotes,
  downvotes,
  loves,
  confirms = 0,
  userReactions,
}: ReactionButtonsProps) {
  const [isPending, startTransition] = useTransition()
  const [localReactions, setLocalReactions] = useState(userReactions)
  const [counts, setCounts] = useState({ upvotes, downvotes, loves, confirms })

  const handleReaction = (kind: "upvote" | "downvote" | "love" | "confirm") => {
    const hasReaction = localReactions.includes(kind)

    // Optimistic update
    if (hasReaction) {
      setLocalReactions((prev) => prev.filter((r) => r !== kind))
      setCounts((prev) => ({ ...prev, [kind + "s"]: prev[(kind + "s") as keyof typeof prev] - 1 }))
    } else {
      setLocalReactions((prev) => [...prev, kind])
      setCounts((prev) => ({ ...prev, [kind + "s"]: prev[(kind + "s") as keyof typeof prev] + 1 }))
    }

    startTransition(async () => {
      await toggleReaction(incidentId, kind)
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleReaction("upvote")}
        disabled={isPending}
        className={cn(
          localReactions.includes("upvote") && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        )}
      >
        <ThumbsUp className="h-4 w-4 mr-1" />
        {counts.upvotes}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleReaction("downvote")}
        disabled={isPending}
        className={cn(
          localReactions.includes("downvote") && "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        )}
      >
        <ThumbsDown className="h-4 w-4 mr-1" />
        {counts.downvotes}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleReaction("love")}
        disabled={isPending}
        className={cn(
          localReactions.includes("love") && "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
        )}
      >
        <Heart className="h-4 w-4 mr-1" />
        {counts.loves}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleReaction("confirm")}
        disabled={isPending}
        className={cn(
          localReactions.includes("confirm") && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
        )}
      >
        <CheckCircle className="h-4 w-4 mr-1" />
        {counts.confirms}
      </Button>
    </div>
  )
}
