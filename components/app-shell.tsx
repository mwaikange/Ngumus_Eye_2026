"use client"

import type React from "react"

import { Home, Map, Plus, Users, User, Briefcase } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const baseNavItems = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/map", icon: Map, label: "Map" },
  { href: "/report", icon: Plus, label: "Report" },
  { href: "/groups", icon: Users, label: "Groups" },
  { href: "/profile", icon: User, label: "Profile" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [hasSubscription, setHasSubscription] = useState(false)
  const [navItems, setNavItems] = useState(baseNavItems)

  useEffect(() => {
    checkSubscription()
  }, [])

  async function checkSubscription() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .maybeSingle()

    const hasAccess = !!subscription
    setHasSubscription(hasAccess)

    if (hasAccess) {
      setNavItems([
        { href: "/feed", icon: Home, label: "Feed" },
        { href: "/map", icon: Map, label: "Map" },
        { href: "/report", icon: Plus, label: "Report" },
        { href: "/case-deck", icon: Briefcase, label: "Files" },
        { href: "/groups", icon: Users, label: "Groups" },
        { href: "/profile", icon: User, label: "Profile" },
      ])
    }
    // </CHANGE>
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>

      {/* Bottom navigation - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
        <div className={cn("flex items-center h-16", hasSubscription ? "justify-between px-2" : "justify-around")}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-full transition-colors",
                  hasSubscription ? "flex-1 max-w-[80px]" : "flex-1",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", item.href === "/report" && "h-6 w-6")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
