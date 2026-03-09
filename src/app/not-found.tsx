import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0C1220] text-[#F4F1ED] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-display text-8xl font-bold text-[#D4A373] mb-4">404</h1>
        <h2 className="font-display text-2xl font-semibold mb-3">Page not found</h2>
        <p className="text-[#7A8BA8] mb-10">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-lg border border-[#2A3A5C] text-sm font-medium hover:bg-[#182030] transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-lg bg-[#D4A373] text-[#0C1220] text-sm font-medium hover:bg-[#c4935f] transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
