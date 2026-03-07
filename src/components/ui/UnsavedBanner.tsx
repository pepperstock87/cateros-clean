"use client";

interface UnsavedBannerProps {
  show: boolean;
}

export function UnsavedBanner({ show }: UnsavedBannerProps) {
  if (!show) return null;

  return (
    <div className="sticky top-0 z-30 mb-4 rounded-lg border border-amber-700/50 bg-amber-900/30 px-4 py-2 text-sm text-amber-300">
      You have unsaved changes
    </div>
  );
}
