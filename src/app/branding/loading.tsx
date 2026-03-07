import { Skeleton } from "@/components/ui/Skeleton";

export default function BrandingLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-4 md:p-6 space-y-6">
        {/* Logo upload */}
        <div>
          <Skeleton className="h-4 w-10 mb-2" />
          <Skeleton className="h-16 w-32 mb-3" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Business Name */}
        <div>
          <Skeleton className="h-4 w-28 mb-1.5" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-3 w-48 mt-1" />
        </div>

        {/* Phone + Email row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-12 mb-1.5" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-4 w-12 mb-1.5" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        {/* Address */}
        <div>
          <Skeleton className="h-4 w-16 mb-1.5" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>

        {/* Brand Color */}
        <div>
          <Skeleton className="h-4 w-24 mb-1.5" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Proposal Template */}
        <div>
          <Skeleton className="h-4 w-32 mb-1.5" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Proposal Terms */}
        <div>
          <Skeleton className="h-4 w-44 mb-1.5" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>

        {/* Save button */}
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
  );
}
