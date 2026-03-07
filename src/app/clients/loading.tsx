import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export default function ClientsLoading() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Client table */}
      <SkeletonTable rows={6} />
    </div>
  );
}
