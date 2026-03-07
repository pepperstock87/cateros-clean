"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-[#1c1814]", className)}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[#1c1814] w-full h-[120px]",
        className
      )}
    />
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[#2e271f] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[#2e271f]">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20 hidden sm:block" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16 ml-auto" />
        <Skeleton className="h-3 w-14" />
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-3.5 border-b border-[#1c1814] last:border-b-0"
        >
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-24 hidden sm:block" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-14 ml-auto" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[#2e271f] bg-[#1a1714] p-4 md:p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}
