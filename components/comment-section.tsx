"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, ImageIcon, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { addComment } from "@/lib/actions/incidents"
import { useState, useTransition, useRef } from "react"
import { useToast } from "@/hooks/use-toast"

interface Comment {
  id: string
  body: string
  created_at: string
  image_url?: string | null
  profiles: {
    id?: string
    display_name: string | null
    avatar_url?: string | null
  } | null
  isOptimistic?: boolean
  isFailed?: boolean
}

interface CommentSectionProps {
  incidentId: string
  initialComments: Comment[]
}

export function CommentSection({ incidentId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Image must be under 5MB", variant: "destructive" })
        return
      }
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
    e.target.value = ""
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleSubmit = () => {
    if (!newComment.trim() && !selectedImage) return

    // Create optimistic comment
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      body: newComment,
      image_url: imagePreview,
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
    const imageToUpload = selectedImage
    setNewComment("")
    clearImage()

    startTransition(async () => {
      try {
        let imageUrl = null

        // Upload image if present
        if (imageToUpload) {
          const formData = new FormData()
          formData.append("file", imageToUpload)
          const response = await fetch("/api/upload", { method: "POST", body: formData })
          if (response.ok) {
            const { url } = await response.json()
            imageUrl = url
          }
        }

        const result = await addComment(incidentId, commentText, imageUrl)

        if (result.data) {
          // Replace optimistic comment with real one
          setComments((prev) =>
            prev.map((c) => (c.id === optimisticComment.id ? { ...result.data, isOptimistic: false } : c)),
          )
          toast({ title: "Comment posted", description: "Your comment has been added" })
        } else {
          throw new Error("Failed to post")
        }
      } catch (error) {
        // Mark as failed
        setComments((prev) =>
          prev.map((c) => (c.id === optimisticComment.id ? { ...c, isFailed: true, isOptimistic: false } : c)),
        )
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

          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={imagePreview || "/placeholder.svg"}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-lg"
              />
              <button
                onClick={clearImage}
                className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={isPending}
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Image
              </Button>
              <p className="text-xs text-muted-foreground">{newComment.length}/500</p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isPending || (!newComment.trim() && !selectedImage)}
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
            className={`animate-fade-in ${comment.isOptimistic ? "opacity-70" : ""} ${comment.isFailed ? "border-red-300" : ""}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} />
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
                      ) : comment.isFailed ? (
                        <span className="text-red-500">Failed</span>
                      ) : (
                        formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
                      )}
                    </p>
                  </div>
                  <p className="text-sm">{comment.body}</p>
                  {comment.image_url && (
                    <img
                      src={comment.image_url || "/placeholder.svg"}
                      alt="Comment attachment"
                      className="mt-2 rounded-lg max-w-[200px] max-h-[150px] object-cover"
                    />
                  )}
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
