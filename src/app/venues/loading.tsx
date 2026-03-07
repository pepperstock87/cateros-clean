import { Skeleton } from "@/components/ui/Skeleton";

export default function VenuesLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Skeleton className="h-7 w-36 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Form skeleton */}
      <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-6 space-y-6">
        {/* Venue name */}
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Description */}
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>

        {/* Address row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        {/* City / State / Zip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        {/* Capacity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        {/* Amenities */}
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>

        {/* Save button */}
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}
