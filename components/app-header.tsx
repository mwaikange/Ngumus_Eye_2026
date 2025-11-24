"use client"

import Image from "next/image"
import { Bell, Search, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

interface AppHeaderProps {
  title: string
  showSearch?: boolean
  backHref?: string
}

export function AppHeader({ title, showSearch = false, backHref }: AppHeaderProps) {
  const router = useRouter()

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
          {/* </CHANGE> */}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        {showSearch && (
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search incidents..." className="pl-8" />
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
