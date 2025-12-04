import { FeedSkeleton } from "@/components/skeletons"
import { AppHeader } from "@/components/app-header"

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F2F4F7]">
      <AppHeader title="Community Feed" showSearch />
      <main className="max-w-md mx-auto px-3 pb-6 pt-2">
        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-4 p-1 bg-white rounded-full shadow-sm">
          <div className="h-9 w-16 bg-primary rounded-full" />
          <div className="h-9 w-20 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-9 w-20 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-9 w-24 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <FeedSkeleton />
      </main>
    </div>
  )
}
