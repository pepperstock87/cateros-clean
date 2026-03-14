"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTrend = "up" | "down" | "neutral";

interface CatStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: StatTrend;
  trendLabel?: string;
  className?: string;
  accentColor?: string;
}

export function CatStatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  className,
  accentColor = "text-brand-400",
}: CatStatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 md:p-5 transition-all duration-200 hover:border-[var(--border-hover,var(--border))] group",
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500/10", accentColor)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {label}
          </span>
        </div>

        <div className="text-xl md:text-2xl font-semibold font-display tracking-tight">
          {value}
        </div>

        {trend && trendLabel && (
          <div className="flex items-center gap-1.5 mt-2">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                trend === "up" && "bg-green-400",
                trend === "down" && "bg-red-400",
                trend === "neutral" && "bg-[var(--text-muted)]"
              )}
            />
            <span
              className={cn(
                "text-[11px] font-medium",
                trend === "up" && "text-green-400",
                trend === "down" && "text-red-400",
                trend === "neutral" && "text-[var(--text-muted)]"
              )}
            >
              {trendLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
