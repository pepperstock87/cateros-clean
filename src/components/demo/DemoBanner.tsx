"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

const DEMO_COOKIE = "cateros-demo-session";

export function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsDemo(document.cookie.includes(DEMO_COOKIE));
  }, []);

  // Show toast when a write was blocked
  useEffect(() => {
    if (searchParams.get("demo_blocked") === "1") {
      toast.info("This action is view-only in the demo. Sign up for full access.", {
        duration: 4000,
      });
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("demo_blocked");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  if (!isDemo) return null;

  return (
    <div className="bg-gradient-to-r from-brand-950 via-brand-900/80 to-brand-950 border-b border-brand-800/40 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Eye className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-brand-300 font-medium">Demo Environment</span>
          <span className="text-[#7A8BA8]">&middot;</span>
          <span className="text-[#7A8BA8]">Explore freely &mdash; all data is sample data</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/signup"
            className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
}
