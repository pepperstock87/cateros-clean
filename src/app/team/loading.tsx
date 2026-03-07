import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export default function TeamLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Org info card skeleton */}
      <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-12 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[#2e271f]">
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Invite button skeleton */}
      <Skeleton className="h-10 w-36 mb-6 rounded-lg" />

      {/* Members table skeleton */}
      <SkeletonTable rows={4} />
    </div>
  );
}
