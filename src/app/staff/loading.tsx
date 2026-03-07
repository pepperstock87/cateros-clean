import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export default function StaffLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Upcoming assignments skeleton */}
      <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1c1814] border border-[#2e271f] mb-2 last:mb-0"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Staff table */}
      <SkeletonTable />
    </div>
  );
}
