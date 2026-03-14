"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { getQBStatus, retryFailedSyncs, type QBStatusData } from "@/lib/actions/quickbooks";
import { toast } from "sonner";

export function QuickBooksSyncCard() {
  const [status, setStatus] = useState<QBStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getQBStatus();
      setStatus(data);
    } catch {
      // Silently fail — component just won't show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleRetryFailed() {
    setRetrying(true);
    try {
      const result = await retryFailedSyncs();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${result.retriggered} item${result.retriggered !== 1 ? "s" : ""} queued for retry`);
        await fetchStatus();
      }
    } catch {
      toast.error("Failed to retry syncs");
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">QuickBooks Online</h2>
        </div>
        <div className="text-sm text-[var(--text-secondary)]">Loading sync status...</div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">QuickBooks Online</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Connect QuickBooks to automatically sync clients, invoices, and payments.
        </p>
        <a
          href="/api/quickbooks/connect"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <BookOpen className="w-4 h-4" />
          Connect QuickBooks
        </a>
      </div>
    );
  }

  const successCount = status.recentLogs.filter((l) => l.status === "success").length;
  const failedCount = status.recentLogs.filter((l) => l.status === "failed").length;

  return (
    <div className="card p-4 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-lg">QuickBooks Online</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 border border-green-800/50 text-green-400">
            Connected
          </span>
          <button
            onClick={fetchStatus}
            className="text-[var(--text-secondary)] hover:text-brand-400 transition-colors p-1"
            title="Refresh status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Connection info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-xs text-[var(--text-muted)]">Company</div>
          <div className="text-sm font-medium">{status.companyName || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">Last Synced</div>
          <div className="text-sm font-medium">
            {status.lastSynced
              ? new Date(status.lastSynced).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Never"}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">Queue</div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {status.queuedCount > 0 && (
              <span className="text-yellow-400">{status.queuedCount} pending</span>
            )}
            {status.failedCount > 0 && (
              <span className="text-red-400">{status.failedCount} failed</span>
            )}
            {status.queuedCount === 0 && status.failedCount === 0 && (
              <span className="text-green-400">All clear</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-4">
        {status.failedCount > 0 && (
          <button
            onClick={handleRetryFailed}
            disabled={retrying}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying..." : "Retry Failed"}
          </button>
        )}
        <a
          href="/api/quickbooks/disconnect"
          className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
        >
          Disconnect
        </a>
      </div>

      {/* Sync log toggle */}
      {status.recentLogs.length > 0 && (
        <div>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Recent Sync Activity ({successCount} succeeded, {failedCount} failed)
          </button>

          {showLogs && (
            <div className="mt-3 border border-[var(--border)] rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-primary)]/40">
                    <th className="text-left py-2 px-3 font-medium">Status</th>
                    <th className="text-left py-2 px-3 font-medium">Type</th>
                    <th className="text-left py-2 px-3 font-medium">Direction</th>
                    <th className="text-left py-2 px-3 font-medium">Time</th>
                    <th className="text-left py-2 px-3 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recentLogs.slice(0, 15).map((log) => (
                    <tr key={log.id} className="border-b border-[var(--border)]/50">
                      <td className="py-1.5 px-3">
                        <StatusIcon status={log.status} />
                      </td>
                      <td className="py-1.5 px-3 text-[var(--text-primary)] capitalize">
                        {log.entityType}
                      </td>
                      <td className="py-1.5 px-3 text-[var(--text-muted)]">
                        {log.direction === "cateros_to_qb" ? "→ QBO" : "← QBO"}
                      </td>
                      <td className="py-1.5 px-3 text-[var(--text-muted)] tabular-nums">
                        {new Date(log.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-1.5 px-3 text-red-400 truncate max-w-[200px]">
                        {log.errorMessage || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    case "skipped":
      return <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
    default:
      return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
  }
}
