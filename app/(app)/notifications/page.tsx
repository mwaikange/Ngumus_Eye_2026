"use client"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, UserPlus, Users, Calendar, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  entity_id: string | null
  read_at: string | null
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setNotifications(data)
    }
    setLoading(false)
  }

  const handleNotificationClick = async (notification: Notification) => {
    await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id)

    if (notification.type === "follow" && notification.entity_id) {
      router.push(`/profile/${notification.entity_id}`)
    } else if (
      (notification.type === "group_request" || notification.type === "group_joined") &&
      notification.entity_id
    ) {
      router.push(`/groups/${notification.entity_id}`)
    } else if (notification.type === "subscription") {
      router.push("/subscribe")
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "follow":
        return <UserPlus className="h-4 w-4 text-primary" />
      case "group_request":
        return <Users className="h-4 w-4 text-blue-500" />
      case "group_joined":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "subscription":
        return <Calendar className="h-4 w-4 text-purple-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Notifications" backHref="/feed" />
        <div className="container max-w-4xl px-4 py-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Notifications" backHref="/feed" />

      <div className="container max-w-4xl px-4 py-6 space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer hover:bg-accent/50 transition-colors border ${notification.read_at ? "opacity-60 bg-muted/20" : "bg-white"}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-1">{notification.title || "Notification"}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{getTimeAgo(notification.created_at)}</p>
                  </div>
                  {!notification.read_at && (
                    <Badge variant="default" className="bg-primary text-xs px-2 py-0.5">
                      New
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
