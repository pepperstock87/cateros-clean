"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  Zap,
  Users,
  DollarSign,
  User,
  Cog,
  Package,
  Calendar,
  RefreshCw,
  ChevronDown,
  Check,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CainSuggestion } from "@/lib/cain/suggestions/engine";

interface SuggestionsPanelProps {
  className?: string;
  refreshInterval?: number; // milliseconds
}

function getCategoryIcon(category: CainSuggestion["category"]) {
  switch (category) {
    case "staffing":
      return Users;
    case "pricing":
      return DollarSign;
    case "client":
      return User;
    case "operations":
      return Cog;
    case "procurement":
      return Package;
    case "scheduling":
      return Calendar;
    default:
      return AlertCircle;
  }
}

function getUrgencyStyles(
  urgency: CainSuggestion["urgency"]
): { badge: string; border: string; indicator: string } {
  switch (urgency) {
    case "critical":
      return {
        badge: "bg-red-500/10 text-red-400",
        border: "border-l-red-400",
        indicator: "bg-red-400",
      };
    case "high":
      return {
        badge: "bg-orange-500/10 text-orange-400",
        border: "border-l-orange-400",
        indicator: "bg-orange-400",
      };
    case "medium":
      return {
        badge: "bg-yellow-500/10 text-yellow-400",
        border: "border-l-yellow-400",
        indicator: "bg-yellow-400",
      };
    case "low":
      return {
        badge: "bg-blue-500/10 text-blue-400",
        border: "border-l-blue-400",
        indicator: "bg-blue-400",
      };
  }
}

function SuggestionCard({
  suggestion,
  onActionClick,
  isProcessing,
}: {
  suggestion: CainSuggestion;
  onActionClick: (suggestion: CainSuggestion) => void;
  isProcessing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = getCategoryIcon(suggestion.category);
  const urgencyStyles = getUrgencyStyles(suggestion.urgency);

  return (
    <div
      className={cn(
        "card p-4 space-y-3 border-l-4 transition-all hover:shadow-lg",
        urgencyStyles.border
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className={cn("p-2 rounded-lg", urgencyStyles.badge)}>
            <IconComponent className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight flex-1">
              {suggestion.title}
            </h3>
            <span
              className={cn(
                "flex-shrink-0 inline-flex items-center text-[10px] px-2 py-1 rounded-full border font-semibold whitespace-nowrap",
                urgencyStyles.badge
              )}
            >
              {suggestion.urgency.toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted)] capitalize">
            {suggestion.category}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {suggestion.description}
      </p>

      {/* Expandable Details */}
      {suggestion.suggestedAction && (
        <div className="space-y-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform",
                expanded && "rotate-180"
              )}
            />
            {expanded ? "Hide" : "Show"} details
          </button>

          {expanded && (
            <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-3 space-y-2 text-xs">
              <div>
                <span className="text-[var(--text-muted)] font-medium">
                  Suggested action:
                </span>
                <p className="text-[var(--text-secondary)] mt-1">
                  {suggestion.suggestedAction.label}
                </p>
              </div>

              {suggestion.relatedEntityId && (
                <div>
                  <span className="text-[var(--text-muted)] font-medium">
                    Entity:
                  </span>
                  <p className="text-[var(--text-secondary)] mt-1 font-mono text-[11px] break-all">
                    {suggestion.relatedEntityType}: {suggestion.relatedEntityId}
                  </p>
                </div>
              )}

              {suggestion.expiresAt && (
                <div>
                  <span className="text-[var(--text-muted)] font-medium">
                    Expires:
                  </span>
                  <p className="text-[var(--text-secondary)] mt-1">
                    {new Date(suggestion.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {suggestion.actionable && suggestion.suggestedAction && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onActionClick(suggestion)}
            disabled={isProcessing}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
              "bg-brand-500/10 text-brand-400 border border-brand-500/20",
              "hover:bg-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors text-sm font-medium"
            )}
          >
            {isProcessing ? (
              <>
                <span className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Let CAIN handle it
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function SuggestionsPanel({
  className,
  refreshInterval = 5 * 60 * 1000, // 5 minutes default
}: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<CainSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<
    CainSuggestion["category"] | null
  >(null);

  // Fetch suggestions
  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/cain/suggestions?limit=50");
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

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Handle actionizing a suggestion
  const handleActionClick = async (suggestion: CainSuggestion) => {
    setProcessing(suggestion.id);
    try {
      const response = await fetch("/api/cain/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create action");
      }

      // Remove from suggestions list
      setSuggestions((prev) =>
        prev.filter((s) => s.id !== suggestion.id)
      );

      // Show brief success feedback (in real app, would use toast)
      alert("Action added to approval queue!");
    } catch (err) {
      console.error("Error creating action:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to create action. Please try again."
      );
    } finally {
      setProcessing(null);
    }
  };

  // Group suggestions by category
  const groupedSuggestions = useMemo(() => {
    const groups: Record<CainSuggestion["category"], CainSuggestion[]> = {
      staffing: [],
      pricing: [],
      client: [],
      operations: [],
      procurement: [],
      scheduling: [],
    };

    suggestions.forEach((s) => {
      groups[s.category].push(s);
    });

    return groups;
  }, [suggestions]);

  const categories = Object.keys(groupedSuggestions) as CainSuggestion["category"][];
  const nonEmptyCategories = categories.filter(
    (cat) => groupedSuggestions[cat].length > 0
  );

  // Loading state
  if (loading && suggestions.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="h-32 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
        <div className="h-32 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
        <div className="h-32 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error && suggestions.length === 0) {
    return (
      <div className={cn("card p-6 text-center space-y-3", className)}>
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        <button
          onClick={fetchSuggestions}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (nonEmptyCategories.length === 0) {
    return (
      <div className={cn("card p-8 text-center space-y-3", className)}>
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Everything looks good
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          No suggestions right now. We'll let you know when there's something to
          act on.
        </p>
        <button
          onClick={fetchSuggestions}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  // Main content
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Smart Suggestions
        </h2>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
          title="Refresh suggestions"
        >
          <RefreshCw
            className={cn("w-4 h-4 text-[var(--text-muted)]", loading && "animate-spin")}
          />
        </button>
      </div>

      {/* Suggestion count badge */}
      {suggestions.length > 0 && (
        <div className="flex gap-2 px-1">
          <div className="inline-flex items-center gap-2 text-xs">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[var(--text-secondary)]">
              {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Suggestions grouped by category */}
      <div className="space-y-4">
        {nonEmptyCategories.map((category) => {
          const categoryCount = groupedSuggestions[category].length;
          const isExpanded = expandedCategory === category;

          return (
            <div key={category} className="space-y-2">
              {/* Category header */}
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : category)
                }
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", "bg-brand-500/10")}>
                    {(() => {
                      const IconComponent = getCategoryIcon(category);
                      return <IconComponent className="w-4 h-4 text-brand-400" />;
                    })()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                      {category}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {categoryCount} suggestion{categoryCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-[var(--text-muted)] transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {/* Suggestions for this category */}
              {isExpanded && (
                <div className="ml-2 space-y-2">
                  {groupedSuggestions[category].map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onActionClick={handleActionClick}
                      isProcessing={processing === suggestion.id}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
