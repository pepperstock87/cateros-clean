"use client";

import { useEffect, useState, useCallback } from "react";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ActionCard } from "./ActionCard";
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

export function ActionQueue() {
  const [actions, setActions] = useState<CainAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchActions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const response = await fetch("/api/cain/actions");
      if (!response.ok) throw new Error("Failed to fetch actions");
      const data = await response.json();
      setActions(data.actions || []);
    } catch (err) {
      console.error("Failed to fetch actions:", err);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchActions();
    const interval = setInterval(() => fetchActions(true), 30000);
    return () => clearInterval(interval);
  }, [fetchActions]);

  const handleApprove = useCallback(async (actionId: string) => {
    setProcessingIds((prev) => new Set(prev).add(actionId));
    try {
      const response = await fetch(`/api/cain/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!response.ok) throw new Error("Failed to approve action");
      setActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch (err) {
      console.error("Failed to approve action:", err);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  }, []);

  const handleReject = useCallback(async (actionId: string) => {
    setProcessingIds((prev) => new Set(prev).add(actionId));
    try {
      const response = await fetch(`/api/cain/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!response.ok) throw new Error("Failed to reject action");
      setActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch (err) {
      console.error("Failed to reject action:", err);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  }, []);

  const handleApproveAll = useCallback(async () => {
    const lowRiskActions = actions.filter((a) => a.priority !== "urgent");
    if (lowRiskActions.length === 0) return;

    setProcessingIds(new Set(lowRiskActions.map((a) => a.id)));
    try {
      await Promise.all(
        lowRiskActions.map((action) =>
          fetch(`/api/cain/actions/${action.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
          })
        )
      );
      setActions((prev) =>
        prev.filter((a) => !lowRiskActions.some((lr) => lr.id === a.id))
      );
    } catch (err) {
      console.error("Failed to approve all actions:", err);
    } finally {
      setProcessingIds(new Set());
    }
  }, [actions]);

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-32" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          No pending actions. CAIN will propose actions as it works.
        </p>
      </div>
    );
  }

  const lowRiskActions = actions.filter((a) => a.priority !== "urgent");
  const showApproveAll = lowRiskActions.length > 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Pending Actions
            <span className={cn(
              "ml-2 inline-flex items-center justify-center text-xs font-bold px-2 py-1 rounded-full",
              "bg-brand-950 text-brand-400 border border-brand-800/60"
            )}>
              {actions.length}
            </span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Review and approve CAIN's proposed actions
          </p>
        </div>
        {showApproveAll && (
          <button
            onClick={handleApproveAll}
            disabled={refreshing || processingIds.size > 0}
            className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
          >
            {processingIds.size > 0 ? "Approving..." : "Approve All"}
          </button>
        )}
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {actions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={processingIds.has(action.id)}
          />
        ))}
      </div>
    </div>
  );
}
