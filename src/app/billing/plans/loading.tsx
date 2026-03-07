import { Skeleton } from "@/components/ui/Skeleton";

export default function PlansLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 text-center">
        <Skeleton className="h-8 w-56 mx-auto mb-3" />
        <Skeleton className="h-4 w-80 mx-auto" />
      </div>

      {/* Plan cards grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-xl border ${
              i === 1 ? "border-2 border-brand-800" : "border-[#2e271f]"
            } bg-[#1a1714] p-7`}
          >
            {/* Icon + name */}
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-20" />
            </div>
            {/* Price */}
            <Skeleton className="h-9 w-28 mb-2" />
            {/* Description */}
            <Skeleton className="h-4 w-full mb-5" />
            {/* Features */}
            <div className="space-y-2 mb-6">
              {Array.from({ length: i === 0 ? 4 : i === 1 ? 10 : 13 }).map(
                (_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-3.5 w-40" />
                  </div>
                ),
              )}
            </div>
            {/* Button */}
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] overflow-hidden">
        <div className="p-6 border-b border-[#2e271f]">
          <Skeleton className="h-5 w-44 mb-2" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-48 flex-shrink-0" />
              <Skeleton className="h-4 w-8 mx-auto" />
              <Skeleton className="h-4 w-8 mx-auto" />
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
