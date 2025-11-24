"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { LayoutDashboard, Inbox, ImageIcon, Users, UsersRound, CreditCard, Building2, FileText } from "lucide-react"

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/triage", icon: Inbox, label: "Triage" },
  { href: "/admin/evidence", icon: ImageIcon, label: "Evidence" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/groups", icon: UsersRound, label: "Groups" },
  { href: "/admin/billing", icon: CreditCard, label: "Billing" },
  { href: "/admin/partners", icon: Building2, label: "Partners" },
  { href: "/admin/audit", icon: FileText, label: "Audit" },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="Ngumu's Eye Logo" width={32} height={32} className="h-8 w-8 object-contain" />
          <div>
            <h2 className="font-semibold">{"Ngumu's Eye"}</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Link href="/feed" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          ← Back to App
        </Link>
      </div>
    </aside>
  )
}
