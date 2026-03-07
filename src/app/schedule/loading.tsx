import { Skeleton } from "@/components/ui/Skeleton";

export default function ScheduleLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Calendar card */}
      <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-4 md:p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1 md:mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex justify-center py-2">
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>

        {/* Calendar grid (6 rows x 7 cols) */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg border border-[#2e271f] p-1 md:p-2"
            >
              <Skeleton className="h-3 w-4 mb-1" />
              {i % 5 === 0 && <Skeleton className="h-2.5 w-full rounded" />}
              {i % 7 === 3 && <Skeleton className="h-2.5 w-3/4 rounded mt-0.5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
