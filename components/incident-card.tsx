"use client"

import type React from "react"

import Link from "next/link"
import { formatTimeAgo, formatRadius } from "@/lib/feed-utils"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
  }
}

const severityColors = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
  5: "bg-red-200 text-red-900",
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const hasMultipleImages = (incident.media_urls?.length || 0) > 1
  const imageUrl = incident.media_urls?.[0]
  const severityColor = severityColors[incident.severity as keyof typeof severityColors] || severityColors[1]

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % (incident.media_urls?.length || 1))
  }

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + (incident.media_urls?.length || 1)) % (incident.media_urls?.length || 1))
  }

  return (
    <Link href={`/incident/${incident.id}`} className="block mb-6">
      <article className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
        {/* Full width image at top */}
        {incident.media_urls && incident.media_urls.length > 0 && (
          <div className="relative w-full h-52 bg-gray-100 overflow-hidden group">
            <img
              src={incident.media_urls[currentImageIndex] || "/placeholder.svg"}
              alt={incident.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Image navigation */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Image indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {incident.media_urls.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

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
      </article>
    </Link>
  )
}
