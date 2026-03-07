import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function RentalsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Rental item cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="h-[120px]" />
        ))}
      </div>
    </div>
  );
}
