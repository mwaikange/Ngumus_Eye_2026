"use client"

export function SkeletonText({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-7 w-7",
    md: "h-10 w-10",
    lg: "h-20 w-20",
  }
  return <div className={`animate-pulse bg-gray-200 rounded-full ${sizes[size]}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 animate-pulse">
      {/* Image skeleton */}
      <div className="w-full h-52 bg-gray-200" />
      <div className="p-3 space-y-3">
        {/* Category pill */}
        <div className="h-5 w-24 bg-gray-200 rounded-full" />
        {/* Title */}
        <div className="h-5 w-3/4 bg-gray-200 rounded" />
        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
        {/* Footer */}
        <div className="flex justify-between pt-2">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
      </div>
      {/* Reporter section */}
      <div className="px-3 pb-3 border-t border-gray-100 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-gray-200 rounded-full" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-7 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonAdCard() {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm overflow-hidden mb-6 animate-pulse border border-amber-200/50">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 bg-amber-200/50 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 bg-amber-200/50 rounded" />
            <div className="h-3 w-3/4 bg-amber-200/50 rounded" />
          </div>
          <div className="h-5 w-8 bg-amber-200/50 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonProfileCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonIncidentDetail() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-gray-200 rounded-full" />
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
        </div>
        <div className="h-8 w-3/4 bg-gray-200 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4 mb-4">
          <div className="h-10 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-24 bg-gray-200 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonComment() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonGroupList() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="h-12 w-12 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-3 w-1/4 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonMessage() {
  return (
    <div className="flex gap-2 animate-pulse">
      <div className="h-8 w-8 bg-gray-200 rounded-full" />
      <div className="bg-gray-100 rounded-2xl p-3 space-y-1">
        <div className="h-3 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export function FeedSkeleton() {
  return (
    <div className="space-y-0">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonAdCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
