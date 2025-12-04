"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { addComment } from "@/lib/actions/incidents"
import { useState, useTransition } from "react"
import { useToast } from "@/hooks/use-toast"

interface Comment {
  id: string
  body: string
  created_at: string
  profiles: {
    id?: string
    display_name: string | null
    avatar_url?: string | null
  } | null
  isOptimistic?: boolean
}

interface CommentSectionProps {
  incidentId: string
  initialComments: Comment[]
}

export function CommentSection({ incidentId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleSubmit = () => {
    if (!newComment.trim()) return

    // Create optimistic comment
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      body: newComment,
      created_at: new Date().toISOString(),
      profiles: {
        display_name: "You",
        avatar_url: null,
      },
      isOptimistic: true,
    }

    // Immediately add to UI
    setComments((prev) => [optimisticComment, ...prev])
    const commentText = newComment
    setNewComment("")

    startTransition(async () => {
      const result = await addComment(incidentId, commentText)

      if (result.data) {
        // Replace optimistic comment with real one
        setComments((prev) =>
          prev.map((c) => (c.id === optimisticComment.id ? { ...result.data, isOptimistic: false } : c)),
        )
        toast({ title: "Comment posted", description: "Your comment has been added" })
      } else {
        // Remove optimistic comment on error
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
        setNewComment(commentText) // Restore the comment text
        toast({
          title: "Error",
          description: "Failed to post comment. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{newComment.length}/500 characters</p>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !newComment.trim()}
              size="sm"
              className="min-w-[100px] transition-all duration-200"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Comment"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comments.length > 0 ? (
        comments.map((comment, index) => (
          <Card
            key={comment.id}
            className={`animate-fade-in ${comment.isOptimistic ? "opacity-70" : ""}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {comment.profiles?.display_name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{comment.profiles?.display_name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">
                      {comment.isOptimistic ? (
                        <span className="text-primary">Sending...</span>
                      ) : (
                        formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
                      )}
                    </p>
                  </div>
                  <p className="text-sm">{comment.body}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No comments yet. Be the first to comment!
          </CardContent>
        </Card>
      )}
    </div>
  )
}
