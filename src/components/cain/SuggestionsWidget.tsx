"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, RefreshCw, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CainSuggestion } from "@/lib/cain/suggestions/engine";

interface SuggestionsWidgetProps {
  className?: string;
  linkTo?: string; // Where to link "View all" — defaults to /cain/suggestions
}

function getUrgencyColor(urgency: CainSuggestion["urgency"]) {
  switch (urgency) {
    case "critical":
      return "border-red-400 bg-red-500/5";
    case "high":
      return "border-orange-400 bg-orange-500/5";
    case "medium":
      return "border-yellow-400 bg-yellow-500/5";
    case "low":
      return "border-blue-400 bg-blue-500/5";
  }
}

function getUrgencyBadge(urgency: CainSuggestion["urgency"]) {
  switch (urgency) {
    case "critical":
      return "bg-red-500/10 text-red-400";
    case "high":
      return "bg-orange-500/10 text-orange-400";
    case "medium":
      return "bg-yellow-500/10 text-yellow-400";
    case "low":
      return "bg-blue-500/10 text-blue-400";
  }
}

export function SuggestionsWidget({
  className,
  linkTo = "/cain/suggestions",
}: SuggestionsWidgetProps) {
  const [suggestions, setSuggestions] = useState<CainSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cain/suggestions?limit=3");
        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load suggestions"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSuggestions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={cn("card p-4", className)}>
        <div className="h-32 bg-[var(--bg-secondary)] rounded animate-pulse" />
      </div>
    );
  }

  // No suggestions — all clear
  if (!error && suggestions.length === 0) {
    return (
      <div
        className={cn(
          "card p-6 text-center space-y-3 border border-green-500/20 bg-green-500/5",
          className
        )}
      >
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <Check className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            All clear
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            No actionable suggestions right now.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "card p-4 text-center space-y-3 border border-red-500/20",
          className
        )}
      >
        <AlertCircle className="w-5 h-5 text-red-400 mx-auto" />
        <p className="text-xs text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  // Has suggestions
  return (
    <div className={cn("card overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Smart Suggestions
          </h3>
        </div>
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-semibold">
          {suggestions.length}
        </span>
      </div>

      {/* Suggestions list */}
      <div className="space-y-2 p-3">
        {suggestions.slice(0, 3).map((suggestion) => (
          <div
            key={suggestion.id}
            className={cn(
              "p-3 rounded-lg border-l-2 transition-all hover:shadow-md",
              getUrgencyColor(suggestion.urgency)
            )}
          >
            <div className="flex items-start gap-2 min-w-0">
              <span
                className={cn(
                  "flex-shrink-0 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-semibold whitespace-nowrap mt-0.5",
                  getUrgencyBadge(suggestion.urgency)
                )}
              >
                {suggestion.urgency === "critical" ? "Critical" :
                 suggestion.urgency === "high" ? "High" :
                 suggestion.urgency === "medium" ? "Med" : "Low"}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {suggestion.title}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                  {suggestion.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with link */}
      <Link
        href={linkTo}
        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-brand-400 border-t border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors"
      >
        View all suggestions
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
