import { AppHeader } from "@/components/app-header"
import { SkeletonGroupList } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Groups" />
      <div className="container max-w-2xl px-4 py-4">
        <SkeletonGroupList />
      </div>
    </div>
  )
}
