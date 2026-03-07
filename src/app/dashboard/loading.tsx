import { Skeleton, SkeletonCard, SkeletonStats } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <Skeleton className="h-7 w-56 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-6 md:mb-8">
        <SkeletonStats count={4} />
      </div>

      {/* Revenue Goal + Next Event */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <SkeletonCard className="h-[140px]" />
        <SkeletonCard className="h-[140px]" />
      </div>

      {/* Pipeline row */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
        <SkeletonCard className="h-[100px]" />
        <SkeletonCard className="h-[100px]" />
      </div>

      {/* Chart + Upcoming events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <SkeletonCard className="lg:col-span-2 h-[280px]" />
        <SkeletonCard className="h-[280px]" />
      </div>

      {/* Recent events table area */}
      <SkeletonCard className="h-[200px]" />
    </div>
  );
}
