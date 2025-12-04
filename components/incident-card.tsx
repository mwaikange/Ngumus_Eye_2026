"use client"

import type React from "react"
import Link from "next/link"
import { formatTimeAgo, formatRadius } from "@/lib/feed-utils"
import { useState, useRef, type TouchEvent } from "react"
import { ChevronLeft, ChevronRight, UserPlus, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface IncidentCardProps {
  incident: {
    id: string
    title: string
    description: string | null
    category: string
    created_at: string
    area_radius_m: number | null
    verification_level: number | null
    media_urls: string[]
    severity: number
    reporter?: {
      id: string
      display_name: string
      avatar_url?: string
    }
    is_following?: boolean
  }
  onFollow?: (userId: string) => void
}

const severityColors = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
  5: "bg-red-200 text-red-900",
}

export function IncidentCard({ incident, onFollow }: IncidentCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFollowing, setIsFollowing] = useState(incident.is_following || false)
  const [followLoading, setFollowLoading] = useState(false)

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const hasMultipleImages = (incident.media_urls?.length || 0) > 1
  const severityColor = severityColors[incident.severity as keyof typeof severityColors] || severityColors[1]

  const nextImage = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % (incident.media_urls?.length || 1))
  }

  const prevImage = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + (incident.media_urls?.length || 1)) % (incident.media_urls?.length || 1))
  }

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: TouchEvent) => {
    const diff = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(diff) > minSwipeDistance) {
      e.preventDefault()
      e.stopPropagation()
      if (diff > 0) {
        // Swipe left - next image
        setCurrentImageIndex((prev) => (prev + 1) % (incident.media_urls?.length || 1))
      } else {
        // Swipe right - prev image
        setCurrentImageIndex(
          (prev) => (prev - 1 + (incident.media_urls?.length || 1)) % (incident.media_urls?.length || 1),
        )
      }
    }
  }

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!incident.reporter?.id || followLoading) return

    setFollowLoading(true)
    try {
      if (onFollow) {
        await onFollow(incident.reporter.id)
      }
      setIsFollowing(!isFollowing)
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <article className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
      {incident.media_urls && incident.media_urls.length > 0 && (
        <div
          className="relative w-full h-52 bg-gray-100 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={incident.media_urls[currentImageIndex] || "/placeholder.svg"}
            alt={incident.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {hasMultipleImages && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Image count indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {currentImageIndex + 1} / {incident.media_urls.length}
              </div>
            </>
          )}
        </div>
      )}

      <Link href={`/incident/${incident.id}`} className="block">
        <div className="p-3">
          {/* Category pill */}
          <div
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${severityColor}`}
          >
            {incident.category}
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">{incident.title}</h2>

          {/* Description */}
          {incident.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{incident.description}</p>}

          {/* Footer: time + radius */}
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>{formatTimeAgo(incident.created_at)}</span>
            {incident.area_radius_m != null && <span>{formatRadius(incident.area_radius_m)}</span>}
          </div>
        </div>
      </Link>

      {incident.reporter && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={incident.reporter.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {incident.reporter.display_name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600">{incident.reporter.display_name}</span>
            </div>
            <Button
              variant={isFollowing ? "secondary" : "outline"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <span className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
              ) : isFollowing ? (
                <>
                  <UserCheck className="h-3 w-3 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Follow
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}
