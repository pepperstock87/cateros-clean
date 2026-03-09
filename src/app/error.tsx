"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0C1220] text-[#F4F1ED] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-display text-2xl font-semibold mb-3">Something went wrong</h1>
        <p className="text-[#7A8BA8] mb-10">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-lg bg-[#D4A373] text-[#0C1220] text-sm font-medium hover:bg-[#c4935f] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-lg border border-[#2A3A5C] text-sm font-medium hover:bg-[#182030] transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
