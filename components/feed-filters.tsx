"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface FeedFiltersProps {
  currentFilter: string
}

export function FeedFilters({ currentFilter }: FeedFiltersProps) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState(currentFilter)

  const filters = [
    { id: "all", label: "All" },
    { id: "nearby", label: "Nearby" },
    { id: "verified", label: "Verified" },
    { id: "following", label: "Following" },
  ]

  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId)
    router.push(`/feed?filter=${filterId}`)
  }

  const activeIndex = filters.findIndex((f) => f.id === activeFilter)

  return (
    <div className="relative mb-4 bg-gray-200 rounded-full p-1">
      {/* Animated slider background */}
      <div
        className="absolute top-1 bottom-1 bg-gray-900 rounded-full transition-all duration-300 ease-out"
        style={{
          left: `calc(${activeIndex * 25}% + 4px)`,
          width: `calc(25% - 8px)`,
        }}
      />

      {/* Filter buttons */}
      <div className="relative flex items-center">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleFilterChange(filter.id)}
            className={`flex-1 px-3 py-2 rounded-full text-xs font-medium transition-colors duration-200 relative z-10 ${
              activeFilter === filter.id ? "text-white" : "text-gray-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
