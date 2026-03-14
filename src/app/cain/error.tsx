"use client";

import Link from "next/link";

export default function CainError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0C1220] text-[#F4F1ED] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4A373] to-[#b8844f] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#D4A373]/20">
          <span className="text-2xl font-bold text-[#0B1120]">C</span>
        </div>
        <h1 className="font-display text-2xl font-semibold mb-3">
          CAIN hit a snag
        </h1>
        <p className="text-[#7A8BA8] mb-2">
          Something unexpected happened, but your work has been saved as a draft.
        </p>
        <p className="text-[#7A8BA8] text-sm mb-10">
          Click &ldquo;Resume Session&rdquo; to pick up where you left off.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-lg bg-[#D4A373] text-[#0C1220] text-sm font-medium hover:bg-[#c4935f] transition-colors"
          >
            Resume Session
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-lg border border-[#2A3A5C] text-sm font-medium hover:bg-[#182030] transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
