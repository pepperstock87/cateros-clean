import { Skeleton, SkeletonTable, SkeletonStats } from "@/components/ui/Skeleton";

export default function ProposalsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <Skeleton className="h-7 w-36 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-6">
        <SkeletonStats count={4} />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-lg" />
        ))}
      </div>

      {/* Table */}
      <SkeletonTable />
    </div>
  );
}
