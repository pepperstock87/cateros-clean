import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

export default function ShoppingLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <Skeleton className="h-7 w-36 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Events included card */}
      <SkeletonCard className="h-[80px] mb-6" />

      {/* Shopping list table */}
      <SkeletonTable rows={8} />
    </div>
  );
}
