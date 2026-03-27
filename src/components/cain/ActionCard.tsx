"use client";

import { useState } from "react";
import { Check, X, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CainAction {
  id: string;
  action_type: string;
  title: string;
  description?: string | null;
  preview_data?: Record<string, unknown> | null;
  priority: string;
  created_at: string;
  status: string;
}

interface ActionCardProps {
  action: CainAction;
  onApprove?: (actionId: string) => void;
  onReject?: (actionId: string) => void;
  isLoading?: boolean;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getActionTypeColor(actionType: string): string {
  // Staff actions → blue
  if (actionType.includes("staff") || actionType.includes("assign")) {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
  // Communication (send proposal, invoice, message) → purple
  if (actionType.includes("send") || actionType.includes("message")) {
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  }
  // Financial (purchase order, payment) → amber
  if (actionType.includes("purchase") || actionType.includes("payment") || actionType.includes("invoice")) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
  // Data (create, update) → green
  if (actionType.includes("create") || actionType.includes("update")) {
    return "bg-green-500/10 text-green-400 border-green-500/20";
  }
  // Default → brand
  return "bg-brand-500/10 text-brand-400 border-brand-500/20";
}

function formatActionType(actionType: string): string {
  return actionType
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ActionCard({
  action,
  onApprove,
  onReject,
  isLoading = false,
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove?.(action.id);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await onReject?.(action.id);
    } finally {
      setRejecting(false);
    }
  };

  const hasPreview = action.preview_data && Object.keys(action.preview_data).length > 0;

  return (
    <div className="card p-4 space-y-3 border-l-2 border-l-brand-400/50 hover:border-l-brand-400 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{action.title}</h3>
            <span className={cn("inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium", getActionTypeColor(action.action_type))}>
              {formatActionType(action.action_type)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <Clock className="w-3 h-3" />
            {timeAgo(action.created_at)}
          </div>
        </div>
        {action.priority === "urgent" && (
          <div className="flex-shrink-0 px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-semibold">
            URGENT
          </div>
        )}
      </div>

      {/* Description */}
      {action.description && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {action.description}
        </p>
      )}

      {/* Preview Section */}
      {hasPreview && (
        <div className="space-y-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Hide" : "Show"} details
          </button>
          {expanded && (
            <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-3 space-y-2 text-xs">
              {Object.entries(action.preview_data!).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-[var(--text-muted)] font-medium">{key}:</span>
                  <span className="text-[var(--text-secondary)] text-right">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleApprove}
          disabled={isLoading || approving || rejecting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {approving ? (
            <>
              <span className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Approve
            </>
          )}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading || approving || rejecting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {rejecting ? (
            <>
              <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
              Rejecting...
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              Reject
            </>
          )}
        </button>
      </div>
    </div>
  );
}
