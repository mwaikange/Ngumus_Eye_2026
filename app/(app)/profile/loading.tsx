import { AppHeader } from "@/components/app-header"
import { SkeletonProfileCard } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Profile" />
      <div className="container max-w-2xl px-4 py-4 space-y-4">
        {/* Profile card skeleton */}
        <SkeletonProfileCard />

        {/* Followers/Following skeleton */}
        <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
          <div className="flex items-center justify-around">
            <div className="text-center space-y-1">
              <div className="h-6 w-12 bg-gray-200 rounded mx-auto" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center space-y-1">
              <div className="h-6 w-12 bg-gray-200 rounded mx-auto" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          </div>
        </div>

        {/* Subscription skeleton */}
        <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse space-y-4">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
          </div>
          <div className="flex gap-2 pt-2">
            <div className="h-10 flex-1 bg-gray-200 rounded" />
            <div className="h-10 flex-1 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
