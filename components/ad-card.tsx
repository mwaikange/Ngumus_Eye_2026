"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

interface AdCardProps {
  ad: {
    id: string
    title: string
    description: string | null
    media_url: string
    media_type: string
    target_url: string | null
    display_priority: number
  }
}

export function AdCard({ ad }: AdCardProps) {
  const handleAdClick = () => {
    // Track impression/click if target URL exists
    if (ad.target_url) {
      window.open(ad.target_url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200"
      onClick={handleAdClick}
    >
      <CardContent className="p-0">
        <div className="relative">
          {ad.media_type === "image" && (
            <div className="w-full h-32 relative overflow-hidden rounded-t-lg">
              <img src={ad.media_url || "/placeholder.svg"} alt={ad.title} className="w-full h-full object-cover" />
            </div>
          )}

          {ad.media_type === "video" && (
            <div className="w-full h-32 relative overflow-hidden rounded-t-lg">
              <video src={ad.media_url} className="w-full h-full object-cover" autoPlay muted loop />
            </div>
          )}

          {/* Sponsored badge */}
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
            Sponsored
          </div>
        </div>

        {/* Ad content */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-sm flex items-center justify-between">
            {ad.title}
            {ad.target_url && <ExternalLink className="h-4 w-4 text-orange-500" />}
          </h3>
          {ad.description && <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
