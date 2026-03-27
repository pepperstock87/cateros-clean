"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionBadgeProps {
  collapsed?: boolean;
}

export function ActionBadge({ collapsed = false }: ActionBadgeProps) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/cain/actions");
        if (!response.ok) return;
        const data = await response.json();
        const pendingCount = data.actions?.filter((a: any) => a.status === "pending").length || 0;
        setCount(pendingCount);
      } catch (err) {
        console.error("Failed to fetch action count:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading || count === 0) return null;

  return (
    <span
      className={cn(
        "absolute top-0.5 right-0.5 flex items-center justify-center",
        collapsed ? "w-2 h-2 rounded-full bg-brand-400 animate-pulse" : "text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60 min-w-[20px] text-center"
      )}
    >
      {!collapsed && count}
    </span>
  );
}
