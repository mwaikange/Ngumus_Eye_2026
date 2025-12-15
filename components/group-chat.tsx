"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, Loader2, Send, Shield } from "lucide-react"
import { sendGroupMessage } from "@/lib/actions/groups"
import { formatDistanceToNow } from "date-fns"

interface Message {
  id: string
  message: string | null
  image_url: string | null
  video_url: string | null
  created_at: string
  expires_at: string
  user_id: string
  profiles: {
    display_name: string
    trust_score: number
  }
  isOptimistic?: boolean
  isFailed?: boolean
}

export function GroupChat({ groupId, userId, isMember }: { groupId: string; userId: string; isMember: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            fetchMessages()
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function fetchMessages() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: messagesData, error: messagesError } = await supabase
      .from("group_messages")
      .select("id, user_id, message, image_url, video_url, created_at, expires_at")
      .eq("group_id", groupId)
      .gt("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: true })
      .limit(100)

    if (messagesError) {
      console.error("[v0] Error fetching messages:", messagesError)
      return
    }

    if (!messagesData || messagesData.length === 0) {
      setMessages([])
      return
    }

    const userIds = [...new Set(messagesData.map((m) => m.user_id))]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, trust_score")
      .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])

    const profileMap = new Map(
      profiles?.map((p) => [p.id, { display_name: p.display_name, trust_score: p.trust_score }]),
    )

    const messagesWithProfiles = messagesData.map((msg) => ({
      ...msg,
      profiles: profileMap.get(msg.user_id) || { display_name: "Unknown", trust_score: 0 },
    })) as Message[]

    setMessages(messagesWithProfiles)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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

  async function handleSend() {
    if (!isMember) {
      return
    }

    if (!newMessage.trim() && !selectedImage) return

    const messageText = newMessage.trim()
    const imageToUpload = selectedImage
    const previewUrl = imagePreview

    const optimisticId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: optimisticId,
      message: messageText || null,
      image_url: previewUrl,
      video_url: null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user_id: userId,
      profiles: { display_name: "You", trust_score: 0 },
      isOptimistic: true,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage("")
    clearImage()
    setIsSending(true)

    try {
      let imageUrl = null

      if (imageToUpload) {
        setIsUploading(true)
        console.log("[v0] Uploading image:", imageToUpload.name, imageToUpload.type)

        const formData = new FormData()
        formData.append("file", imageToUpload)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Upload failed:", errorText)
          throw new Error(`Upload failed: ${errorText}`)
        }

        const { url } = await response.json()
        imageUrl = url
        console.log("[v0] Image uploaded successfully:", imageUrl)
        setIsUploading(false)
      }

      console.log("[v0] Sending message to group:", groupId)
      const result = await sendGroupMessage({
        groupId,
        message: messageText || undefined,
        imageUrl: imageUrl || undefined,
      })

      if (result.error) {
        console.error("[v0] Send message error:", result.error)
        throw new Error(result.error)
      }

      console.log("[v0] Message sent successfully")
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
    } catch (error) {
      console.error("[v0] Error in handleSend:", error)
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, isFailed: true, isOptimistic: false } : m)),
      )
    } finally {
      setIsSending(false)
      setIsUploading(false)
    }
  }

  if (!isMember) {
    return (
      <div className="flex flex-col h-[calc(100vh-20rem)] bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg border border-white/60">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm font-medium">No messages yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Join the group to chat!</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id

              return (
                <div key={msg.id} className="flex gap-2 flex-row">
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm border-2 border-white">
                      <AvatarFallback className="text-sm bg-primary/20 text-primary font-semibold">
                        {msg.profiles.display_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 flex-shrink-0" />
                  )}

                  <div className="flex flex-col gap-1 max-w-[75%] items-start">
                    <div className="rounded-2xl px-4 py-2 chat-bubble-received text-foreground shadow-sm">
                      {msg.message && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                      )}
                      {msg.image_url && (
                        <img
                          src={msg.image_url || "/placeholder.svg"}
                          alt="Shared image"
                          className={`${msg.message ? "mt-2" : ""} rounded-xl max-w-[240px] w-full object-cover`}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 px-1 flex-row">
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 bg-accent/20 text-accent-foreground border-accent/40"
                      >
                        Trust {msg.profiles.trust_score}
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border/30 bg-white/95 backdrop-blur-sm p-3 safe-bottom">
          <div className="flex items-center justify-center py-2 text-muted-foreground text-sm">
            <Shield className="h-4 w-4 mr-2" />
            Join the group to send messages
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-20rem)] bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg border border-white/60">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm font-medium">No messages yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.user_id === userId
            const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id

            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                {showAvatar ? (
                  <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm border-2 border-white">
                    <AvatarFallback className="text-sm bg-primary/20 text-primary font-semibold">
                      {msg.profiles.display_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 flex-shrink-0" />
                )}

                <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn ? "chat-bubble-sent text-white shadow-md" : "chat-bubble-received text-foreground shadow-sm"
                    } ${msg.isOptimistic ? "opacity-70" : ""} ${msg.isFailed ? "border-2 border-red-500" : ""}`}
                  >
                    {msg.message && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
                    {msg.image_url && (
                      <img
                        src={msg.image_url || "/placeholder.svg"}
                        alt="Shared image"
                        className={`${msg.message ? "mt-2" : ""} rounded-xl max-w-[240px] w-full object-cover`}
                      />
                    )}
                  </div>

                  <div className={`flex items-center gap-2 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[10px] text-muted-foreground/70">
                      {msg.isOptimistic ? (
                        <span className="text-primary">Sending...</span>
                      ) : msg.isFailed ? (
                        <span className="text-red-500">Failed</span>
                      ) : (
                        formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })
                      )}
                    </span>
                    {!msg.isOptimistic && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 bg-accent/20 text-accent-foreground border-accent/40"
                      >
                        Trust {msg.profiles.trust_score}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border/30 bg-white/95 backdrop-blur-sm p-3 safe-bottom">
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="h-16 w-16 object-cover rounded-xl" />
            <button
              onClick={clearImage}
              className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full hover:bg-primary/10 flex-shrink-0"
            onClick={() => imageInputRef.current?.click()}
            disabled={isSending}
          >
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </Button>

          <div className="flex-1 bg-muted/40 rounded-full px-4 py-2.5 border border-border/40">
            <input
              type="text"
              placeholder="Message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
              disabled={isSending}
            />
          </div>

          <Button
            size="icon"
            className="h-10 w-10 rounded-full chat-bubble-sent shadow-md flex-shrink-0 transition-all active:scale-95"
            onClick={handleSend}
            disabled={isSending || (!newMessage.trim() && !selectedImage)}
          >
            {isSending || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
