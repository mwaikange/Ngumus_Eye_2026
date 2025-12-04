"use client"

interface AdCardProps {
  ad: {
    id: string
    title: string
    description: string | null
    media_url: string
    media_type: string
    target_url: string | null
  }
}

import { trackAdView } from "@/lib/actions/ads"
import { useEffect, useRef } from "react"

export function AdCard({ ad }: AdCardProps) {
  const hasTracked = useRef(false)
  const handleAdClick = () => {
    if (ad.target_url) {
      window.open(ad.target_url, "_blank", "noopener,noreferrer")
    }
  }

  const content = (
    <article className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      {/* Ad image/banner */}
      <div className="w-full bg-white overflow-hidden">
        {ad.media_type === "image" && (
          <img
            src={ad.media_url || "/placeholder.svg"}
            alt={ad.title}
            className="w-full h-36 object-contain bg-white p-4"
            loading="lazy"
          />
        )}
        {ad.media_type === "video" && (
          <video src={ad.media_url} className="w-full h-36 object-cover" autoPlay muted loop playsInline />
        )}
      </div>

      {/* Sponsored footer */}
      <div className="flex justify-between items-center px-3 py-1.5 text-[10px] text-gray-400 bg-gray-50">
        <span>Sponsored</span>
        <span className="font-semibold text-orange-500">AD</span>
      </div>
    </article>
  )

  useEffect(() => {
    if (!hasTracked.current) {
      trackAdView(ad.id)
      hasTracked.current = true
    }
  }, [ad.id])

  if (ad.target_url) {
    return (
      <div onClick={handleAdClick} className="cursor-pointer hover:opacity-90 transition-opacity mb-6">
        {content}
      </div>
    )
  }

  return <div className="mb-6">{content}</div>
}
