import { AppHeader } from "@/components/app-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, UserPlus, Users, Calendar } from "lucide-react"

export default function NotificationsPage() {
  // Mock notifications for now - will be replaced with real data
  const notifications = [
    {
      id: "1",
      type: "follow",
      message: "John followed you",
      time: "2 minutes ago",
      read: false,
    },
    {
      id: "2",
      type: "group_request",
      message: "Sarah requested to join Katutura Community",
      time: "1 hour ago",
      read: false,
    },
    {
      id: "3",
      type: "subscription",
      message: "Your subscription expires in 3 days",
      time: "2 hours ago",
      read: true,
    },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case "follow":
        return <UserPlus className="h-4 w-4" />
      case "group_request":
        return <Users className="h-4 w-4" />
      case "subscription":
        return <Calendar className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Notifications" backHref="/feed" />

      <div className="container max-w-4xl px-4 py-6 space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} className={notification.read ? "opacity-60" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{notification.message}</p>
                    <p className="text-sm text-muted-foreground">{notification.time}</p>
                  </div>
                  {!notification.read && (
                    <Badge variant="default" className="bg-primary">
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
