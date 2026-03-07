import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function BillingLoading() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-7 w-20 mb-2" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Active subscription card */}
      <SkeletonCard className="h-[120px] mb-8" />

      {/* Plan cards grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-7"
          >
            <Skeleton className="h-5 w-16 mb-4" />
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-4 w-24 mb-5" />
            <div className="space-y-2 mb-6">
              {Array.from({ length: i === 0 ? 4 : 8 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3.5 w-40" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
