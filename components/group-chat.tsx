"use client"

import { useEffect, useState, useRef } from "react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Mic, ImageIcon, Video, Loader2, Send } from "lucide-react"
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
}

export function GroupChat({ groupId, userId }: { groupId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
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

  async function uploadFile(file: File): Promise<string | null> {
    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const { url } = await response.json()
      return url
    } catch (error) {
      console.error("[v0] Upload error:", error)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSend() {
    if (!newMessage.trim() && !selectedImage && !selectedVideo) return

    setIsSending(true)
    setIsLoading(true)

    let imageUrl = null
    let videoUrl = null

    if (selectedImage) imageUrl = await uploadFile(selectedImage)
    if (selectedVideo) videoUrl = await uploadFile(selectedVideo)

    const result = await sendGroupMessage({
      groupId,
      message: newMessage.trim() || undefined,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
    })

    if (!result.error) {
      setNewMessage("")
      setSelectedImage(null)
      setSelectedVideo(null)
    }

    setIsLoading(false)
    setIsSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-20rem)] bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg border border-white/60">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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
                  <Avatar className="h-10 w-10 flex-shrink-0 shadow-sm border-2 border-white">
                    <AvatarFallback className="text-sm bg-primary/20 text-primary font-semibold">
                      {msg.profiles.display_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 flex-shrink-0" />
                )}

                <div className={`flex flex-col gap-1.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-3xl px-4 py-3 ${
                      isOwn ? "chat-bubble-sent text-white shadow-md" : "chat-bubble-received text-foreground shadow-sm"
                    } ${!msg.message && (msg.image_url || msg.video_url) ? "p-1" : ""}`}
                  >
                    {msg.message && (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
                    {msg.image_url && (
                      <img
                        src={msg.image_url || "/placeholder.svg"}
                        alt="Shared image"
                        className={`${msg.message ? "mt-2" : ""} rounded-2xl max-w-[280px] w-full object-cover`}
                      />
                    )}
                    {msg.video_url && (
                      <video
                        src={msg.video_url}
                        controls
                        className={`${msg.message ? "mt-2" : ""} rounded-2xl max-w-[280px] w-full`}
                        playsInline
                      />
                    )}
                  </div>

                  <div className={`flex items-center gap-2 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[11px] text-muted-foreground/70 font-medium">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0.5 h-5 bg-accent/20 text-accent-foreground border-accent/40 font-semibold"
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

      <div className="border-t border-border/30 bg-white/90 backdrop-blur-sm p-3 safe-bottom">
        {(selectedImage || selectedVideo) && (
          <div className="mb-2 flex items-center gap-2 p-2.5 bg-muted/30 rounded-2xl">
            {selectedImage && (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm truncate font-medium">{selectedImage.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full hover:bg-destructive/10"
                  onClick={() => setSelectedImage(null)}
                >
                  <span className="text-lg text-destructive">×</span>
                </Button>
              </div>
            )}
            {selectedVideo && (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm truncate font-medium">{selectedVideo.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full hover:bg-destructive/10"
                  onClick={() => setSelectedVideo(null)}
                >
                  <span className="text-lg text-destructive">×</span>
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setSelectedVideo(e.target.files?.[0] || null)}
          />

          <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-full px-5 py-3 border border-border/40 shadow-sm">
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
              className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground/60"
              disabled={isLoading || isUploading || isSending}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 rounded-full hover:bg-primary/10 transition-colors flex-shrink-0"
              onClick={() => {
                /* Voice recording placeholder */
              }}
              disabled={isLoading || isUploading || isSending}
              title="Record voice message"
            >
              <Mic className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 rounded-full hover:bg-primary/10 transition-colors flex-shrink-0"
              onClick={() => imageInputRef.current?.click()}
              disabled={isLoading || isUploading || isSending || !!selectedVideo}
              title="Send photo"
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 rounded-full hover:bg-primary/10 transition-colors flex-shrink-0"
              onClick={() => videoInputRef.current?.click()}
              disabled={isLoading || isUploading || isSending || !!selectedImage}
              title="Send video"
            >
              <Video className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full chat-bubble-sent shadow-lg flex-shrink-0 hover:shadow-xl transition-all active:scale-95"
              onClick={handleSend}
              disabled={
                isLoading || isUploading || isSending || (!newMessage.trim() && !selectedImage && !selectedVideo)
              }
              title="Send message"
            >
              {isSending || isLoading || isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
