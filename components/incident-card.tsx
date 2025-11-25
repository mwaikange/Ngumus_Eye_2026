import Link from "next/link"
import { formatTimeAgo, formatRadius } from "@/lib/feed-utils"

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
  const imageUrl = incident.media_urls?.[0]
  const severityColor = severityColors[incident.severity as keyof typeof severityColors] || severityColors[1]

  return (
    <Link href={`/incident/${incident.id}`}>
      <article className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
        {/* Full width image at top */}
        {imageUrl && (
          <div className="w-full h-52 bg-gray-100">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={incident.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
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
