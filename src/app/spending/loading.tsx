import { Skeleton, SkeletonStats, SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

export default function SpendingLoading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Weekly summary stats */}
      <div className="mb-6 md:mb-8">
        <SkeletonStats count={4} />
      </div>

      {/* Recurring costs card */}
      <div className="mb-6 md:mb-8">
        <SkeletonCard className="h-[100px]" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Table */}
      <SkeletonTable rows={6} />

      {/* Analytics section */}
      <div className="mt-6 md:mt-8">
        <Skeleton className="h-4 w-36 mb-4" />
        <SkeletonCard className="h-[200px]" />
      </div>
    </div>
  );
}
