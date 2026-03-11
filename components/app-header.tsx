"use client"

import type React from "react"

import Image from "next/image"
import { Bell, Search, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface AppHeaderProps {
  title: string
  showSearch?: boolean
  backHref?: string
}

export function AppHeader({ title, showSearch = false, backHref }: AppHeaderProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null)
      setUnreadCount(count || 0)
    }
    fetchUnread()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container flex h-14 items-center gap-4 px-4">
        <div className="flex items-center gap-2">
          {backHref ? (
            <Button variant="ghost" size="icon" onClick={() => router.push(backHref)} className="h-8 w-8">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Image src="/logo.jpg" alt="Ngumu's Eye Logo" width={32} height={32} className="h-8 w-8 object-contain" />
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        {showSearch && (
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search incidents..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" onClick={() => router.push("/notifications")}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            )}
            <span className="sr-only">Notifications ({unreadCount} unread)</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
